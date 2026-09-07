// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// `Guitar Fretboard::Note → Positions` is one flat deck of every note the neck
// can be asked for, so what it asks is narrowed by picking notes rather than by
// studying a subdeck. A pitch with two names appears three times — under each
// name on its own and under both at once — and only the naturals are asked
// until the reader turns the rest on.

import type { NoteRow } from "./db";

export const FRETBOARD_NOTE_TO_POSITIONS_DECK =
  "Guitar Fretboard::Note → Positions";

export type FretboardNoteSpelling =
  | "natural"
  | "flat"
  | "sharp"
  | "enharmonic";

export type FretboardNoteRow = Readonly<{
  note: string;
  spelling: FretboardNoteSpelling;
}>;

export type FretboardNotePreset = "naturals" | "all" | "custom";

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

// The same order the package writes its cards in: up from A, each accidental
// under its sharp name, its flat name and both together.
export const ALL_FRETBOARD_NOTES: readonly FretboardNoteRow[] = FLAT_NAMES.flatMap(
  (flat, pitchClass): readonly FretboardNoteRow[] => {
    const sharp = SHARP_NAMES[pitchClass];
    if (flat === sharp) return [{ note: flat, spelling: "natural" }];
    return [
      { note: sharp, spelling: "sharp" },
      { note: flat, spelling: "flat" },
      { note: `${sharp}${flat}`, spelling: "enharmonic" },
    ];
  },
);

export function fretboardNotesForPreset(
  preset: Exclude<FretboardNotePreset, "custom">,
): readonly string[] {
  return ALL_FRETBOARD_NOTES.filter(
    ({ spelling }) => preset === "all" || spelling === "natural",
  ).map(({ note }) => note);
}

// The neck is learnt by its natural notes first: the accidentals, and the dots
// that carry both of their names, are there to opt into.
export const DEFAULT_FRETBOARD_NOTE_SELECTION =
  fretboardNotesForPreset("naturals");

export function presetForFretboardNotes(
  selection: readonly string[],
): FretboardNotePreset {
  for (const preset of ["naturals", "all"] as const) {
    const candidate = fretboardNotesForPreset(preset);
    if (
      candidate.length === selection.length &&
      candidate.every((note) => selection.includes(note))
    ) {
      return preset;
    }
  }
  return "custom";
}

export function parseFretboardNotes(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return DEFAULT_FRETBOARD_NOTE_SELECTION;
  const requested = new Set(
    value.filter((note): note is string => typeof note === "string"),
  );
  return ALL_FRETBOARD_NOTES.filter(({ note }) => requested.has(note)).map(
    ({ note }) => note,
  );
}

export function isFretboardNoteToPositionsCard(
  note: Pick<NoteRow, "tags">,
): boolean {
  return note.tags.split(/\s+/).includes("direction::note-to-positions");
}

export function includesFretboardNoteCard(
  note: Pick<NoteRow, "fields" | "tags">,
  notes: ReadonlySet<string>,
): boolean {
  return (
    !isFretboardNoteToPositionsCard(note) || notes.has(note.fields[4] ?? "")
  );
}

export function fretboardNoteDeckSetting(
  deckName: string,
): Readonly<{ deckLabel: string }> | null {
  return deckName === FRETBOARD_NOTE_TO_POSITIONS_DECK
    ? { deckLabel: "Note → Positions" }
    : null;
}
