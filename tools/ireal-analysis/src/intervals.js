// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Every degree an iReal Pro chord symbol can name, ordered by interval size
// and then by width within that size. `9`, `11` and `13` are the compound
// degrees, kept apart from their simple equivalents because a chord symbol
// spells them that way. `size` is how many letter names the degree spans and
// `semitones` how far it actually reaches; together they spell the note it
// lands on above a root.
export const DEGREES = new Map([
  ["m2", { size: 2, semitones: 1 }],
  ["M2", { size: 2, semitones: 2 }],
  ["m3", { size: 3, semitones: 3 }],
  ["M3", { size: 3, semitones: 4 }],
  ["P4", { size: 4, semitones: 5 }],
  ["A4", { size: 4, semitones: 6 }],
  ["d5", { size: 5, semitones: 6 }],
  ["P5", { size: 5, semitones: 7 }],
  ["A5", { size: 5, semitones: 8 }],
  ["m6", { size: 6, semitones: 8 }],
  ["M6", { size: 6, semitones: 9 }],
  ["d7", { size: 7, semitones: 9 }],
  ["m7", { size: 7, semitones: 10 }],
  ["M7", { size: 7, semitones: 11 }],
  ["b9", { size: 9, semitones: 13 }],
  ["9", { size: 9, semitones: 14 }],
  ["#9", { size: 9, semitones: 15 }],
  ["11", { size: 11, semitones: 17 }],
  ["#11", { size: 11, semitones: 18 }],
  ["b13", { size: 13, semitones: 20 }],
  ["13", { size: 13, semitones: 21 }],
]);

// Each iReal Pro quality spelled out as the degrees its symbol names, above
// the chord root. Degrees a player would add but the symbol does not name
// (the 9th under a `13`, say) are left out.
export const QUALITY_INTERVALS = new Map([
  ["", ["M3", "P5"]],
  ["2", ["M2", "P5"]],
  ["sus", ["P4", "P5"]],
  ["add9", ["M3", "P5", "9"]],
  ["6", ["M3", "P5", "M6"]],
  ["69", ["M3", "P5", "M6", "9"]],
  ["^", ["M3", "P5"]],
  ["^7", ["M3", "P5", "M7"]],
  ["^9", ["M3", "P5", "M7", "9"]],
  ["^13", ["M3", "P5", "M7", "13"]],
  ["^7#11", ["M3", "P5", "M7", "#11"]],
  ["^9#11", ["M3", "P5", "M7", "9", "#11"]],
  ["^7#5", ["M3", "A5", "M7"]],
  ["-", ["m3", "P5"]],
  ["-6", ["m3", "P5", "M6"]],
  ["-69", ["m3", "P5", "M6", "9"]],
  ["-7", ["m3", "P5", "m7"]],
  ["-9", ["m3", "P5", "m7", "9"]],
  ["-11", ["m3", "P5", "m7", "11"]],
  ["-^7", ["m3", "P5", "M7"]],
  ["-^9", ["m3", "P5", "M7", "9"]],
  ["-b6", ["m3", "P5", "m6"]],
  ["-#5", ["m3", "A5"]],
  ["7", ["M3", "P5", "m7"]],
  ["9", ["M3", "P5", "m7", "9"]],
  ["13", ["M3", "P5", "m7", "13"]],
  ["7b5", ["M3", "d5", "m7"]],
  ["9b5", ["M3", "d5", "m7", "9"]],
  ["7#5", ["M3", "A5", "m7"]],
  ["9#5", ["M3", "A5", "m7", "9"]],
  ["7b9", ["M3", "P5", "m7", "b9"]],
  ["7#9", ["M3", "P5", "m7", "#9"]],
  ["7#11", ["M3", "P5", "m7", "#11"]],
  ["7b13", ["M3", "P5", "m7", "b13"]],
  ["9#11", ["M3", "P5", "m7", "9", "#11"]],
  ["13b9", ["M3", "P5", "m7", "b9", "13"]],
  ["13#9", ["M3", "P5", "m7", "#9", "13"]],
  ["13#11", ["M3", "P5", "m7", "#11", "13"]],
  ["7b9b5", ["M3", "d5", "m7", "b9"]],
  ["7b9#5", ["M3", "A5", "m7", "b9"]],
  ["7b9#9", ["M3", "P5", "m7", "b9", "#9"]],
  ["7b9#11", ["M3", "P5", "m7", "b9", "#11"]],
  ["7b9b13", ["M3", "P5", "m7", "b9", "b13"]],
  ["7#9b5", ["M3", "d5", "m7", "#9"]],
  ["7#9#5", ["M3", "A5", "m7", "#9"]],
  ["7#9#11", ["M3", "P5", "m7", "#9", "#11"]],
  ["7alt", ["M3", "m7"]],
  ["7sus", ["P4", "P5", "m7"]],
  ["9sus", ["P4", "P5", "m7", "9"]],
  ["13sus", ["P4", "P5", "m7", "13"]],
  ["7b9sus", ["P4", "P5", "m7", "b9"]],
  ["7b13sus", ["P4", "P5", "m7", "b13"]],
  ["7susadd3", ["M3", "P4", "P5", "m7"]],
  ["h", ["m3", "d5"]],
  ["h7", ["m3", "d5", "m7"]],
  ["h9", ["m3", "d5", "m7", "9"]],
  ["o", ["m3", "d5"]],
  ["o7", ["m3", "d5", "d7"]],
  ["o^7", ["m3", "d5", "M7"]],
  ["+", ["M3", "A5"]],
]);

export function intervalsForQuality(quality) {
  const intervals = QUALITY_INTERVALS.get(quality);
  if (intervals === undefined) {
    throw new TypeError(`unmapped chord quality: ${quality}`);
  }
  return intervals;
}
