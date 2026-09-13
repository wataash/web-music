// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { GUITAR_OPEN_STRINGS } from "@web-music/practice-ui/guitar";
import type { CardRow, NoteRow, StateRow } from "./db";

type Note = Pick<NoteRow, "fields">;

// Keep direction and physical distance: equal answers alone are not a shape.
export function guitarShapeIds(note: Note): readonly string[] {
  if (note.fields[1] !== "guitar-interval") return [];
  const [root, target, offset] = note.fields.slice(2, 5).map(Number);
  if (![root, target, offset].every(Number.isInteger) || root < 1 || root > 6 || target < 1 || target > 6) return [];
  const delta = target - root;
  const distance = GUITAR_OPEN_STRINGS[target - 1] - GUITAR_OPEN_STRINGS[root - 1];
  const suffix = offset === 0 ? "0" : `${offset < 0 ? "b" : "f"}${Math.abs(offset)}`;
  return Array.from({ length: 6 }, (_, i) => i + 1).flatMap((r) => {
    const s = r + delta;
    return s >= 1 && s <= 6 && GUITAR_OPEN_STRINGS[s - 1] - GUITAR_OPEN_STRINGS[r - 1] === distance
      ? [`r${r}-s${s}-${suffix}`] : [];
  });
}

export function guitarShapeId(note: Note): string {
  return guitarShapeIds(note)[0] ?? note.fields[0];
}

export function guitarShapeKey(card: CardRow, note: NoteRow): string {
  return guitarShapeIds(note).length > 0
    ? `guitar-shape:${JSON.stringify([card.pkg, note.mid, guitarShapeId(note), card.ord])}`
    : card.key;
}

export function normalizeGuitarLevels(notes: readonly NoteRow[]): NoteRow[] {
  const levels = new Map<string, number>();
  const key = (note: NoteRow) => JSON.stringify([note.pkg, note.mid, guitarShapeId(note)]);
  for (const note of notes) {
    if (guitarShapeIds(note).length === 0) continue;
    const level = Number(note.tags.match(/(?:^|\s)learning-level::([1-9]|10)(?=\s|$)/)?.[1] ?? 10);
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
