// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { CLEF_LABELS, type Clef, type Direction } from "./cards";
import { renderKeyboardSvg, renderStaffSvg } from "./staff";

export const MODEL_NAME = "Music Staff Notes";
export const ROOT_DECK_NAME = "Music Staff";
export const OCTAVE_NUMBER_ROOT_DECK_NAME =
  "Music Staff (with Octave Numbers)";

export const STAFF_TO_NOTE_DECK_NAME = `${ROOT_DECK_NAME}::Staff → Note`;
export const STAFF_TO_NOTE_CLEF_DECK_NAMES = clefDeckNames(
  STAFF_TO_NOTE_DECK_NAME,
);

export const OCTAVE_NUMBER_DIRECTION_DECK_NAMES = {
  "staff-to-note": `${OCTAVE_NUMBER_ROOT_DECK_NAME}::Staff → Note`,
  "note-to-staff": `${OCTAVE_NUMBER_ROOT_DECK_NAME}::Note → Staff`,
} as const satisfies Record<Direction, string>;

export const OCTAVE_NUMBER_CLEF_DECK_NAMES = {
  "staff-to-note": clefDeckNames(
    OCTAVE_NUMBER_DIRECTION_DECK_NAMES["staff-to-note"],
  ),
  "note-to-staff": clefDeckNames(
    OCTAVE_NUMBER_DIRECTION_DECK_NAMES["note-to-staff"],
  ),
} as const satisfies Record<Direction, Record<Clef, string>>;

export const FIELD_NAMES = [
  "Id",
  "Clef",
  "Pitch",
  "Note",
  "Octave",
  "Prompt",
  "DisplayPitch",
  "QuestionImage",
  "AnswerImage",
  "KeyboardImage",
  "BlankKeyboardImage",
] as const;

// One template serves both directions, told apart by whether Prompt is filled:
// note-to-staff names the pitch up front and answers with the drawn staff,
// staff-to-note shows the staff and answers with DisplayPitch. That display
// field is a bare note name in the regular deck and scientific pitch notation
// in the deck with octave numbers.
// The front shows a keyboard either way: the marked one when the note is what
// is given, and the bare one when the key is the answer, so revealing it fills
// in the keyboard already on screen instead of moving the card around.
export const FRONT_TEMPLATE = `
<main class="staff-card">
  <div class="prompt">{{Prompt}}</div>
  <div class="diagram">{{QuestionImage}}</div>
  {{#Prompt}}<div class="diagram keyboard">{{KeyboardImage}}</div>{{/Prompt}}
  {{^Prompt}}<div class="diagram keyboard">{{BlankKeyboardImage}}</div>{{/Prompt}}
</main>
`.trim();

// No written answer: the keyboard names the key inside it, and saying it
// twice only pushed the keyboard down the card.
export const BACK_TEMPLATE = `
<main class="staff-card">
  <div class="prompt">{{Prompt}}</div>
  <div class="diagram">{{AnswerImage}}</div>
  <div class="diagram keyboard">{{KeyboardImage}}</div>
</main>
`.trim();

const WEB_STAFF_BASES = Object.fromEntries(
  (["treble", "bass", "alto", "tenor"] as const).map((clef) => [
    clef,
    renderStaffSvg({ clef }),
  ]),
);
const WEB_KEYBOARD_BASES = {
  octave: renderKeyboardSvg({
    pitch: "C4",
    layout: "octave",
    highlighted: false,
  }),
  piano: renderKeyboardSvg({
    pitch: "C4",
    layout: "piano",
    highlighted: false,
  }),
} as const;

