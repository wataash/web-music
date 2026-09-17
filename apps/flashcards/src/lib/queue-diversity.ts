// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { CLEFS, TOP_STAFF_STEP, staffStep, type Clef } from "@web-music/music-staff-core";

import type { NoteRow } from "./db";
import { intervalAnswerNote } from "./interval-pair-selection";
import { pitchClassOf } from "./card-audio";
import { guitarIntervalLevel } from "./guitar-interval-selection";
import { isStaffReadingCard } from "./staff-card";

type Note = Pick<NoteRow, "fields" | "tags">;

// Which cards are reordered against each other: only a card of the same kind
// as the one at the front of the queue can take its place.
export function diversityKind(note: Note): string | null {
  if (isStaffReadingCard(note)) {
    return `staff:${note.tags.split(/\s+/).find((tag) => tag.startsWith("direction::"))}`;
  }
  return ["interval", "identification", "guitar-interval"].includes(note.fields[1]) ? note.fields[1] : null;
}

export function supportsDiversity(note: Note): boolean {
  return diversityKind(note) !== null;
}

export function introductionGroup(note: NoteRow): string {
  if (isStaffReadingCard(note)) return `${note.pkg}:${diversityKind(note)}`;
  return `${note.pkg}:${note.fields[1]}:${note.fields[1] === "guitar-interval" ? guitarIntervalLevel(note) : note.fields[3]}`;
}

// A staff card's place: its clef and how far the note sits from the staff,
// in ledger lines, with the space past a line as a half. Inside the staff the
// offset is null.
type StaffPlace = Readonly<{ clef: Clef; step: number; offset: number | null }>;

function staffPlace(note: Note): StaffPlace | null {
  const tags = note.tags.split(/\s+/);
  const clef = CLEFS.find((candidate) => tags.includes(`clef::${candidate}`));
  if (clef === undefined) return null;
  let step: number;
  try {
    step = staffStep(clef, note.fields[2] ?? "");
  } catch {
    return null;
  }
  const offset = step > TOP_STAFF_STEP ? (step - TOP_STAFF_STEP) / 2 : step < 0 ? step / 2 : null;
  return { clef, step, offset };
}

// Ledger positions a reader tells apart by counting, and so mixes up with
// their mirror below the staff: a note one and a half lines above and one
// and a half below are the same count in the other direction. Not every
// distance is such a group — the first and second ledger lines are learnt
// early and the sixth is hardly asked — so the groups are listed rather
// than derived. The same lists serve every clef.
const STAFF_GROUPS: ReadonlyMap<number, string> = new Map([
  [1.5, "1.5"], [3, "3"], [3.5, "3"], [4, "4"], [4.5, "4.5"], [5, "5"],
]);

// What makes one staff card an easy guess after another: the note next to
// the last one on the same staff, or its mirror in the ledger lines.
function staffSimilarity(note: Note, previous: Note): number {
  const current = staffPlace(note);
  const old = staffPlace(previous);
  if (current === null || old === null || current.clef !== old.clef) return 0;
  const adjacent = Math.abs(current.step - old.step) === 1 ? 8 : 0;
  const group = current.offset !== null && old.offset !== null &&
    STAFF_GROUPS.get(Math.abs(current.offset)) !== undefined &&
    STAFF_GROUPS.get(Math.abs(current.offset)) === STAFF_GROUPS.get(Math.abs(old.offset)) ? 8 : 0;
  return adjacent + group;
}

function features(note: NoteRow): readonly (string | null)[] {
  const f = note.fields;
  if (f[1] === "guitar-interval") {
    return [f[5], f[5], f[2], `${Number(f[3]) - Number(f[2])}:${f[4]}`];
  }
  const root = pitchClassOf(f[2]);
  const target = pitchClassOf(intervalAnswerNote(note));
  const distance = root !== null && target !== null ? (target - root + 12) % 12 : null;
  return [f[1] === "identification" ? (distance === null ? null : `degree:${distance}`) : (target === null ? null : `pitch:${target}`),
    distance === null ? null : `degree:${distance}`, root === null ? null : `pitch:${root}`, null];
}

export function similarity(note: NoteRow, recent: readonly NoteRow[]): number {
  const kind = diversityKind(note);
  const staff = kind?.startsWith("staff:") ?? false;
  const current = staff ? [] : features(note);
  return recent.slice(0, 3).reduce((sum, previous, index) => {
    if (diversityKind(previous) !== kind) return sum;
    const weights = [8, 6, 2, 4];
    const score = staff ? staffSimilarity(note, previous) : features(previous).reduce<number>((value, feature, i) =>
      value + (feature !== null && feature === current[i] ? weights[i] : 0), 0);
    return sum + (3 - index) * (score + (note.guid === previous.guid ? 100 : 0));
  }, 0);
}

export function diverseIndex(notes: readonly NoteRow[], recent: readonly NoteRow[], random = Math.random): number {
  if (notes.length < 2 || recent.length === 0) return 0;
  const scores = notes.map((note) => similarity(note, recent));
  const best = Math.min(...scores);
  const tied = scores.flatMap((score, index) => score === best ? [index] : []);
  return tied[Math.min(tied.length - 1, Math.floor(random() * tied.length))];
}
