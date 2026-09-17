// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The instrument the guitar decks are drawn for. Both guitar packages ship
// for a six-string guitar in standard tuning; for any other instrument the
// app generates the same decks itself, from the same code the packages are
// built with, and imports them in the bundled ones' place. Their cards carry
// their tuning in a field, so the notes in the database say which instrument
// they were drawn for, and a card is sounded on the strings it was drawn on.
//
// Study state is the instrument's: a bass's `r2-s1-0` is a different question
// from a guitar's, so each instrument's notes have their own guids and the
// shape keys carry the tuning. Switching back brings the old progress back.
// The generating and importing is in guitar-deck-sync.ts; this module is what
// the rest of the app reads a tuning with, and db.ts is among the rest.

import { GUITAR_OPEN_STRINGS } from "@web-music/practice-ui/guitar";
import { normalizeTuning, tuningSlug } from "@web-music/practice-ui/tuning";

import type { NoteRow } from "./db";

export type Tuning = readonly number[];

export const DEFAULT_GUITAR_TUNING: Tuning = GUITAR_OPEN_STRINGS;
export const GUITAR_TUNING_KEY = "music-flashcards:guitar-tuning";

// Where each guitar package keeps its tuning: the same field in both, after
// the fields the cards are drawn from.
const TUNING_FIELD = 8;

export function parseGuitarTuning(value: unknown): Tuning {
  return normalizeTuning(value);
}

export function sameTuning(left: Tuning, right: Tuning): boolean {
  return left.length === right.length && left.every((pitch, i) => pitch === right[i]);
}

// The strings a card was drawn for. A note from before the field existed is a
// guitar's.
export function noteTuning(note: Pick<NoteRow, "fields">): Tuning {
  const written = (note.fields[TUNING_FIELD] ?? "").split(" ").filter(Boolean).map(Number);
  return written.length > 0 && written.every(Number.isInteger) ? written : DEFAULT_GUITAR_TUNING;
}

// A setting kept per instrument, such as the shapes the reader turned off by
// hand, is stored under the tuning's own key; standard guitar keeps the key
// the setting had before there were other instruments.
export function tuningStorageKey(base: string, tuning: Tuning): string {
  const slug = tuningSlug(tuning);
  return slug === "" ? base : `${base}:${slug}`;
}