const WEB_DIAGRAM_SCRIPT = `
<script>
(() => {
  const staffBases = ${JSON.stringify(WEB_STAFF_BASES)};
  const keyboardBases = ${JSON.stringify(WEB_KEYBOARD_BASES)};
  const round = (value) => Math.round(value * 100) / 100;
  const scopeLabels = (svg, prefix) => {
    const title = svg.querySelector("title");
    const description = svg.querySelector("desc");
    if (title) title.id = prefix + "-title";
    if (description) description.id = prefix + "-description";
    svg.setAttribute(
      "aria-labelledby",
      prefix + "-title " + prefix + "-description",
    );
  };
  const pitchIndex = (pitch) =>
    Number(pitch.slice(1)) * 7 + ["C", "D", "E", "F", "G", "A", "B"].indexOf(pitch[0]);
  const staffBottom = { treble: 30, bass: 18, alto: 24, tenor: 22 };
  const staffY = (step) => 184 - step * 8;
  const ellipse = (cx, cy, rx, ry, rotation) => {
    const radians = rotation * Math.PI / 180;
    const dx = rx * Math.cos(radians);
    const dy = rx * Math.sin(radians);
    const startX = Math.round((cx - dx) * 1000) / 1000;
    const startY = Math.round((cy - dy) * 1000) / 1000;
    const endX = Math.round((cx + dx) * 1000) / 1000;
    const endY = Math.round((cy + dy) * 1000) / 1000;
    return "M " + startX + " " + startY + " A " + rx + " " + ry +
      " " + rotation + " 0 1 " + endX + " " + endY + " A " + rx +
      " " + ry + " " + rotation + " 0 1 " + startX + " " + startY + " Z";
  };

  for (const host of document.querySelectorAll("[data-staff]")) {
    const [clef, pitch] = (host.getAttribute("data-staff") ?? "").split("|");
    host.innerHTML = staffBases[clef] ?? "";
    const svg = host.querySelector("svg");
    if (!(svg instanceof SVGElement)) continue;
    scopeLabels(svg, "staff");
    if (!pitch) continue;
    const step = pitchIndex(pitch) - staffBottom[clef];
    const ledger = [];
    for (let value = 10; value <= step; value += 2) ledger.push(value);
    for (let value = -2; value >= step; value -= 2) ledger.push(value);
    const lines = ledger.map((value) =>
      '<line class="staff__ledger-line" data-step="' + value +
      '" x1="139" y1="' + staffY(value) + '" x2="181" y2="' +
      staffY(value) + '"/>',
    ).join("");
    const y = staffY(step);
    const note = '<g class="staff__note" data-step="' + step +
      '" data-x="160" data-y="' + y +
      '"><path class="staff__note-head" fill-rule="evenodd" d="' +
      ellipse(160, y, 13, 8, 0) + " " + ellipse(160, y, 8.6, 3.4, -22) +
      '"/></g>';
    svg.insertAdjacentHTML("beforeend", lines + note);
    const description = svg.querySelector("desc");
    if (description) description.textContent =
      "A " + clef + " clef staff with a single whole note.";
  }

  for (const host of document.querySelectorAll("[data-keyboard]")) {
    const parts = (host.getAttribute("data-keyboard") ?? "").split("|");
    const layout = parts[0];
    const pitch = parts.length === 3 ? parts[1] : undefined;
    const display = parts.length === 3 ? parts[2] : undefined;
    const octave = pitch ? pitch.slice(1) : parts[1];
    const frame = document.createElement("span");
    frame.className = "keyboard-frame keyboard-" + layout;
    frame.innerHTML = keyboardBases[layout] ?? "";
    host.replaceChildren(frame);
    const svg = frame.querySelector("svg");
    if (!(svg instanceof SVGElement)) continue;
    scopeLabels(svg, "keyboard");
    if (layout === "octave" && octave !== undefined) {
      for (const key of svg.querySelectorAll("[data-note]")) {
        key.setAttribute("data-note", (key.getAttribute("data-note") ?? "C")[0] + octave);
      }
      for (const key of svg.querySelectorAll("[data-key]")) {
        key.setAttribute("data-key", (key.getAttribute("data-key") ?? "C#").slice(0, 2) + octave);
      }
    }
    const keys = [...svg.querySelectorAll(".keyboard__white-key")];
    // The 88-key strip is cropped to the keys the reader asked for, around the
    // middle of an 88-key piano — the boundary between E4 and F4. Fixed there
    // rather than around the answer: the front of a card shows this keyboard
    // blank, and a window that moved with the answer would name it.
    if (layout === "piano") {
      const allowed = [49, 61, 76, 88];
      const selected = Number(document.documentElement.dataset.pianoKeys);
      const keyCount = allowed.includes(selected) ? selected : 88;
      const middle = keys.find(
        (candidate) => candidate.getAttribute("data-note") === "E4",
      );
      if (keyCount < 88 && middle instanceof SVGRectElement) {
        const whiteWidth = Number(middle.getAttribute("width"));
        // The white keys of a board that size: 88 keys are 52 white ones, and
        // every size below it keeps the same seven-in-twelve proportion.
        const whiteCount = Math.round(keyCount * 52 / 88);
        const centre =
          Number(middle.getAttribute("x")) + whiteWidth;
        const span = whiteCount * whiteWidth;
        const height = Number(
          (svg.getAttribute("viewBox") ?? "0 0 260 118").split(" ")[3],
        );
        svg.setAttribute(
          "viewBox",
          round(centre - span / 2) + " 0 " + round(span) + " " + height,
        );
        svg.setAttribute("width", String(round(span)));
      }
    }
    if (!pitch || !display) continue;
    const key = layout === "piano"
      ? keys.find((candidate) => candidate.getAttribute("data-note") === pitch)
      : keys.find((candidate) => candidate.getAttribute("data-note")?.[0] === pitch[0]);
    if (!(key instanceof SVGRectElement)) continue;
    key.classList.add("is-highlighted");
    const viewBox = (svg.getAttribute("viewBox") ?? "0 0 260 118")
      .split(" ").map(Number);
    const originX = viewBox[0];
    const width = viewBox[2];
    const height = viewBox[3];
    const keyX = Number(key.getAttribute("x"));
    const keyWidth = Number(key.getAttribute("width"));
    const keyHeight = Number(key.getAttribute("height"));
    const label = document.createElement("span");
    label.className = "key-name";
    label.textContent = display;
    label.style.setProperty(
      "--key-x",
      round((keyX + keyWidth / 2 - originX) / width * 100) + "%",
    );
    label.style.setProperty("--key-y", round((11 + keyHeight * 0.86) / height * 100) + "%");
    const size = Math.min(17, keyWidth * 1.5 / [...display].length);
    label.style.setProperty("--key-size", round(size / width * 100) + "cqw");
    frame.append(label);
  }
})();
</script>
`.trim();

