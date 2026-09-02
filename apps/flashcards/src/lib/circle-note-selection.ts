// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  FLAT_THIRD_PAIRS,
  fifthsForMajorNote,
  formatNoteName,
  MAJOR_THIRD_PAIRS,
  NOTES_BY_DIFFICULTY,
  POSITIONS,
  type NoteDifficulty,
} from "@circle-of-fifths/core";

import type { NoteRow } from "./db";

export const CIRCLE_NOTE_TO_CELL_DECK =
  "(Experimental) Circle of Fifths::Note → Cell";
export const CIRCLE_INTERVALS_DECK =
  "(Experimental) Circle of Fifths::(Experimental) Intervals";

export type CircleRing = "outer" | "inner";
export type CircleNoteSettingsScope = "note-to-cell" | "intervals";
export type CircleNoteTableKind = "notes" | "flat3" | "major3";
export type CircleNoteDeckSetting = Readonly<{
  scope: CircleNoteSettingsScope;
  ring: CircleRing;
  deckLabel: string;
  tableKind: CircleNoteTableKind;
}>;
export type CircleNotePreset = "basic" | "advanced" | "all" | "custom";
export type CircleNoteTableRow = Readonly<{
  note: string;
  noteLabel: string;
  fifthsFromTonic: number;
  difficulty: NoteDifficulty;
}>;
export type CircleNoteSelection = Readonly<
  Record<CircleRing, readonly string[]>
>;
export type CircleNoteSelections = Readonly<{
  noteToCell: CircleNoteSelection;
  intervals: CircleNoteSelection;
}>;

const ROLE_BY_RING = { outer: "major", inner: "minor" } as const;
const RINGS = ["outer", "inner"] as const;
const DIFFICULTIES = ["basic", "advanced", "esoteric"] as const;
const PRESET_DIFFICULTIES = {
  basic: ["basic"],
  advanced: ["basic", "advanced"],
  all: ["basic", "advanced", "esoteric"],
} as const satisfies Readonly<
  Record<Exclude<CircleNotePreset, "custom">, readonly NoteDifficulty[]>
>;

export const ALL_CIRCLE_NOTES: CircleNoteSelection = {
  outer: sortedNotes("outer"),
  inner: sortedNotes("inner"),
};

export const DEFAULT_CIRCLE_NOTE_SELECTION = selectionForPreset("basic");

export function circleNoteTableRows(
  ring: CircleRing,
  tableKind: CircleNoteTableKind = "notes",
): readonly CircleNoteTableRow[] {
  const role = ROLE_BY_RING[ring];
  const tonicFifths = ring === "outer" ? 0 : fifthsForMajorNote("A");
  const intervalAnswers = new Map<string, string>(
    tableKind === "flat3"
      ? FLAT_THIRD_PAIRS
      : tableKind === "major3"
        ? MAJOR_THIRD_PAIRS
        : [],
  );
  const notes =
    tableKind === "notes"
      ? ALL_CIRCLE_NOTES[ring]
      : ALL_CIRCLE_NOTES[ring].filter((note) => intervalAnswers.has(note));
  return notes.map((note) => {
    const difficulty = DIFFICULTIES.find((candidate) =>
      (NOTES_BY_DIFFICULTY[role][candidate] as readonly string[]).includes(
        note,
      ),
    );
    if (difficulty === undefined) {
      throw new Error(`Missing ${role} difficulty for ${note}`);
    }
    return {
      note,
      noteLabel: noteTableLabel(note, intervalAnswers.get(note), tableKind),
      fifthsFromTonic: fifthsForMajorNote(asMajorNote(note)) - tonicFifths,
      difficulty,
    };
  });
}

export function selectionForPreset(
  preset: Exclude<CircleNotePreset, "custom">,
): CircleNoteSelection {
  return {
    outer: notesForPreset("outer", preset),
    inner: notesForPreset("inner", preset),
  };
}

export function presetForSelection(
  selection: CircleNoteSelection,
): CircleNotePreset {
  for (const preset of ["basic", "advanced", "all"] as const) {
    if (sameSelection(selection, selectionForPreset(preset))) return preset;
  }
  return "custom";
}

export function presetForRingSelection(
  selection: CircleNoteSelection,
  ring: CircleRing,
): CircleNotePreset {
  for (const preset of ["basic", "advanced", "all"] as const) {
    if (sameNotes(selection[ring], selectionForPreset(preset)[ring])) {
      return preset;
    }
  }
  return "custom";
}

export function parseCircleNoteSelection(value: unknown): CircleNoteSelection {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_CIRCLE_NOTE_SELECTION;
  }
  const record = value as Record<string, unknown>;
  if (!RINGS.every((ring) => Array.isArray(record[ring]))) {
    return DEFAULT_CIRCLE_NOTE_SELECTION;
  }
  return {
    outer: normalizeRingSelection("outer", record.outer as unknown[]),
    inner: normalizeRingSelection("inner", record.inner as unknown[]),
  };
}

export function includesCircleNoteCard(
  note: Pick<NoteRow, "fields" | "tags">,
  selections: CircleNoteSelections,
): boolean {
  const noteToCell = circleNoteToCellFromNote(note);
  if (noteToCell !== null) {
    return selections.noteToCell[noteToCell.ring].includes(noteToCell.note);
  }
  const interval = circleIntervalFromNote(note);
  return (
    interval === null ||
    selections.intervals[interval.ring].includes(interval.note)
  );
}

