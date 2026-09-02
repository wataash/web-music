// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { NoteRow } from "./db";

export function isFretboardNoteToPositionsCard(
  note: Pick<NoteRow, "tags">,
): boolean {
  return note.tags.split(/\s+/).includes("direction::note-to-positions");
}
