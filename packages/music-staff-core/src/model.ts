// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Where a natural note sits on a staff, shared by the deck generator that
// draws it and by the app that lets you pick which notes to study.

export const CLEFS = ["treble", "bass", "alto", "tenor"] as const;

export type Clef = (typeof CLEFS)[number];

export const CLEF_LABELS = {
  treble: "Treble",
  bass: "Bass",
  alto: "Alto",
  tenor: "Tenor",
} as const satisfies Record<Clef, string>;

// Scientific pitch notation: octaves start at C and C4 is middle C.
export const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;

export type NoteLetter = (typeof NOTE_LETTERS)[number];

export type Pitch = Readonly<{ note: NoteLetter; octave: number }>;

export type ClefRange = Readonly<{ lowest: string; highest: string }>;

export const STAFF_LINE_COUNT = 5;

// Staff step 0 is the bottom line, 8 is the top line, and every odd step is a
// space. Steps outside 0-8 need ledger lines.
export const TOP_STAFF_STEP = 2 * (STAFF_LINE_COUNT - 1);

// Every clef reaches six ledger lines either way, so each one covers the same
// span of positions and the same spread of difficulty. A ledger line sits
// every two steps, so six of them is twelve steps past the staff.
export const LEDGER_LINE_REACH = 6;
export const LOWEST_STAFF_STEP = -2 * LEDGER_LINE_REACH;
export const HIGHEST_STAFF_STEP = TOP_STAFF_STEP + 2 * LEDGER_LINE_REACH;

// The pitch each clef fixes, and the staff line carrying it counted from the
// bottom line (1) upwards. Alto and tenor share the C clef but anchor it to a
// different line, which is what moves middle C between them.
export const CLEF_REFERENCES = {
  treble: { line: 2, pitch: "G4" },
  bass: { line: 4, pitch: "F3" },
  alto: { line: 3, pitch: "C4" },
  tenor: { line: 4, pitch: "C4" },
} as const satisfies Record<Clef, Readonly<{ line: number; pitch: string }>>;

export function isClef(value: unknown): value is Clef {
  return CLEFS.includes(value as Clef);
}

export function parsePitch(pitch: string): Pitch {
  const match = /^([A-G])(-?\d+)$/.exec(pitch);
  if (!match) {
    throw new RangeError(
      `pitch must be a natural note with an octave, like "C4": ${pitch}`,
    );
  }
  return { note: match[1] as NoteLetter, octave: Number(match[2]) };
}

export function formatPitch({ note, octave }: Pitch): string {
  return `${note}${octave}`;
}

// Semitones above the C that opens the octave, one per natural note.
export const NATURAL_SEMITONES: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

// How the note sounds rather than where it is written, numbered as MIDI does:
// middle C, C4, is 60.
export function pitchSemitone({ note, octave }: Pitch): number {
  return (octave + 1) * 12 + NATURAL_SEMITONES[NOTE_LETTERS.indexOf(note)];
}

// Counts staff positions rather than semitones, so consecutive indices are
// always one line or space apart.
export function diatonicIndex({ note, octave }: Pitch): number {
  return octave * 7 + NOTE_LETTERS.indexOf(note);
}

export function pitchAtDiatonicIndex(index: number): Pitch {
  const octave = Math.floor(index / 7);
  return { note: NOTE_LETTERS[index - octave * 7], octave };
}

export function pitchAtStaffStep(clef: Clef, step: number): Pitch {
  return pitchAtDiatonicIndex(bottomLineIndex(clef) + step);
}

export function naturalPitchesInRange(clef: Clef): readonly Pitch[] {
  return Array.from(
    { length: HIGHEST_STAFF_STEP - LOWEST_STAFF_STEP + 1 },
    (_, offset) => pitchAtStaffStep(clef, LOWEST_STAFF_STEP + offset),
  );
}

export const CLEF_RANGES = Object.fromEntries(
  CLEFS.map((clef) => [
    clef,
    {
      lowest: formatPitch(pitchAtStaffStep(clef, LOWEST_STAFF_STEP)),
      highest: formatPitch(pitchAtStaffStep(clef, HIGHEST_STAFF_STEP)),
    },
  ]),
) as Readonly<Record<Clef, ClefRange>>;

export function staffStep(clef: Clef, pitch: string | Pitch): number {
  return (
    diatonicIndex(typeof pitch === "string" ? parsePitch(pitch) : pitch) -
    bottomLineIndex(clef)
  );
}

function bottomLineIndex(clef: Clef): number {
  const reference = CLEF_REFERENCES[clef];
  return diatonicIndex(parsePitch(reference.pitch)) - 2 * (reference.line - 1);
}

// Ledger lines only ever land on even steps, and only outside the staff.
export function ledgerSteps(step: number): readonly number[] {
  const steps: number[] = [];
  for (let above = TOP_STAFF_STEP + 2; above <= step; above += 2) {
    steps.push(above);
  }
  for (let below = -2; below >= step; below -= 2) steps.push(below);
  return steps;
}

export function isOnStaff(step: number): boolean {
  return step >= 0 && step <= TOP_STAFF_STEP;
}