export function isCircleNoteToCellCard(
  note: Pick<NoteRow, "fields" | "tags">,
): boolean {
  return circleNoteToCellFromNote(note) !== null;
}

export function isCircleIntervalCard(
  note: Pick<NoteRow, "fields" | "tags">,
): boolean {
  return circleIntervalFromNote(note) !== null;
}

export function circleNoteDeckSetting(
  deckName: string,
): CircleNoteDeckSetting | null {
  if (deckName.startsWith(`${CIRCLE_NOTE_TO_CELL_DECK}::`)) {
    if (deckName.includes("Outer (Major)")) {
      return {
        scope: "note-to-cell",
        ring: "outer",
        deckLabel: "major Note → Cell",
        tableKind: "notes",
      };
    }
    if (deckName.includes("Inner (Minor)")) {
      return {
        scope: "note-to-cell",
        ring: "inner",
        deckLabel: "minor Note → Cell",
        tableKind: "notes",
      };
    }
  }
  if (deckName === `${CIRCLE_INTERVALS_DECK}::♭3`) {
    return {
      scope: "intervals",
      ring: "inner",
      deckLabel: "♭3",
      tableKind: "flat3",
    };
  }
  if (deckName === `${CIRCLE_INTERVALS_DECK}::Δ3`) {
    return {
      scope: "intervals",
      ring: "outer",
      deckLabel: "Δ3",
      tableKind: "major3",
    };
  }
  return null;
}

function sortedNotes(ring: CircleRing): readonly string[] {
  const role = ROLE_BY_RING[ring];
  return [...new Set(POSITIONS.flatMap((position) => position[role]))].sort(
    (left, right) =>
      fifthsForMajorNote(asMajorNote(left)) -
      fifthsForMajorNote(asMajorNote(right)),
  );
}

function noteTableLabel(
  questionNote: string,
  answerNote: string | undefined,
  tableKind: CircleNoteTableKind,
): string {
  if (answerNote === undefined) return formatNoteName(questionNote);
  const question = formatNoteName(questionNote);
  const answer = formatNoteName(answerNote);
  const cardName =
    tableKind === "flat3"
      ? `${formatNoteName(asMajorNote(questionNote))}m`
      : question;
  return `${cardName} (${question} → ${answer})`;
}

function notesForPreset(
  ring: CircleRing,
  preset: Exclude<CircleNotePreset, "custom">,
): readonly string[] {
  const role = ROLE_BY_RING[ring];
  const selected = new Set<string>(
    PRESET_DIFFICULTIES[preset].flatMap(
      (difficulty) => NOTES_BY_DIFFICULTY[role][difficulty],
    ),
  );
  return ALL_CIRCLE_NOTES[ring].filter((note) => selected.has(note));
}

function normalizeRingSelection(
  ring: CircleRing,
  notes: readonly unknown[],
): readonly string[] {
  const requested = new Set(
    notes.filter((note): note is string => typeof note === "string"),
  );
  return ALL_CIRCLE_NOTES[ring].filter((note) => requested.has(note));
}

function asMajorNote(note: string): string {
  return note[0].toUpperCase() + note.slice(1);
}

function sameSelection(
  left: CircleNoteSelection,
  right: CircleNoteSelection,
): boolean {
  return RINGS.every(
    (ring) =>
      left[ring].length === right[ring].length &&
      left[ring].every((note) => right[ring].includes(note)),
  );
}

function sameNotes(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((note) => right.includes(note))
  );
}

function circleNoteToCellFromNote(
  note: Pick<NoteRow, "fields" | "tags">,
): Readonly<{ ring: CircleRing; note: string }> | null {
  const ring = (["outer", "inner"] as const).find((candidate) =>
    note.tags.split(/\s+/).includes(`note-to-cell::${candidate}`),
  );
  if (!ring) return null;
  const displayedNote = note.fields[2] ?? "";
  const match = /^([A-Ga-g])(♭|𝄫|♯|𝄪)?$/.exec(displayedNote);
  if (!match) return null;
  const accidental = asciiAccidental(match[2] ?? "");
  if (accidental === undefined) return null;
  return { ring, note: match[1] + accidental };
}

function circleIntervalFromNote(
  note: Pick<NoteRow, "fields" | "tags">,
): Readonly<{ ring: CircleRing; note: string }> | null {
  const tags = note.tags.split(/\s+/);
  const ring = tags.includes("interval::flat3")
    ? "inner"
    : tags.includes("interval::major3")
      ? "outer"
      : null;
  if (ring === null) return null;
  const match = /^([A-G])(♭|𝄫|♯|𝄪)? (♭3|Δ3)$/.exec(
    note.fields[2] ?? "",
  );
  if (!match) return null;
  if (
    (ring === "inner" && match[3] !== "♭3") ||
    (ring === "outer" && match[3] !== "Δ3")
  ) {
    return null;
  }
  const accidental = asciiAccidental(match[2] ?? "");
  if (accidental === undefined) return null;
  const letter = ring === "inner" ? match[1].toLowerCase() : match[1];
  return { ring, note: letter + accidental };
}

function asciiAccidental(symbol: string): string | undefined {
  return {
    "": "",
    "♭": "b",
    "𝄫": "bb",
    "♯": "#",
    "𝄪": "##",
  }[symbol];
}
