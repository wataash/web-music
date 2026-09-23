// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";

// Hand-written remarks live outside the survey, so they are keyed by what a
// song is rather than by where it sits: its position moves whenever the
// playlist or the analyzed limit changes, these fields do not.
export function songIdentity(song) {
  const fields = JSON.stringify([song.title, song.artist, song.originalKey]);
  return `song-${createHash("sha256").update(fields).digest("hex")}`;
}

// A mistyped key is a remark that silently never appears, so every key must
// name a song of the playlist -- including one outside the analyzed limit --
// and every value must be the remark text itself.
export function validateRemarks(value, validIds) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Remarks must be a JSON object mapping a song id to its remark");
  }
  for (const [id, remark] of Object.entries(value)) {
    if (!validIds.has(id)) throw new Error(`Unknown song id in remarks: ${id}`);
    if (typeof remark !== "string") {
      throw new TypeError(`Remark for ${id} must be a string, not ${remark === null ? "null" : typeof remark}`);
    }
  }
  return value;
}
