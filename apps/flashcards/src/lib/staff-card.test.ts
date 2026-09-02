// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { isStaffReadingCard } from "./staff-card";

describe("staff reading card direction", () => {
  it("identifies both staff reading directions", () => {
    expect(
      isStaffReadingCard({ tags: "clef::treble direction::staff-to-note" }),
    ).toBe(true);
    expect(
      isStaffReadingCard({ tags: " clef::tenor direction::staff-to-note " }),
    ).toBe(true);
    expect(
      isStaffReadingCard({ tags: "clef::bass direction::note-to-staff" }),
    ).toBe(true);
  });

  it("rejects cards from other decks", () => {
    expect(
      isStaffReadingCard({
        tags: "system::naturals direction::position-to-note",
      }),
    ).toBe(false);
    expect(
      isStaffReadingCard({
        tags: "system::naturals direction::note-to-positions",
      }),
    ).toBe(false);
    expect(isStaffReadingCard({ tags: "" })).toBe(false);
    expect(isStaffReadingCard({ tags: "direction::staff-to-note-extra" })).toBe(
      false,
    );
    expect(isStaffReadingCard({ tags: "direction::note-to-staff-extra" })).toBe(
      false,
    );
  });
});
