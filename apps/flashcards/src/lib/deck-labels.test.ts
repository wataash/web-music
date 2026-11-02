// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { deckLabel, deckPathLabel } from "./deck-labels";

describe("deckLabel", () => {
  it("tags the decks that are still experiments, and only their own row", () => {
    expect(deckLabel("Music Staff (with Octave Numbers)")).toBe("(Experimental) Music Staff (with Octave Numbers)");
    expect(deckLabel("Music Staff (with Octave Numbers)::Staff → Note")).toBe("Staff → Note");
    expect(deckLabel("Diatonic Chords")).toBe("Diatonic Chords");
    expect(deckLabel("Diatonic Chords::Chord → Notes")).toBe("Chord → Notes");
    expect(deckLabel("Intervals")).toBe("(Experimental) Intervals");
    expect(deckLabel("Interval Identification")).toBe(
      "(Experimental) Interval Identification",
    );
    expect(deckLabel("Music Staff (Movable Do)")).toBe(
      "(Experimental) Music Staff (Movable Do)",
    );
    expect(deckPathLabel("(Experimental) Circle of Fifths::Cell → All Notes")).toBe("Circle of Fifths::(Experimental) Cell → All Notes");
    expect(deckLabel("II–V–I Progressions")).toBe("II–V–I Progressions");
    expect(deckLabel("(Experimental) Circle of Fifths")).toBe("Circle of Fifths");
    expect(deckLabel("(Experimental) Circle of Fifths::Cell → All Notes")).toBe("(Experimental) Cell → All Notes");
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
