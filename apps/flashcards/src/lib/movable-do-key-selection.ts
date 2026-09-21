// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { MAJOR_KEYS } from "@web-music/music-staff-core";
import type { NoteRow } from "./db";
import { MOVABLE_DO_STAFF_TO_SOLFEGE_DECK } from "./staff-note-selection";

export const MOVABLE_DO_ROOT = "Music Staff (Movable Do)";
export const DEFAULT_MOVABLE_DO_KEYS: readonly number[] = MAJOR_KEYS.map(({ fifths }) => fifths);

export function parseMovableDoKeys(value: unknown): readonly number[] {
  if (!Array.isArray(value)) return DEFAULT_MOVABLE_DO_KEYS;
  return DEFAULT_MOVABLE_DO_KEYS.filter((fifths) => value.includes(fifths));
}

export function includesMovableDoKeyCard(
  note: Pick<NoteRow, "fields" | "tags">,
  selection: ReadonlySet<number>,
): boolean {
  if (!note.tags.split(/\s+/).includes("mode::major")) return true;
  const fifths = Number(note.fields[3]);
  return Number.isInteger(fifths) && selection.has(fifths);
}

export function isMovableDoDeck(deckName: string): boolean {
  return deckName === MOVABLE_DO_ROOT || deckName.startsWith(`${MOVABLE_DO_ROOT}::`);
}

export function movableDoKeyDeckSetting(deckName: string): Readonly<{ deckLabel: string }> | null {
  if (deckName === MOVABLE_DO_ROOT) return { deckLabel: "Movable Do" };
  if (deckName === MOVABLE_DO_STAFF_TO_SOLFEGE_DECK) return { deckLabel: "Staff → Solfege" };
  return null;
}
