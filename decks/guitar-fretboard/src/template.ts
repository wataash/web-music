// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { WEB_FRETBOARD_SCRIPT } from "./fretboard";

export const MODEL_NAME = "Guitar Fretboard Notes";
export const ROOT_DECK_NAME = "Guitar Fretboard";
export const POSITION_TO_NOTE_DECK_NAME = `${ROOT_DECK_NAME}::Position → Note`;
export const NATURALS_DECK_NAME = `${POSITION_TO_NOTE_DECK_NAME}::Naturals`;
export const FLATS_DECK_NAME = `${POSITION_TO_NOTE_DECK_NAME}::Naturals + Flats`;
export const SHARPS_DECK_NAME = `${POSITION_TO_NOTE_DECK_NAME}::Naturals + Sharps`;
export const NOTE_TO_POSITIONS_DECK_NAME = `${ROOT_DECK_NAME}::Note → Positions`;
export const NOTE_TO_POSITIONS_NATURALS_DECK_NAME = `${NOTE_TO_POSITIONS_DECK_NAME}::Naturals`;
export const NOTE_TO_POSITIONS_FLATS_DECK_NAME = `${NOTE_TO_POSITIONS_DECK_NAME}::Naturals + Flats`;
export const NOTE_TO_POSITIONS_SHARPS_DECK_NAME = `${NOTE_TO_POSITIONS_DECK_NAME}::Naturals + Sharps`;

export const FIELD_NAMES = [
  "Id",
  "System",
  "String",
  "Fret",
  "Note",
  "FrontImage",
  "BackImage",
  "Positions",
] as const;

export const FRONT_TEMPLATE = `
<main class="fretboard-card">
  <div class="position">
    {{#Fret}}{{String}}-{{Fret}}{{/Fret}}
    {{#Positions}}{{Note}}{{/Positions}}
  </div>
  <div class="diagram">{{FrontImage}}</div>
</main>
`.trim();

export const BACK_TEMPLATE = `
<main class="fretboard-card">
  <div class="position">
    {{#Fret}}{{String}}-{{Fret}}{{/Fret}}
    {{#Positions}}{{Note}} {{Positions}}{{/Positions}}
  </div>
  <div class="diagram">{{BackImage}}</div>
</main>
`.trim();

export const WEB_FRONT_TEMPLATE = `
<main class="fretboard-card">
  <div class="position">
    {{#Fret}}{{String}}-{{Fret}}{{/Fret}}
    {{#Positions}}{{Note}}{{/Positions}}
  </div>
  <div class="diagram" data-fretboard data-side="front" data-system="{{System}}" data-string="{{String}}" data-fret="{{Fret}}" {{#Positions}}data-has-positions="true" data-note="{{Note}}"{{/Positions}}></div>
</main>
${WEB_FRETBOARD_SCRIPT}
`.trim();

export const WEB_BACK_TEMPLATE = `
<main class="fretboard-card">
  <div class="position">
    {{#Fret}}{{String}}-{{Fret}}{{/Fret}}
    {{#Positions}}{{Note}} {{Positions}}{{/Positions}}
  </div>
  <div class="diagram" data-fretboard data-side="back" data-system="{{System}}" data-string="{{String}}" data-fret="{{Fret}}" data-note="{{Note}}" {{#Positions}}data-has-positions="true" data-positions="{{Positions}}"{{/Positions}}></div>
</main>
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
  font-size: clamp(1.5rem, 5vw, 2.25rem);
  font-weight: 700;
  line-height: 1.1;
}

.diagram img,
.diagram svg {
  display: block;
  width: min(96vw, 72rem);
  height: auto;
}
`.trim();
