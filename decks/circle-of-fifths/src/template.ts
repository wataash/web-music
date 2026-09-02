// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { renderDarkCircleOfFifthsSvg } from "@circle-of-fifths/svg";

export const MODEL_NAME = "Circle of Fifths";
export const ROOT_DECK_NAME = "(Experimental) Circle of Fifths";
export const INTERVALS_DECK_NAME = `${ROOT_DECK_NAME}::(Experimental) Intervals`;
export const CELL_TO_NOTES_DECK_NAME =
  `${ROOT_DECK_NAME}::Cell → All Notes`;
export const OUTER_CELL_TO_NOTES_DECK_NAME =
  `${CELL_TO_NOTES_DECK_NAME}::Outer (Major) Cell → Notes`;
export const INNER_CELL_TO_NOTES_DECK_NAME =
  `${CELL_TO_NOTES_DECK_NAME}::Inner (Minor) Cell → Notes`;
export const NOTE_TO_CELL_DECK_NAME =
  `${ROOT_DECK_NAME}::Note → Cell`;
export const OUTER_NOTE_TO_CELL_DECK_NAME =
  `${NOTE_TO_CELL_DECK_NAME}::Note → Outer (Major) Cell`;
export const INNER_NOTE_TO_CELL_DECK_NAME =
  `${NOTE_TO_CELL_DECK_NAME}::Note → Inner (Minor) Cell`;
export const FLAT3_DECK_NAME = `${INTERVALS_DECK_NAME}::♭3`;
export const MAJOR3_DECK_NAME = `${INTERVALS_DECK_NAME}::Δ3`;

export const FIELD_NAMES = [
  "Id",
  "Interval",
  "Question",
  "Answer",
  "FrontImage",
  "BackImage",
] as const;

export const FRONT_TEMPLATE = `
<main class="interval-card">
  <div class="question">{{Question}}</div>
  <div class="diagram">{{FrontImage}}</div>
</main>
`.trim();

export const BACK_TEMPLATE = `
<main class="interval-card">
  <div class="question">{{Question}}</div>
  <div class="answer">{{Answer}}</div>
  <div class="diagram">{{BackImage}}</div>
</main>
`.trim();

const WEB_BASE_SVG = renderDarkCircleOfFifthsSvg({
  highlightedCells: (["outer", "inner"] as const).flatMap((ring) =>
    Array.from({ length: 12 }, (_, index) => ({ ring, hour: index + 1 })),
  ),
}).replace('<?xml version="1.0" encoding="UTF-8"?>\n', "");

const WEB_CIRCLE_SCRIPT = `
<script>
(() => {
  const host = document.querySelector("[data-circle-of-fifths]");
  if (!(host instanceof HTMLElement)) return;
  host.innerHTML = ${JSON.stringify(WEB_BASE_SVG)};
  const svg = host.querySelector("svg");
  if (!(svg instanceof SVGElement)) return;
  const drawing = (host.dataset.drawing ?? "empty").split("|");
  const highlights = [...svg.querySelectorAll(".circle-of-fifths__highlight")];
  for (const highlight of highlights) highlight.setAttribute("display", "none");
  const notes = [...svg.querySelectorAll(".circle-of-fifths__note")];
  for (const note of notes) note.setAttribute("display", "none");

  if (drawing[0] === "cell") {
    const selected = highlights.find(
      (highlight) =>
        highlight.getAttribute("data-ring") === drawing[1] &&
        highlight.getAttribute("data-hour") === drawing[2],
    );
    selected?.removeAttribute("display");
    return;
  }

  const visible = (drawing[1] ?? "").split(" ").filter(Boolean);
  if (drawing[0] === "standard") {
    for (const note of notes) {
      if (visible.includes(note.getAttribute("data-note") ?? "")) {
        note.removeAttribute("display");
      }
    }
    return;
  }
  if (drawing[0] !== "single") return;

  svg.classList.add("circle-of-fifths--single-note");
  const source = new Map(notes.map((note) => [
    note.getAttribute("data-note") ?? "",
    {
      label: note.parentElement,
      basic: note.querySelector(".circle-of-fifths__basic-highlight") !== null,
    },
  ]));
  for (const label of svg.querySelectorAll(".circle-of-fifths__label")) {
    label.replaceChildren();
  }
  const namespace = "http://www.w3.org/2000/svg";
  const formatNote = (note) =>
    note[0] + note.slice(1)
      .replaceAll("bb", "𝄫")
      .replaceAll("##", "𝄪")
      .replaceAll("b", "♭")
      .replaceAll("#", "♯");
  for (const noteName of visible) {
    const placement = source.get(noteName);
    if (!(placement?.label instanceof SVGElement)) continue;
    const group = document.createElementNS(namespace, "g");
    group.setAttribute("class", "circle-of-fifths__note");
    group.setAttribute("data-note", noteName);
    if (placement.basic) {
      const rect = document.createElementNS(namespace, "rect");
      rect.setAttribute("class", "circle-of-fifths__basic-highlight");
      rect.setAttribute("x", "-75");
      rect.setAttribute("y", "-52.5");
      rect.setAttribute("width", "150");
      rect.setAttribute("height", "105");
      rect.setAttribute("rx", "8");
      rect.setAttribute("aria-hidden", "true");
      group.append(rect);
    }
    const text = document.createElementNS(namespace, "text");
    text.setAttribute("class", "circle-of-fifths__spelling");
    text.setAttribute("x", "0");
    text.setAttribute("y", "0");
    text.textContent = formatNote(noteName);
    group.append(text);
    placement.label.append(group);
  }
})();
</script>
`.trim();

export const WEB_FRONT_TEMPLATE = `
<main class="interval-card">
  <div class="question">{{Question}}</div>
  <div class="diagram" data-circle-of-fifths data-drawing="{{FrontImage}}"></div>
</main>
${WEB_CIRCLE_SCRIPT}
`.trim();

export const WEB_BACK_TEMPLATE = `
<main class="interval-card">
  <div class="question">{{Question}}</div>
  <div class="answer">{{Answer}}</div>
  <div class="diagram" data-circle-of-fifths data-drawing="{{BackImage}}"></div>
</main>
${WEB_CIRCLE_SCRIPT}
`.trim();

export const CARD_CSS = `
.card {
  box-sizing: border-box;
  margin: 0;
  padding: 1rem;
  background: #111827;
  color: #f3f4f6;
  color-scheme: dark;
  font-family: "Noto Sans", "DejaVu Sans", "Noto Music",
    "Noto Sans Symbols2", sans-serif;
  text-align: center;
}

.interval-card {
  display: grid;
  justify-items: center;
  gap: 1rem;
}

.question,
.answer {
  font-size: clamp(2rem, 8vw, 3.5rem);
  font-weight: 700;
  line-height: 1.2;
}

.answer {
  color: #fcd34d;
}

.question:empty,
.answer:empty {
  display: none;
}

.diagram img,
.diagram svg {
  display: block;
  width: min(90vw, 34rem);
  height: auto;
}
`.trim();
