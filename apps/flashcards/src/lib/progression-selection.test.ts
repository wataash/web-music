// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { it, expect } from "vitest";
import { includesProgressionCard, progressionDisplayFields } from "./progression-selection";
import { DEFAULT_CHORD_NOTATION } from "./diatonic-selection";
it("filters progression keys independently of other decks and re-renders the chosen spellings", () => {
  const note = { tags: "ii-v-i", fields: ["id", "minor", "0"] };
  expect(includesProgressionCard(note, { majorKeys: [0], minorKeys: [] })).toBe(false);
  expect(includesProgressionCard(note, { majorKeys: [], minorKeys: [0] })).toBe(true);
  expect(includesProgressionCard({ tags: "", fields: [] }, { majorKeys: [], minorKeys: [] })).toBe(true);
  const display = progressionDisplayFields(note, "im7", DEFAULT_CHORD_NOTATION);
  expect(display.Chords).toContain("Bø7");
  expect(display.Chords).not.toContain("B♭");
  expect(display.Degree).toContain("im7");
  expect(display.RelativeDegree).toBe("(viiø7 → III7 → vim7\nin C major)");
  expect(progressionDisplayFields({ ...note, fields: ["id", "minor", "999"] }, "im7", DEFAULT_CHORD_NOTATION)).toEqual({});
});
