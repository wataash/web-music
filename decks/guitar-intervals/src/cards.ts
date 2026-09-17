// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { GUITAR_OPEN_STRINGS } from "@web-music/practice-ui/guitar";

export type GuitarIntervalCard = Readonly<{
  id: string;
  rootString: number;
  targetString: number;
  fretOffset: number;
  semitones: number;
  names: readonly string[];
}>;

// The open strings, as MIDI note numbers with string 1 first. Standard
// guitar is E4 B3 G3 D3 A2 E2; the app asks for other instruments.
export type Tuning = readonly number[];
export const STANDARD_TUNING: Tuning = GUITAR_OPEN_STRINGS;

// How far either side of the root the widest board reaches. A tritone each
// way is as far as a hand goes without moving position, and it makes the
// board an octave wide on one string.
export const MAX_FRET_REACH = 6;

// Every name the deck gives a distance, folded into one octave: a shape is
// the same wherever it is played, and a guitarist fingers a chord's ♯9 at the
// m3's fret. Written the way the intervals deck writes them.
export const DEGREE_NAMES: readonly (readonly string[])[] = [
  ["1"],
  ["♭9", "m2"],
  ["9", "M2"],
  ["m3", "♯9"],
  ["M3"],
  ["11", "P4"],
  ["♯11", "d5", "A4"],
  ["P5"],
  ["♭13", "m6", "A5"],
  ["13", "M6", "d7"],
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
export function guitarIntervalCards(
  tuning: Tuning = STANDARD_TUNING,
): readonly GuitarIntervalCard[] {
  const strings = tuning.map((_, index) => index + 1);
  return strings.flatMap((rootString) =>
    strings.flatMap((targetString) =>
      FRET_OFFSETS.flatMap((fretOffset) => {
        if (targetString === rootString && fretOffset === 0) return [];
        const semitones = semitonesBetween(
          rootString,
          targetString,
          fretOffset,
          tuning,
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
}

export const GUITAR_INTERVAL_CARDS: readonly GuitarIntervalCard[] =
  guitarIntervalCards();

// Folded into one octave: which octave the cell lands in depends on where the
// shape is played, and the deck asks for the name of the distance.
export function semitonesBetween(
  rootString: number,
  targetString: number,
  fretOffset: number,
  tuning: Tuning = STANDARD_TUNING,
): number {
  const distance =
    tuning[targetString - 1] + fretOffset - tuning[rootString - 1];
  return ((distance % 12) + 12) % 12;
}

export function offsetSlug(fretOffset: number): string {
  if (fretOffset === 0) return "0";
  return `${fretOffset < 0 ? "b" : "f"}${Math.abs(fretOffset)}`;
}

export function formatOffset(fretOffset: number): string {
  return fretOffset > 0 ? `+${fretOffset}` : String(fretOffset);
}
