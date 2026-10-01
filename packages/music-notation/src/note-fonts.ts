// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import termesRegular from "./fonts/termes-regular.woff2?url&inline";
import termesBold from "./fonts/termes-bold.woff2?url&inline";
import herosRegular from "./fonts/heros-regular.woff2?url&inline";
import herosBold from "./fonts/heros-bold.woff2?url&inline";
import robotoRegular from "./fonts/roboto-regular.woff2?url&inline";
import robotoBold from "./fonts/roboto-bold.woff2?url&inline";

export const NOTE_FONTS = [
  { id: "termes", label: "TeX Gyre Termes" },
  { id: "roboto", label: "Roboto" },
  { id: "heros", label: "TeX Gyre Heros" },
] as const;
export type NoteFont = typeof NOTE_FONTS[number]["id"];

const SOURCES: Readonly<Record<NoteFont, readonly [regular: string, bold: string]>> = {
  termes: [termesRegular, termesBold],
  heros: [herosRegular, herosBold],
  roboto: [robotoRegular, robotoBold],
};

/** Embedded faces, so sandboxed frames and exported SVGs work offline without CORS requests. */
export function noteFontFaces(font: NoteFont, family: string): string {
  return SOURCES[font].map((url, index) =>
    `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${index ? "600 900" : "100 500"}; src: url("${url}") format("woff2"); }`,
  ).join("\n");
}

// Advance widths per em, capitals from the bold face and small letters from
// the regular one, as the original fonts in SOURCES.md give them.
export const NOTE_FONT_LETTER_ADVANCES: Readonly<Record<NoteFont, Readonly<Record<string, number>>>> = {
  termes: {
    A: 0.72, B: 0.67, C: 0.72, D: 0.72, E: 0.67, F: 0.61, G: 0.78,
    a: 0.44, b: 0.50, c: 0.44, d: 0.50, e: 0.44, f: 0.33, g: 0.50,
  },
  heros: {
    A: 0.72, B: 0.72, C: 0.72, D: 0.72, E: 0.67, F: 0.61, G: 0.78,
    a: 0.56, b: 0.56, c: 0.50, d: 0.56, e: 0.56, f: 0.28, g: 0.56,
  },
  roboto: {
    A: 0.67, B: 0.64, C: 0.65, D: 0.65, E: 0.56, F: 0.55, G: 0.68,
    a: 0.54, b: 0.56, c: 0.52, d: 0.56, e: 0.53, f: 0.35, g: 0.56,
  },
};
