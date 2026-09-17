// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { tuningSlug } from "@web-music/practice-ui/tuning";
import type { CardRow, NoteRow, StateRow } from "./db";
import { DEFAULT_GUITAR_TUNING, noteTuning, type Tuning } from "./guitar-tuning";

type Note = Pick<NoteRow, "fields">;

export const LEARNING_LEVEL_TAG = /(?:^|\s)learning-level::([1-9]|10)(?=\s|$)/;

export function guitarShapeIds(note: Note): readonly string[] {
  if (note.fields[1] !== "guitar-interval") return [];
  const [root, target, offset] = note.fields.slice(2, 5).map(Number);
  return guitarShapeIdsFor(root, target, offset, noteTuning(note));
}

// Keep direction and physical distance: equal answers alone are not a shape.
export function guitarShapeIdsFor(
  root: number,
  target: number,
  offset: number,
  tuning: Tuning = DEFAULT_GUITAR_TUNING,
): readonly string[] {
  const strings = tuning.length;
  if (![root, target, offset].every(Number.isInteger) || root < 1 || root > strings || target < 1 || target > strings) return [];
  const delta = target - root;
  const distance = tuning[target - 1] - tuning[root - 1];
  const suffix = offset === 0 ? "0" : `${offset < 0 ? "b" : "f"}${Math.abs(offset)}`;
  return tuning.flatMap((_, i) => {
    const r = i + 1;
    const s = r + delta;
    return s >= 1 && s <= strings && tuning[s - 1] - tuning[r - 1] === distance
      ? [`r${r}-s${s}-${suffix}`] : [];
  });
}

export function guitarShapeId(note: Note): string {
  return guitarShapeIds(note)[0] ?? note.fields[0];
}

// Another instrument's shape is another key, so its progress is its own;
// standard guitar keeps the key its progress was written under.
export function guitarShapeKey(card: CardRow, note: NoteRow): string {
  if (guitarShapeIds(note).length === 0) return card.key;
  const slug = tuningSlug(noteTuning(note));
  const parts = [card.pkg, note.mid, guitarShapeId(note), card.ord, ...(slug === "" ? [] : [slug])];
  return `guitar-shape:${JSON.stringify(parts)}`;
}

export function normalizeGuitarLevels(notes: readonly NoteRow[]): NoteRow[] {
  const levels = new Map<string, number>();
  const key = (note: NoteRow) => JSON.stringify([note.pkg, note.mid, guitarShapeId(note)]);
  for (const note of notes) {
    if (guitarShapeIds(note).length === 0) continue;
    const level = Number(note.tags.match(LEARNING_LEVEL_TAG)?.[1] ?? 10);
    levels.set(key(note), Math.min(levels.get(key(note)) ?? 10, level));
  }
  return notes.map((note) => guitarShapeIds(note).length === 0 ? note : {
    ...note,
    tags: `${note.tags.replace(/(?:^|\s)learning-level::\d+(?=\s|$)/g, "").trim()} learning-level::${levels.get(key(note))}`.trim(),
  });
}

// The newest schedule wins; retain the first introduction for the daily limit.
// A deterministic tie-break also makes repeated backup imports idempotent.
export function mergeGuitarStates(states: readonly StateRow[], aliases: ReadonlyMap<string, string>): StateRow[] {
  const merged = new Map<string, StateRow>();
  for (const state of states) {
    const key = aliases.get(state.key) ?? state.key;
    const prior = merged.get(key);
    const winner = !prior || state.updatedAt > prior.updatedAt ||
      (state.updatedAt === prior.updatedAt && state.updatedBy > prior.updatedBy) ? state : prior;
    merged.set(key, { ...winner, key, introducedDay: Math.min(prior?.introducedDay ?? state.introducedDay, state.introducedDay) });
  }
  return [...merged.values()];
}