export const WEB_FRONT_TEMPLATE = `
<main class="staff-card">
  <div class="prompt">{{Prompt}}</div>
  <div class="diagram" data-staff="{{QuestionImage}}"></div>
  {{#Prompt}}<div class="diagram keyboard" data-keyboard="{{KeyboardImage}}"></div>{{/Prompt}}
  {{^Prompt}}<div class="diagram keyboard" data-keyboard="{{BlankKeyboardImage}}"></div>{{/Prompt}}
</main>
${WEB_DIAGRAM_SCRIPT}
`.trim();

export const WEB_BACK_TEMPLATE = `
<main class="staff-card">
  <div class="prompt">{{Prompt}}</div>
  <div class="diagram" data-staff="{{AnswerImage}}"></div>
  <div class="diagram keyboard" data-keyboard="{{KeyboardImage}}"></div>
</main>
${WEB_DIAGRAM_SCRIPT}
`.trim();

export const CARD_CSS = `
.card {
  box-sizing: border-box;
  margin: 0;
  padding: 1rem;
  background: #111827;
  color: #f3f4f6;
  color-scheme: dark;
  font-family: "Noto Sans", "DejaVu Sans", sans-serif;
  text-align: center;
}

.staff-card {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  /* Full size is most of the screen: a staff smaller than that is a handful of
     lines and one note to find on them, and the keyboard under it has a
     screen's width of its own. --staff-scale is the reader's, set from the
     app; the deck only says what full size means. */
  --staff-width: calc(min(88vw, 26rem) * var(--staff-scale, 1));
}

.prompt {
  font-size: clamp(2rem, 8vw, 3.5rem);
  font-weight: 700;
  line-height: 1.2;
}

.prompt:empty {
  display: none;
}

/* Full size already reaches the edges of the screen, so a reader who asks for
   more gets a staff wider than the card. The negative margin cancels the
   card's padding and the row scrolls, as the keyboard's does, rather than the
   staff spilling off one side of a grid that is centring it. */
.diagram {
  width: 100vw;
  margin-inline: -1rem;
  overflow-x: auto;
}

.diagram > img,
.diagram > svg {
  display: block;
  width: var(--staff-width);
  height: auto;
  margin-inline: auto;
}

/* Every staff is drawn with room for six ledger lines either way, so the staff
   itself never moves as the note changes. The app sets --staff-clip-top and
   --staff-clip-bottom to the bands of that image the notes it is asking about
   do not need; without them the whole frame is shown.

   The bands are cut away rather than the image being fitted into a shorter
   box: object-fit says what is wanted here but is not applied to an inline
   <svg>, which letterboxes into the box instead — and the staff would then be
   drawn larger the more of the ledger lines the reader had asked for. The
   negative margins take the cut bands back out of the layout, so the card is
   as tall as what is left. */
.diagram > img.staff,
.diagram > svg.staff {
  --staff-clip-top-length: calc(var(--staff-width) * var(--staff-clip-top, 0));
  --staff-clip-bottom-length: calc(var(--staff-width) * var(--staff-clip-bottom, 0));
  clip-path: inset(var(--staff-clip-top-length) 0 var(--staff-clip-bottom-length));
  margin-block: calc(-1 * var(--staff-clip-top-length)) calc(-1 * var(--staff-clip-bottom-length));
}

/* The negative margin cancels the padding around the card, so a keyboard can
   reach the edges of the screen — and scroll past them, since a reader may ask
   for one larger than the screen. */
.keyboard {
  width: 100vw;
  margin-inline: -1rem;
  overflow-x: auto;
}

.keyboard img {
  display: block;
  height: auto;
  margin-inline: auto;
}

/* The answer is written over the keyboard rather than drawn into it, so it can
   be sized on its own. cqw ties its size to the keyboard's width, so the two
   keep their proportions however large the keyboard is drawn. */
.keyboard-frame {
  position: relative;
  display: block;
  margin-inline: auto;
  /* A container sized by its own contents measures zero to the units inside
     it, so the frame is given a width and the image fills it. */
  container-type: inline-size;
  line-height: 0;
}

.key-name {
  position: absolute;
  left: var(--key-x);
  top: var(--key-y);
  translate: -50% -50%;
  padding: 0.12em 0.3em;
  border-radius: 0.25em;
  /* The name lies across white keys and black ones alike, so it carries a
     little of the white key with it. In em, so it grows with the name. */
  background: rgb(255 255 255 / 0.72);
  color: #111827;
  font-weight: 700;
  font-size: calc(var(--key-size, 4cqw) * var(--answer-scale, 1));
  line-height: 1;
}

/* Edge to edge: on the 88-key strip every key is a fraction of the width, so
   what the card can spare it should give. */
.keyboard-frame.keyboard-piano {
  width: var(--keyboard-width, calc(100% * var(--keyboard-scale, 1)));
}

/* A single octave has no such trouble, and blown up to the width of the screen
   it would dwarf the staff. */
.keyboard-frame.keyboard-octave {
  width: var(--keyboard-width, calc(min(62vw, 18rem) * var(--keyboard-scale, 1)));
}

/* height too, or the SVG keeps the height of its own attribute while the
   width grows: it is then letterboxed inside the frame, and the answer, placed
   at a percentage of the frame, no longer sits over its key. */
.keyboard-frame img,
.keyboard-frame svg {
  width: 100%;
  height: auto;
}
`.trim();

function clefDeckNames(parent: string): Record<Clef, string> {
  return {
    treble: `${parent}::${CLEF_LABELS.treble} Clef`,
    bass: `${parent}::${CLEF_LABELS.bass} Clef`,
    alto: `${parent}::${CLEF_LABELS.alto} Clef`,
    tenor: `${parent}::${CLEF_LABELS.tenor} Clef`,
  };
}
