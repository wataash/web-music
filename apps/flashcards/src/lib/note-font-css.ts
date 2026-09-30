// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import termesRegular from "./fonts/termes-regular.woff2?url&inline";
import termesBold from "./fonts/termes-bold.woff2?url&inline";
import herosRegular from "./fonts/heros-regular.woff2?url&inline";
import herosBold from "./fonts/heros-bold.woff2?url&inline";
import robotoRegular from "./fonts/roboto-regular.woff2?url&inline";
import robotoBold from "./fonts/roboto-bold.woff2?url&inline";
import type { NoteFont } from "./note-font.svelte";

const SOURCES = {
  termes: [termesRegular, termesBold],
  heros: [herosRegular, herosBold],
  roboto: [robotoRegular, robotoBold],
} as const;

/** Embed fonts so sandboxed card frames also work offline without CORS requests. */
export function noteFontCss(font: NoteFont = "termes"): string {
  return SOURCES[font].map((url, index) =>
    `@font-face { font-family: "Flashcard Notes"; font-style: normal; font-weight: ${index ? "600 900" : "100 500"}; src: url("${url}") format("woff2"); }`,
  ).join("\n") + `
  .prompt, .prompt-line, .question, .answer, .position,
  .movable-do__answer, .movable-do__pitch, .key-name, .fret-name,
  .circle-of-fifths__label, .circle-of-fifths__spelling,
  .keyboard-note-name, .keyboard-degree, .fretboard__label,
  .staff__answer, .staff__name, .staff__solfege {
    font-family: "Flashcard Notes", serif !important;
  }
  `;
}
