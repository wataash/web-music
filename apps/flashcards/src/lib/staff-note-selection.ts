// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  CARD_STAFF_GEOMETRY,
  CLEF_LABELS,
  CLEFS,
  formatPitch,
  isOnStaff,
  ledgerSteps,
  naturalPitchesInRange,
  parsePitch,
  staffFrame,
  staffStep,
  type Clef,
} from "@web-music/music-staff-core";

import type { NoteRow } from "./db";

export const MUSIC_STAFF_DECK = "Music Staff";
export const OCTAVE_NUMBER_MUSIC_STAFF_DECK =
  "Music Staff (with Octave Numbers)";
export const STAFF_TO_NOTE_DECK = `${MUSIC_STAFF_DECK}::Staff → Note`;
export const OCTAVE_NUMBER_STAFF_TO_NOTE_DECK =
  `${OCTAVE_NUMBER_MUSIC_STAFF_DECK}::Staff → Note`;
export const OCTAVE_NUMBER_NOTE_TO_STAFF_DECK =
  `${OCTAVE_NUMBER_MUSIC_STAFF_DECK}::Note → Staff`;

// How far a note sits from the staff, which is the only thing that makes one
// harder to read than another once accidentals are out of the picture.
export type StaffNoteDifficulty = "basic" | "advanced" | "esoteric";

export type StaffNotePreset = StaffNoteDifficulty | "custom";

export type StaffNoteSelection = Readonly<Record<Clef, readonly string[]>>;

export type StaffNoteDeckSetting = Readonly<{
  clef: Clef;
  deckLabel: string;
}>;

// Basic follows ABRSM Grade 2, which extends the stave to include two ledger
// lines above and below; Grade 3 goes beyond two:
// https://www.abrsm.org/sites/default/files/2024-01/music-theory-syllabus-outline-grades-1-5-from-2020.pdf
// A note in the space immediately past ledger line 2 still needs only two
// ledger lines, so it remains Basic. The split after four is app-specific.
const BASIC_LEDGER_LINES = 2;
const ADVANCED_LEDGER_LINES = 4;

const PRESET_DIFFICULTIES = {
  basic: ["basic"],
  advanced: ["basic", "advanced"],
  esoteric: ["basic", "advanced", "esoteric"],
} as const satisfies Readonly<
  Record<StaffNoteDifficulty, readonly StaffNoteDifficulty[]>
>;

export const STAFF_NOTE_PRESETS = [
  "basic",
  "advanced",
  "esoteric",
] as const satisfies readonly StaffNoteDifficulty[];

export const ALL_STAFF_NOTES: StaffNoteSelection = byClef((clef) =>
  naturalPitchesInRange(clef).map(formatPitch),
);

export function selectionForPreset(
  preset: StaffNoteDifficulty,
): StaffNoteSelection {
  const difficulties: readonly StaffNoteDifficulty[] =
    PRESET_DIFFICULTIES[preset];

  return byClef((clef) =>
    ALL_STAFF_NOTES[clef].filter((pitch) =>
      difficulties.includes(difficultyForStep(staffStep(clef, pitch))),
    ),
  );
}

// Reading starts near the staff. The far ledger lines are there to opt into,
// not to wade through, so a clef begins on Basic.
export const DEFAULT_STAFF_NOTE_SELECTION = selectionForPreset("basic");

export function presetForClefSelection(
  selection: StaffNoteSelection,
  clef: Clef,
): StaffNotePreset {
  for (const preset of STAFF_NOTE_PRESETS) {
    if (samePitches(selection[clef], selectionForPreset(preset)[clef])) {
      return preset;
    }
  }
  return "custom";
}

export function parseStaffNoteSelection(value: unknown): StaffNoteSelection {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_STAFF_NOTE_SELECTION;
  }
  const record = value as Record<string, unknown>;
  if (!CLEFS.every((clef) => Array.isArray(record[clef]))) {
    return DEFAULT_STAFF_NOTE_SELECTION;
  }
  return byClef((clef) =>
    normalizeClefSelection(clef, record[clef] as unknown[]),
  );
}

export function includesStaffNoteCard(
  note: Pick<NoteRow, "fields" | "tags">,
  selection: StaffNoteSelection,
): boolean {
  const staffNote = staffNoteFromNote(note);
  return (
    staffNote === null ||
    selection[staffNote.clef].includes(staffNote.pitch)
  );
}

// Every staff deck drills the same positions, so one selection covers the
// regular reading deck and both octave-number directions alike.
export function staffNoteDeckSetting(
  deckName: string,
): StaffNoteDeckSetting | null {
  for (const parent of [
    STAFF_TO_NOTE_DECK,
    OCTAVE_NUMBER_STAFF_TO_NOTE_DECK,
    OCTAVE_NUMBER_NOTE_TO_STAFF_DECK,
  ]) {
    if (!deckName.startsWith(`${parent}::`)) continue;
    const leaf = deckName.slice(parent.length + 2);
    const clef = CLEFS.find(
      (candidate) => leaf === `${CLEF_LABELS[candidate]} Clef`,
    );
    if (clef) return { clef, deckLabel: `${CLEF_LABELS[clef]} Clef` };
  }
  return null;
}

function byClef(
  build: (clef: Clef) => readonly string[],
): StaffNoteSelection {
  const selection = {} as Record<Clef, readonly string[]>;
  for (const clef of CLEFS) selection[clef] = build(clef);
  return selection;
}

// Deck media frames a staff for every note its clef can carry, which is more
// sky and cellar than a reader who studies two ledger lines ever needs. The
// card crops the image to the notes that can actually come up: `--staff-crop`
// is the aspect ratio of the part worth showing and `--staff-focus` says where
// in the image that part sits.
export function staffCardVariables(
  note: Pick<NoteRow, "fields" | "tags">,
  selection: StaffNoteSelection,
): Readonly<Record<string, string>> {
  const staffNote = staffNoteFromNote(note);
  if (staffNote === null) return {};
  const steps = selection[staffNote.clef].map((pitch) =>
    staffStep(staffNote.clef, parsePitch(pitch)),
  );
  if (steps.length === 0) return {};
  const full = staffFrame(staffNote.clef);
  const crop = staffFrame(staffNote.clef, steps);
  const slack = full.height - crop.height;
  return {
    "--staff-crop": `${CARD_STAFF_GEOMETRY.width} / ${crop.height}`,
    "--staff-focus":
      slack <= 0 ? "50%" : `${round((crop.top - full.top) / slack * 100)}%`,
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function staffNoteFromNote(
  note: Pick<NoteRow, "fields" | "tags">,
): Readonly<{ clef: Clef; pitch: string }> | null {
  const tags = note.tags.split(/\s+/);
  const clef = CLEFS.find((candidate) => tags.includes(`clef::${candidate}`));
  if (clef === undefined) return null;
  const pitch = note.fields[2] ?? "";
  return ALL_STAFF_NOTES[clef].includes(pitch) ? { clef, pitch } : null;
}

function difficultyForStep(step: number): StaffNoteDifficulty {
  const ledgers = ledgerSteps(step).length;
  if (ledgers <= BASIC_LEDGER_LINES) return "basic";
  return ledgers <= ADVANCED_LEDGER_LINES ? "advanced" : "esoteric";
}


function normalizeClefSelection(
  clef: Clef,
  pitches: readonly unknown[],
): readonly string[] {
  const requested = new Set(
    pitches.filter((pitch): pitch is string => typeof pitch === "string"),
  );
  return ALL_STAFF_NOTES[clef].filter((pitch) => requested.has(pitch));
}

function samePitches(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((pitch) => right.includes(pitch))
  );
}
