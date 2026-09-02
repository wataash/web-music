// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  effectiveHiddenDeckNames,
  filterHiddenDecks,
  hideDeck,
  parseHiddenDeckNames,
  showDeck,
} from "./deck-hiding";

const decks = [
  { name: "Music Staff" },
  { name: "Music Staff::Staff → Note" },
  { name: "Music Staff::Staff → Note::Treble Clef" },
  { name: "Music Staff::Staff → Note::Alto Clef" },
  { name: "Intervals" },
];

describe("hidden decks", () => {
  it("starts from the decks their packages ship turned off", () => {
    const shipped = [
      { name: "Music Staff", hiddenByDefault: false },
      { name: "Music Staff::Treble Clef", hiddenByDefault: false },
      { name: "Music Staff::Alto Clef", hiddenByDefault: true },
      { name: "Music Staff (with Octave Numbers)", hiddenByDefault: true },
    ];

    expect(effectiveHiddenDeckNames(null, shipped)).toEqual([
      "Music Staff::Alto Clef",
      "Music Staff (with Octave Numbers)",
    ]);
    // A deck that is only a name over its children goes off with them.
    expect(
      effectiveHiddenDeckNames(null, [
        { name: "Circle", hiddenByDefault: false },
        { name: "Circle::Note → Cell", hiddenByDefault: true },
        { name: "Circle::Note → Cell::Outer", hiddenByDefault: true },
      ]),
    ).toEqual(["Circle", "Circle::Note → Cell", "Circle::Note → Cell::Outer"]);
    // Once the reader has chosen, what they chose is the whole answer.
    expect(effectiveHiddenDeckNames([], shipped)).toEqual([]);
  });

  it("keeps only the names it can use", () => {
    expect(parseHiddenDeckNames(null)).toEqual([]);
    expect(parseHiddenDeckNames(["Intervals", "", 7, "Intervals"])).toEqual([
      "Intervals",
    ]);
  });

  it("hides the decks named, and only those", () => {
    expect(
      filterHiddenDecks(decks, [
        "Music Staff::Staff → Note",
        "Music Staff::Staff → Note::Alto Clef",
      ]).map(({ name }) => name),
    ).toEqual([
      "Music Staff",
      "Music Staff::Staff → Note::Treble Clef",
      "Intervals",
    ]);
    expect(filterHiddenDecks(decks, [])).toBe(decks);
  });

  it("takes the decks under one off with it", () => {
    expect(hideDeck("Music Staff::Staff → Note", ["Intervals"], decks)).toEqual([
      "Music Staff::Staff → Note",
      "Music Staff::Staff → Note::Treble Clef",
      "Music Staff::Staff → Note::Alto Clef",
      "Intervals",
    ]);
  });

  it("brings them back with it", () => {
    const hidden = hideDeck("Music Staff", [], decks);
    expect(showDeck("Music Staff", hidden, decks)).toEqual([]);
  });

  it("turns a deck on with the branch it hangs from, but not its siblings", () => {
    const hidden = hideDeck("Music Staff", [], decks);
    const withTreble = showDeck(
      "Music Staff::Staff → Note::Treble Clef",
      hidden,
      decks,
    );

    expect(withTreble).toEqual(["Music Staff::Staff → Note::Alto Clef"]);
    expect(
      filterHiddenDecks(decks, withTreble).map(({ name }) => name),
    ).toEqual([
      "Music Staff",
      "Music Staff::Staff → Note",
      "Music Staff::Staff → Note::Treble Clef",
      "Intervals",
    ]);
  });
});
