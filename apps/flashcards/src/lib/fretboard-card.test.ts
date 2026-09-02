// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { isFretboardNoteToPositionsCard } from "./fretboard-card";

describe("fretboard card direction", () => {
  it("identifies Note to Positions cards", () => {
    expect(
      isFretboardNoteToPositionsCard({
        tags: " system::naturals direction::note-to-positions ",
      }),
    ).toBe(true);
  });

  it("rejects Position to Note cards", () => {
    expect(
      isFretboardNoteToPositionsCard({
        tags: "system::naturals direction::position-to-note",
      }),
    ).toBe(false);
  });
});
