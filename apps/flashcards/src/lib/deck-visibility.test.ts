// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { compareDeckNames } from "./deck-visibility";

describe("deck ordering", () => {
  it("puts the experimental circle deck below the other top-level decks", () => {
    const names = [
      "Guitar Fretboard",
      "Intervals",
      "Interval Identification",
      "Music Staff (with Octave Numbers)::Staff → Note",
      "(Experimental) Circle of Fifths::Note → Cell",
      "Music Staff::Staff → Note",
      "(Experimental) Circle of Fifths",
      "Music Staff",
    ];

    expect(
      names.sort((left, right) =>
        compareDeckNames(left, right),
      ),
    ).toEqual([
      "Music Staff",
      "Music Staff::Staff → Note",
      "Music Staff (with Octave Numbers)::Staff → Note",
      "Intervals",
      "Interval Identification",
      "Guitar Fretboard",
      "(Experimental) Circle of Fifths",
      "(Experimental) Circle of Fifths::Note → Cell",
    ]);
  });

  it("lists staff reading by direction, then in clef reading order", () => {
    const names = [
      "Music Staff::Staff → Note::Alto Clef",
      "Music Staff",
      "Music Staff::Staff → Note::Bass Clef",
      "Music Staff::Staff → Note::Treble Clef",
      "Music Staff::Staff → Note::Tenor Clef",
      "Music Staff::Staff → Note",
    ];

    expect(
      names.sort((left, right) => compareDeckNames(left, right)),
    ).toEqual([
      "Music Staff",
      "Music Staff::Staff → Note",
      "Music Staff::Staff → Note::Treble Clef",
      "Music Staff::Staff → Note::Bass Clef",
      "Music Staff::Staff → Note::Alto Clef",
      "Music Staff::Staff → Note::Tenor Clef",
    ]);
  });

  it("uses the same order for the octave-number staff deck", () => {
    const root = "Music Staff (with Octave Numbers)";
    const names = [
      `${root}::Note → Staff::Tenor Clef`,
      `${root}::Staff → Note::Bass Clef`,
      `${root}::Note → Staff`,
      root,
      `${root}::Staff → Note::Treble Clef`,
      `${root}::Staff → Note`,
    ];
    expect(names.sort(compareDeckNames)).toEqual([
      root,
      `${root}::Staff → Note`,
      `${root}::Staff → Note::Treble Clef`,
      `${root}::Staff → Note::Bass Clef`,
      `${root}::Note → Staff`,
      `${root}::Note → Staff::Tenor Clef`,
    ]);
  });

  it("uses the learning order for Circle of Fifths decks", () => {
    const names = [
      "(Experimental) Circle of Fifths::(Experimental) Intervals::Δ3",
      "(Experimental) Circle of Fifths::Note → Cell::Note → Inner (Minor) Cell",
      "(Experimental) Circle of Fifths::Cell → All Notes::Inner (Minor) Cell → Notes",
      "(Experimental) Circle of Fifths::(Experimental) Intervals",
      "(Experimental) Circle of Fifths::Note → Cell",
      "(Experimental) Circle of Fifths::Cell → All Notes::Outer (Major) Cell → Notes",
      "(Experimental) Circle of Fifths::Note → Cell::Note → Outer (Major) Cell",
      "(Experimental) Circle of Fifths::(Experimental) Intervals::♭3",
      "(Experimental) Circle of Fifths::Cell → All Notes",
      "(Experimental) Circle of Fifths",
    ];
    expect(names.sort(compareDeckNames)).toEqual([
      "(Experimental) Circle of Fifths",
      "(Experimental) Circle of Fifths::Note → Cell",
      "(Experimental) Circle of Fifths::Note → Cell::Note → Outer (Major) Cell",
      "(Experimental) Circle of Fifths::Note → Cell::Note → Inner (Minor) Cell",
      "(Experimental) Circle of Fifths::Cell → All Notes",
      "(Experimental) Circle of Fifths::Cell → All Notes::Outer (Major) Cell → Notes",
      "(Experimental) Circle of Fifths::Cell → All Notes::Inner (Minor) Cell → Notes",
      "(Experimental) Circle of Fifths::(Experimental) Intervals",
      "(Experimental) Circle of Fifths::(Experimental) Intervals::♭3",
      "(Experimental) Circle of Fifths::(Experimental) Intervals::Δ3",
    ]);
  });
});
