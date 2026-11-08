// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { CHORD_FONT_CSS } from "@web-music/music-notation/chord-font";

// The same embedded Edwin face is used by every study and preview document.
// Music glyphs keep their dedicated Leland/engraved rendering.
export const CARD_FONT_CSS = CHORD_FONT_CSS + `
  .card, .card svg text,
  .prompt, .prompt-line, .question, .answer, .position,
  .movable-do__answer, .movable-do__pitch, .key-name, .fret-name,
  .circle-of-fifths__label, .circle-of-fifths__spelling,
  .keyboard-note-name, .keyboard-degree, .fretboard__label,
  .staff__answer, .staff__name, .staff__solfege {
    font-family: "Flashcard Chords", serif !important;
    font-weight: 400 !important;
    font-synthesis: none;
  }
`;
