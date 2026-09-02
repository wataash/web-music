// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type GuitarIntervalCard = Readonly<{
  id: string;
  rootString: number;
  targetString: number;
  fretOffset: number;
  semitones: number;
  names: readonly string[];
}>;

export const STRING_COUNT = 6;

// How far either side of the root the widest board reaches. A tritone each
// way is as far as a hand goes without moving position, and it makes the
// board an octave wide on one string.
export const MAX_FRET_REACH = 6;

// String 1 (high E) is drawn at the top, as the fretboard deck draws it.
// Standard tuning, as MIDI note numbers: E4 B3 G3 D3 A2 E2.
export const OPEN_STRING_SEMITONES = [64, 59, 55, 50, 45, 40] as const;

// Every name the deck gives a distance, folded into one octave: a shape is
// the same wherever it is played, and a guitarist fingers a chord's ♯9 at the
// m3's fret. Written the way the intervals deck writes them.
export const DEGREE_NAMES: readonly (readonly string[])[] = [
  ["1"],
  ["m2", "♭9"],
  ["M2", "9"],
  ["m3", "♯9"],
  ["M3"],
  ["P4", "11"],
  ["d5", "A4", "♯11"],
  ["P5"],
  ["m6", "A5", "♭13"],
  ["M6", "13", "d7"],
  ["m7"],
  ["M7"],
];

export const FRET_OFFSETS: readonly number[] = Array.from(
  { length: MAX_FRET_REACH * 2 + 1 },
  (_, index) => index - MAX_FRET_REACH,
);

// The root's own fret is not part of a card's identity: the same two strings
// the same number of frets apart are the same question at every position on
// the neck, so the board is drawn around the root rather than at a fret
// number. That leaves one card per root string and reachable cell.
export const GUITAR_INTERVAL_CARDS: readonly GuitarIntervalCard[] = Array.from(
  { length: STRING_COUNT },
  (_, index) => index + 1,
).flatMap((rootString) =>
  Array.from({ length: STRING_COUNT }, (_, index) => index + 1).flatMap(
    (targetString) =>
      FRET_OFFSETS.flatMap((fretOffset) => {
        if (targetString === rootString && fretOffset === 0) return [];
        const semitones = semitonesBetween(
          rootString,
          targetString,
          fretOffset,
        );
        return [
          {
            id: `r${rootString}-s${targetString}-${offsetSlug(fretOffset)}`,
            rootString,
            targetString,
            fretOffset,
            semitones,
            names: DEGREE_NAMES[semitones],
          },
        ];
      }),
  ),
);

// Folded into one octave: which octave the cell lands in depends on where the
// shape is played, and the deck asks for the name of the distance.
export function semitonesBetween(
  rootString: number,
  targetString: number,
  fretOffset: number,
): number {
  const distance =
    OPEN_STRING_SEMITONES[targetString - 1] +
    fretOffset -
    OPEN_STRING_SEMITONES[rootString - 1];
  return ((distance % 12) + 12) % 12;
}

export function offsetSlug(fretOffset: number): string {
  if (fretOffset === 0) return "0";
  return `${fretOffset < 0 ? "b" : "f"}${Math.abs(fretOffset)}`;
}

export function formatOffset(fretOffset: number): string {
  return fretOffset > 0 ? `+${fretOffset}` : String(fretOffset);
}
