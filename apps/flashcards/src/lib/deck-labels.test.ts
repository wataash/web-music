// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { deckLabel } from "./deck-labels";

describe("deckLabel", () => {
  it("tags the decks that are still experiments, and only their own row", () => {
    expect(deckLabel("Intervals")).toBe("(Experimental) Intervals");
    expect(deckLabel("Interval Identification")).toBe(
      "(Experimental) Interval Identification",
    );
    expect(deckLabel("Music Staff (Movable Do)")).toBe(
      "(Experimental) Music Staff (Movable Do)",
    );
    // The tag is on the head of the tree, as the circle of fifths carries it in
    // its name; the decks under it are named as they are.
    expect(deckLabel("Music Staff (Movable Do)::Staff → Solfege")).toBe(
      "Staff → Solfege",
    );
  });

  it("names every other deck by its own segment", () => {
    expect(deckLabel("Music Staff")).toBe("Music Staff");
    expect(deckLabel("Music Staff::Staff → Note::Treble Clef")).toBe(
      "Treble Clef",
    );
  });
});
