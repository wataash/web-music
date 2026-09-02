// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { NoteRow } from "./db";

// Staff reading cards have a single right answer in either direction — name
// the drawn note, or place a named pitch — so tapping the staff can stand in
// for SHOW ANSWER.
const STAFF_READING_TAGS = [
  "direction::staff-to-note",
  "direction::note-to-staff",
];

export function isStaffReadingCard(note: Pick<NoteRow, "tags">): boolean {
  const tags = note.tags.split(/\s+/);
  return STAFF_READING_TAGS.some((tag) => tags.includes(tag));
}

// The deck that asks with octave numbers draws the whole 88-key piano; the
// plain one draws a single octave, which has no key count to choose.
export function isPianoKeyboardCard(note: Pick<NoteRow, "fields">): boolean {
  return (note.fields[9] ?? "").startsWith("piano|");
}
