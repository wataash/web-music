// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { extractIreal } from "@web-music/ireal";
import { extractChordWiki } from "@web-music/chordwiki";

export function extractSource(text, format = "auto") {
  if (format === "auto") format = text.includes("irealb://") ? "ireal" : "chordwiki";
  if (format === "ireal") return extractIreal(text);
  if (format === "chordwiki") return extractChordWiki(text);
  throw new Error(`Unknown format: ${format}`);
}
