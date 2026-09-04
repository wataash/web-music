// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Minimal Anki card-template renderer: {{Field}}, {{#Field}}...{{/Field}},
// {{^Field}}...{{/Field}}, {{FrontSide}}. Filters ({{text:Field}} etc.) are
// ignored except that the field name after the last ":" is used. Unknown
// fields render as empty text instead of raising like Anki does.

type Node =
  | Readonly<{ kind: "text"; text: string }>
  | Readonly<{ kind: "field"; name: string }>
  | Readonly<{ kind: "section"; name: string; inverted: boolean; children: readonly Node[] }>;

const TAG_PATTERN = /\{\{([#^/])?([^{}]+?)\}\}/g;

export function renderTemplate(
  template: string,
  fields: Readonly<Record<string, string>>,
): string {
  return renderNodes(parse(template), fields);
}

function parse(template: string): readonly Node[] {
  const root: Node[] = [];
  const stack: { name: string; inverted: boolean; children: Node[] }[] = [];
  const top = (): Node[] =>
    stack.length > 0 ? stack[stack.length - 1].children : root;

  let lastIndex = 0;
  for (const match of template.matchAll(TAG_PATTERN)) {
    if (match.index > lastIndex) {
      top().push({ kind: "text", text: template.slice(lastIndex, match.index) });
    }
    lastIndex = match.index + match[0].length;
    const sigil = match[1];
    const name = fieldName(match[2]);
    if (sigil === "#" || sigil === "^") {
      stack.push({ name, inverted: sigil === "^", children: [] });
    } else if (sigil === "/") {
      const section = stack.pop();
      if (!section) throw new Error(`unmatched {{/${name}}} in template`);
      if (section.name !== name) {
        const openingSigil = section.inverted ? "^" : "#";
        throw new Error(
          `mismatched section: opened {{${openingSigil}${section.name}}} but closed {{/${name}}}`,
        );
      }
      top().push({ kind: "section", ...section });
    } else {
      top().push({ kind: "field", name });
    }
  }
  if (stack.length > 0) {
    throw new Error(`unclosed {{#${stack[stack.length - 1].name}}} in template`);
  }
  if (lastIndex < template.length) {
    root.push({ kind: "text", text: template.slice(lastIndex) });
  }
  return root;
}

function fieldName(raw: string): string {
  const trimmed = raw.trim();
  const colon = trimmed.lastIndexOf(":");
  return colon >= 0 ? trimmed.slice(colon + 1).trim() : trimmed;
}

function renderNodes(
  nodes: readonly Node[],
  fields: Readonly<Record<string, string>>,
): string {
  let out = "";
  for (const node of nodes) {
    switch (node.kind) {
      case "text":
        out += node.text;
        break;
      case "field":
        out += fields[node.name] ?? "";
        break;
      case "section": {
        const filled = (fields[node.name] ?? "").trim() !== "";
        if (filled !== node.inverted) out += renderNodes(node.children, fields);
        break;
      }
    }
  }
  return out;
}

// Builds the srcdoc for the card iframe, mimicking the AnkiDroid WebView:
// the model CSS is injected as-is and the rendered card HTML lives in
// <body class="card"> so that the conventional `.card { ... }` selector
// styles the page. In dark mode AnkiDroid adds the nightMode/night_mode
// classes; card CSS that supports them will react, others stay light.
export function buildCardDocument(options: {
  html: string;
  css: string;
  nightMode: boolean;
  keyboardKeys?: number;
  pianoKeys?: number;
  // What an interval keyboard marks on the front. The root is marked unless
  // the reader turned it off; the answer note is handed over only when they
  // asked for it, the front template having no field for it.
  intervalRoot?: boolean;
  intervalAnswerNote?: string;
  // Custom properties the deck's own CSS reads, for what only the app knows —
  // which notes the reader has chosen to study, say.
  variables?: Readonly<Record<string, string>>;
}): string {
  const nightClasses = options.nightMode ? " nightMode night_mode" : "";
  const variables = Object.entries(options.variables ?? {})
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
  const attributes = [
    ["keyboard-keys", options.keyboardKeys],
    ["piano-keys", options.pianoKeys],
    ["interval-root", options.intervalRoot === false ? "off" : undefined],
    ["interval-answer-note", options.intervalAnswerNote],
  ]
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` data-${name}="${value}"`)
    .join("");
  return `<!doctype html>
<html${attributes}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
html, body { margin: 0; min-height: 100%; }
/* A tap on a diagram is an answer, never a text selection: a phone that takes
   it for one puts its own menu over the card. */
body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
/* Where the reader has put each part of the card, as a share of the card's own
   width and height — which inside the card's frame is what vw and vh measure,
   so a card turned on its side moves its parts along its own edges. Written
   here rather than in each deck's stylesheet, and hung on the attribute that
   names the part: a class the deck uses for the row it draws in can be the
   same class the drawing inside carries, and the part would then be moved
   once for the row and once again for what is in it. */
[data-card-part="text"] { translate: var(--text-x, 0) var(--text-y, 0); }
[data-card-part="staff"] { translate: var(--staff-x, 0) var(--staff-y, 0); }
[data-card-part="keyboard"] {
  translate: var(--keyboard-x, 0) var(--keyboard-y, 0);
}
[data-card-part="board"] { translate: var(--board-x, 0) var(--board-y, 0); }
/* The card is a frame rather than a page: a part moved off its edge is cut off
   there instead of making the card wide enough to hold it. Sideways only, so a
   card drawn taller than the screen can still be scrolled down. */
html { overflow-x: clip; }
/* Setting the card out: while the app has put the card in that mode, every
   part it can move takes the drag itself and the card is not turned over by
   the finger. A part is not held down, though: a card turned sideways can be
   longer than the frame it is turned inside, and a part past the end of it has
   to be reachable to be moved back. Every part refuses the scroll itself, so
   dragging one moves it and dragging the card between them scrolls to what is
   past the edge. */
/* Either way, since a card turned on its side scrolls along the screen's
   other axis, and the card's own pinch is not the browser's. */
[data-positioning] body { touch-action: pan-x pan-y; }
[data-positioning] [data-card-part] {
  cursor: move;
  touch-action: none;
}
/* Around what is drawn, not around the row it sits in: a keyboard is centred
   in a row as wide as the card, and a box that size says nothing about where
   the keyboard is. A part whose content is words has no such drawing in it and
   is outlined itself. */
[data-positioning] [data-card-part]
  > :is(img, svg, .keyboard-frame, .fret-window),
[data-positioning]
  [data-card-part]:not(:has(> :is(img, svg, .keyboard-frame, .fret-window))) {
  outline: 2px dashed rgb(252 211 77 / 0.85);
  outline-offset: 3px;
}
${variables === "" ? "" : `:root { ${variables} }\n`}${options.css}
</style>
</head>
<body class="card${nightClasses}">${options.html}</body>
</html>`;
}

// Rewrites src="filename" references to object URLs for media stored in
// IndexedDB. Filenames not present in the map are left untouched.
const MEDIA_REFERENCE = /(?:src|xlink:href|href)="([^"]+)"/g;

// The media a note names, so only those files are read back out of the
// database. Deck packages put their references in the note fields, as
// `<img src="…">`.
export function mediaFilenamesIn(html: string): readonly string[] {
  return [...html.matchAll(MEDIA_REFERENCE)].map(([, value]) => value);
}

export function resolveMediaReferences(
  html: string,
  mediaUrls: ReadonlyMap<string, string>,
): string {
  return html.replace(
    /(src|xlink:href|href)="([^"]+)"/g,
    (whole, attr: string, value: string) => {
      const url = mediaUrls.get(value);
      return url ? `${attr}="${url}"` : whole;
    },
  );
}
