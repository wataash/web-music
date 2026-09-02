// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { fifthsForMajorNote } from "@circle-of-fifths/core";

export type IntervalDifficulty = "basic" | "advanced" | "esoteric";

export type IntervalDefinition = Readonly<{
  id: string;
  label: string;
  number: number;
  semitones: number;
}>;

export type IntervalCard = Readonly<{
  id: string;
  interval: IntervalDefinition;
  root: string;
  answer: string;
  difficulty: IntervalDifficulty;
}>;

// Ordered by learning priority, not by size: the array position is the order
// new cards are introduced in (see `orderGroup` in @web-music/anki-apkg) and
// the order the decks are listed in. The ranking and its sources are written
// up in ../README.md ("Learning order").
export const INTERVALS = [
  // Triads, then the rest of the diatonic set.
  { id: "P5", label: "P5", number: 5, semitones: 7 },
  { id: "M3", label: "M3", number: 3, semitones: 4 },
  { id: "m3", label: "m3", number: 3, semitones: 3 },
  { id: "P4", label: "P4", number: 4, semitones: 5 },
  { id: "M2", label: "M2", number: 2, semitones: 2 },
  { id: "m2", label: "m2", number: 2, semitones: 1 },
  // Seventh chords, the diminished 7th among them.
  { id: "m7", label: "m7", number: 7, semitones: 10 },
  { id: "M7", label: "M7", number: 7, semitones: 11 },
  { id: "M6", label: "M6", number: 6, semitones: 9 },
  { id: "m6", label: "m6", number: 6, semitones: 8 },
  { id: "d7", label: "d7", number: 7, semitones: 9 },
  // The altered fifths: the tritone's two spellings, then the one the
  // augmented triad raises.
  { id: "d5", label: "d5", number: 5, semitones: 6 },
  { id: "A4", label: "A4", number: 4, semitones: 6 },
  { id: "A5", label: "A5", number: 5, semitones: 8 },
  // Tensions, which reduce to a simple interval plus an octave.
  { id: "9", label: "9", number: 9, semitones: 14 },
  { id: "13", label: "13", number: 13, semitones: 21 },
  { id: "11", label: "11", number: 11, semitones: 17 },
  // The four alterations of a dominant chord.
  { id: "b9", label: "♭9", number: 9, semitones: 13 },
  { id: "#9", label: "♯9", number: 9, semitones: 15 },
  { id: "#11", label: "♯11", number: 11, semitones: 18 },
  { id: "b13", label: "♭13", number: 13, semitones: 20 },
] as const satisfies readonly IntervalDefinition[];

export const INTERVAL_ORDER_GROUPS: ReadonlyMap<string, number> = new Map(
  INTERVALS.map(({ id }, index) => [id, index]),
);

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;
const ACCIDENTALS = ["", "b", "#", "bb", "##"] as const;

export const ROOT_NOTES = ACCIDENTALS.flatMap((accidental) =>
  LETTERS.map((letter) => `${letter}${accidental}`),
).sort(
  (left, right) => fifthsForMajorNote(left) - fifthsForMajorNote(right),
);

export const INTERVAL_CARDS: readonly IntervalCard[] = INTERVALS.flatMap(
  (interval) =>
    ROOT_NOTES.flatMap((root) => {
      const answer = transpose(root, interval);
      return answer === null
        ? []
        : [
            {
              id: `${interval.id}-${noteSlug(root)}`,
              interval,
              root,
              answer,
              difficulty: difficultyForRoot(root),
            },
          ];
    }),
);

// Without octave numbers, a note pair cannot distinguish a simple interval
// from its compound equivalent (for example, C → D♭ is m2 or ♭9).
export const INTERVAL_IDENTIFICATION_CARDS = INTERVAL_CARDS.filter(
  ({ interval }) => interval.number <= 7,
);

// How the note sounds, numbered as MIDI does (middle C is 60). Which octave a
// card draws is arbitrary — an interval is the same shape wherever it is
// played — so they all start from the one around middle C.
export function noteSemitone(note: string, octave = 4): number {
  const letterIndex = LETTERS.indexOf(note[0] as (typeof LETTERS)[number]);
  if (letterIndex < 0) throw new TypeError(`invalid note: ${note}`);
  return (
    (octave + 1) * 12 +
    NATURAL_SEMITONES[letterIndex] +
    accidentalValue(note.slice(1))
  );
}

export function formatNote(note: string): string {
  const accidental = note.slice(1);
  const symbol = {
    "": "",
    b: "♭",
    "#": "♯",
    bb: "𝄫",
    "##": "𝄪",
  }[accidental];
  if (symbol === undefined) throw new TypeError(`invalid note: ${note}`);
  return note[0] + symbol;
}

export function difficultyForRoot(root: string): IntervalDifficulty {
  const accidentalLength = root.length - 1;
  if (accidentalLength === 0) return "basic";
  return accidentalLength === 1 ? "advanced" : "esoteric";
}

export function noteSlug(note: string): string {
  const suffix = {
    "": "",
    b: "-flat",
    "#": "-sharp",
    bb: "-double-flat",
    "##": "-double-sharp",
  }[note.slice(1)];
  if (suffix === undefined) throw new TypeError(`invalid note: ${note}`);
  return note[0].toLowerCase() + suffix;
}

function transpose(
  root: string,
  interval: IntervalDefinition,
): string | null {
  const rootLetterIndex = LETTERS.indexOf(root[0] as (typeof LETTERS)[number]);
  if (rootLetterIndex < 0) throw new TypeError(`invalid root: ${root}`);
  const rootAccidental = accidentalValue(root.slice(1));
  const targetLetterOffset = rootLetterIndex + interval.number - 1;
  const targetLetterIndex = targetLetterOffset % LETTERS.length;
  const targetOctave = Math.floor(targetLetterOffset / LETTERS.length);
  const targetNatural =
    NATURAL_SEMITONES[targetLetterIndex] + targetOctave * 12;
  const desired =
    NATURAL_SEMITONES[rootLetterIndex] +
    rootAccidental +
    interval.semitones;
  const targetAccidental = desired - targetNatural;
  if (targetAccidental < -2 || targetAccidental > 2) return null;
  return LETTERS[targetLetterIndex] + accidentalForValue(targetAccidental);
}

function accidentalValue(accidental: string): number {
  const value = { "": 0, b: -1, "#": 1, bb: -2, "##": 2 }[accidental];
  if (value === undefined) {
    throw new TypeError(`invalid accidental: ${accidental}`);
  }
  return value;
}

function accidentalForValue(value: number): string {
  const accidental = ["bb", "b", "", "#", "##"][value + 2];
  if (accidental === undefined) {
    throw new RangeError(`invalid accidental: ${value}`);
  }
  return accidental;
}
