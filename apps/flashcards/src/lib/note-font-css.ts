// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { noteFontFaces } from "@web-music/music-notation/note-fonts";

import type { NoteFont } from "./note-font.svelte";

export function noteFontCss(font: NoteFont = "termes"): string {
  return noteFontFaces(font, "Flashcard Notes") + `
  .prompt, .prompt-line, .question, .answer, .position,
  .movable-do__answer, .movable-do__pitch, .key-name, .fret-name,
  .circle-of-fifths__label, .circle-of-fifths__spelling,
  .keyboard-note-name, .keyboard-degree, .fretboard__label,
  .staff__answer, .staff__name, .staff__solfege {
    font-family: "Flashcard Notes", serif !important;
  }
  `;
}
