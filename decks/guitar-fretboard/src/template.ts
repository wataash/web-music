// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { WEB_FRETBOARD_SCRIPT } from "./fretboard";

export const MODEL_NAME = "Guitar Fretboard Notes";
export const ROOT_DECK_NAME = "Guitar Fretboard";
export const POSITION_TO_NOTE_DECK_NAME = `${ROOT_DECK_NAME}::Position → Note`;
export const NOTE_TO_POSITIONS_DECK_NAME = `${ROOT_DECK_NAME}::Note → Positions`;

export const FIELD_NAMES = [
  "Id",
  "Spelling",
  "String",
  "Fret",
  "Note",
  "FrontImage",
  "BackImage",
  "Positions",
] as const;

function heading(showAnswer: boolean): string {
  // Hidden answers reserve the same space when a long position list wraps.
  const hidden = showAnswer ? "" : ' style="visibility: hidden" aria-hidden="true"';
  return `  <div class="position" data-card-part="text">
    {{#Fret}}<span class="position-pair"><span class="position-question">{{String}}-{{Fret}}</span><span class="position-answer"${hidden}>{{Note}}</span></span>{{/Fret}}
    {{#Positions}}<span class="position-pair"><span class="position-question">{{Note}}</span><span class="position-answer"${hidden}>{{Positions}}</span></span>{{/Positions}}
  </div>`;
}

// Keep all positions in the note data for the diagram; shorten only the heading.
const POSITION_LABEL_SCRIPT = `
<script>
for (const answer of document.querySelectorAll(".position-answer")) {
  answer.textContent = (answer.textContent ?? "")
    .split(" ")
    .filter((position) => !/^[1-6]-24$/.test(position))
    .join(" ");
}
</script>
`.trim();

export const FRONT_TEMPLATE = `
<main class="fretboard-card">
${heading(false)}
  <div class="diagram" data-card-part="board">{{FrontImage}}</div>
</main>
${POSITION_LABEL_SCRIPT}
`.trim();

export const BACK_TEMPLATE = `
<main class="fretboard-card">
${heading(true)}
  <div class="diagram" data-card-part="board">{{BackImage}}</div>
</main>
${POSITION_LABEL_SCRIPT}
`.trim();

export const WEB_FRONT_TEMPLATE = `
<main class="fretboard-card">
${heading(false)}
  <div class="diagram" data-card-part="board" data-fretboard data-side="front" data-string="{{String}}" data-fret="{{Fret}}" {{#Positions}}data-has-positions="true" data-note="{{Note}}"{{/Positions}}></div>
</main>
${POSITION_LABEL_SCRIPT}
${WEB_FRETBOARD_SCRIPT}
`.trim();

export const WEB_BACK_TEMPLATE = `
<main class="fretboard-card">
${heading(true)}
  <div class="diagram" data-card-part="board" data-fretboard data-side="back" data-string="{{String}}" data-fret="{{Fret}}" data-note="{{Note}}" {{#Positions}}data-has-positions="true" data-positions="{{Positions}}"{{/Positions}}></div>
</main>
${POSITION_LABEL_SCRIPT}
${WEB_FRETBOARD_SCRIPT}
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

.fretboard-card {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
}

.position {
  width: 100%;
  font-size: calc(clamp(1.5rem, 5vw, 2.25rem) * var(--text-scale, 1));
  font-weight: 700;
  line-height: 1.1;
}

.position-pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 0.6em;
}

.position-question {
  text-align: right;
}

.position-answer {
  text-align: left;
}

.diagram img,
.diagram svg {
  display: block;
  width: min(96vw, 72rem);
  height: auto;
}
`.trim();
