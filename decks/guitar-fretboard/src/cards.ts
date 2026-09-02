// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type NoteSystem = "naturals" | "flats" | "sharps";

export type PositionToNoteCard = Readonly<{
  id: string;
  kind: "position-to-note";
  system: NoteSystem;
  string: number;
  fret: number;
  pitchClass: number;
  note: string;
  tag: `system::${NoteSystem}`;
}>;

export type NoteToPositionsCard = Readonly<{
  id: string;
  kind: "note-to-positions";
  system: NoteSystem;
  string: number;
  frets: readonly number[];
  pitchClass: number;
  note: string;
  tag: `system::${NoteSystem}`;
}>;

export type FretboardCard = PositionToNoteCard | NoteToPositionsCard;

export const FRET_COUNT = 24;
export const STRING_COUNT = 6;

// String 1 (high E) is rendered at the top, matching guitar_board.
export const OPEN_STRING_PITCH_CLASSES = [7, 2, 10, 5, 0, 7] as const;

export const NOTE_NAMES = {
  naturals: ["A", "B", "C", "D", "E", "F", "G"],
  flats: [
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
  ],
  sharps: [
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
  ],
} as const satisfies Record<NoteSystem, readonly string[]>;

const NATURAL_PITCH_CLASSES = [0, 2, 3, 5, 7, 8, 10] as const;
const NOTE_SYSTEMS = ["naturals", "flats", "sharps"] as const;

export const POSITION_TO_NOTE_CARDS: readonly PositionToNoteCard[] = (
  NOTE_SYSTEMS
).flatMap((system) =>
  OPEN_STRING_PITCH_CLASSES.flatMap((openPitchClass, stringIndex) =>
    Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
      const string = stringIndex + 1;
      const pitchClass = (openPitchClass + fret) % 12;
      const note = noteNameAtPitchClass(system, pitchClass);
      if (note === undefined) return [];

      return [
        {
          id: `${system}-string-${string}-fret-${fret}`,
          kind: "position-to-note" as const,
          system,
          string,
          fret,
          pitchClass,
          note,
          tag: `system::${system}` as const,
        },
      ];
    }).flat(),
  ),
);

export const NOTE_TO_POSITIONS_CARDS: readonly NoteToPositionsCard[] = (
  NOTE_SYSTEMS
).flatMap((system) =>
  OPEN_STRING_PITCH_CLASSES.flatMap((openPitchClass, stringIndex) =>
    noteEntries(system).map(({ note, pitchClass }) => {
      const string = stringIndex + 1;
      const frets = Array.from(
        { length: FRET_COUNT + 1 },
        (_, fret) => fret,
      ).filter(
        (fret) => (openPitchClass + fret) % 12 === pitchClass,
      );

      return {
        id: `${system}-note-to-positions-string-${string}-pitch-${pitchClass}`,
        kind: "note-to-positions" as const,
        system,
        string,
        frets,
        pitchClass,
        note,
        tag: `system::${system}` as const,
      };
    }),
  ),
);

export const CARDS: readonly FretboardCard[] = [
  ...POSITION_TO_NOTE_CARDS.filter(({ system }) => system !== "naturals"),
  ...NOTE_TO_POSITIONS_CARDS.filter(({ system }) => system !== "naturals"),
  ...POSITION_TO_NOTE_CARDS.filter(({ system }) => system === "naturals"),
  ...NOTE_TO_POSITIONS_CARDS.filter(({ system }) => system === "naturals"),
];

function noteNameAtPitchClass(
  system: NoteSystem,
  pitchClass: number,
): string | undefined {
  if (system !== "naturals") return NOTE_NAMES[system][pitchClass];
  const index = NATURAL_PITCH_CLASSES.indexOf(
    pitchClass as (typeof NATURAL_PITCH_CLASSES)[number],
  );
  return index === -1 ? undefined : NOTE_NAMES.naturals[index];
}

function noteEntries(
  system: NoteSystem,
): readonly Readonly<{ note: string; pitchClass: number }>[] {
  if (system === "naturals") {
    return NOTE_NAMES.naturals.map((note, index) => ({
      note,
      pitchClass: NATURAL_PITCH_CLASSES[index],
    }));
  }
  return NOTE_NAMES[system].map((note, pitchClass) => ({ note, pitchClass }));
}
