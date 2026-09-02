// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTAL_VALUES = new Map([
  ["", 0],
  ["b", -1],
  ["#", 1],
  ["bb", -2],
  ["##", 2],
]);
const ACCIDENTAL_NAMES = ["bb", "b", "", "#", "##"];

// The note a degree lands on above a root, spelled the way the chord symbol
// implies: the letter comes from the degree's size and the accidental from
// how far short of or beyond that letter the degree actually reaches. Returns
// null when the spelling would need a triple accidental, which no notation
// in use writes (`Cbo7` would want a diminished 7th of Bbbb).
export function spellDegree(root, { size, semitones }) {
  const letterIndex = LETTERS.indexOf(root[0]);
  const accidental = ACCIDENTAL_VALUES.get(root.slice(1));
  if (letterIndex < 0 || accidental === undefined) {
    throw new TypeError(`invalid root: ${root}`);
  }

  const targetOffset = letterIndex + size - 1;
  const targetIndex = targetOffset % LETTERS.length;
  const targetOctave = Math.floor(targetOffset / LETTERS.length);
  const reached = NATURAL_SEMITONES[letterIndex] + accidental + semitones;
  const natural = NATURAL_SEMITONES[targetIndex] + targetOctave * 12;
  const name = ACCIDENTAL_NAMES[reached - natural + 2];
  return name === undefined ? null : LETTERS[targetIndex] + name;
}
