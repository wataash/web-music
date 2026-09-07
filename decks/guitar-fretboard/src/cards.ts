// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// How a card writes the note it is about. A pitch with two names is written
// under both at once wherever a card answers with it, and Note → Positions
// also asks it under each name on its own.
export type NoteSpelling = "natural" | "flat" | "sharp" | "enharmonic";

export type PositionToNoteCard = Readonly<{
  id: string;
  kind: "position-to-note";
  spelling: NoteSpelling;
  string: number;
  fret: number;
  pitchClass: number;
  note: string;
  tag: `spelling::${NoteSpelling}`;
}>;

export type NoteToPositionsCard = Readonly<{
  id: string;
  kind: "note-to-positions";
  spelling: NoteSpelling;
  string: number;
  frets: readonly number[];
  pitchClass: number;
  note: string;
  tag: `spelling::${NoteSpelling}`;
}>;

export type FretboardCard = PositionToNoteCard | NoteToPositionsCard;

export const FRET_COUNT = 24;
export const STRING_COUNT = 6;

// String 1 (high E) is rendered at the top, matching guitar_board.
export const OPEN_STRING_PITCH_CLASSES = [7, 2, 10, 5, 0, 7] as const;

const FLAT_NAMES = [
  "A",
  "B♭",
  "B",
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "G♭",
  "G",
  "A♭",
] as const;

const SHARP_NAMES = [
  "A",
  "A♯",
  "B",
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
] as const;

export const NOTE_NAMES = {
  flats: FLAT_NAMES,
  sharps: SHARP_NAMES,
  // What a position answers with. One deck asks about every position, so the
  // answer cannot be spelt from the deck it came from; a pitch with two names
  // is written under both of them.
  both: FLAT_NAMES.map((flat, pitchClass) =>
    flat === SHARP_NAMES[pitchClass]
      ? flat
      : `${SHARP_NAMES[pitchClass]}${flat}`,
  ),
} as const;

export const POSITION_TO_NOTE_CARDS: readonly PositionToNoteCard[] =
  OPEN_STRING_PITCH_CLASSES.flatMap((openPitchClass, stringIndex) =>
    Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
      const string = stringIndex + 1;
      const pitchClass = (openPitchClass + fret) % 12;
      const spelling =
        FLAT_NAMES[pitchClass] === SHARP_NAMES[pitchClass]
          ? ("natural" as const)
          : ("enharmonic" as const);

      return {
        id: `position-to-note-string-${string}-fret-${fret}`,
        kind: "position-to-note" as const,
        spelling,
        string,
        fret,
        pitchClass,
        note: NOTE_NAMES.both[pitchClass],
        tag: `spelling::${spelling}` as const,
      };
    }),
  );

// Every spelling the other direction asks about, low to high from A, each
// accidental pitch under its sharp name, its flat name and both together.
export const NOTE_TO_POSITIONS_NOTES: readonly Readonly<{
  note: string;
  pitchClass: number;
  spelling: NoteSpelling;
}>[] = FLAT_NAMES.map((flat, pitchClass) => {
  const sharp = SHARP_NAMES[pitchClass];
  if (flat === sharp) {
    return [{ note: flat, pitchClass, spelling: "natural" as const }];
  }
  return [
    { note: sharp, pitchClass, spelling: "sharp" as const },
    { note: flat, pitchClass, spelling: "flat" as const },
    { note: `${sharp}${flat}`, pitchClass, spelling: "enharmonic" as const },
  ];
}).flat();

export const NOTE_TO_POSITIONS_CARDS: readonly NoteToPositionsCard[] =
  OPEN_STRING_PITCH_CLASSES.flatMap((openPitchClass, stringIndex) =>
    NOTE_TO_POSITIONS_NOTES.map(({ note, pitchClass, spelling }) => {
      const string = stringIndex + 1;
      const frets = Array.from(
        { length: FRET_COUNT + 1 },
        (_, fret) => fret,
      ).filter((fret) => (openPitchClass + fret) % 12 === pitchClass);

      return {
        id: `note-to-positions-${spelling}-string-${string}-pitch-${pitchClass}`,
        kind: "note-to-positions" as const,
        spelling,
        string,
        frets,
        pitchClass,
        note,
        tag: `spelling::${spelling}` as const,
      };
    }),
  );

export const CARDS: readonly FretboardCard[] = [
  ...POSITION_TO_NOTE_CARDS,
  ...NOTE_TO_POSITIONS_CARDS,
];
