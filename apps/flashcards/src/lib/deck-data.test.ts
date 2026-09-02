// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { parseDeckDocument, supersededPackages } from "./deck-data";

describe("web deck document", () => {
  it("accepts the current format", () => {
    const deck = {
      models: [],
      decks: [{ did: 1, name: "Test::Hidden", hiddenByDefault: true }],
      notes: [],
      cards: [],
      media: [{ filename: "card.svg", data: "<svg/>" }],
      rootDeckNames: ["Test"],
    };
    expect(
      parseDeckDocument({
        format: "web-music-flashcards-deck",
        version: 1,
        deck,
      }),
    ).toBe(deck);
    expect(deck.decks[0].hiddenByDefault).toBe(true);
  });

  it("rejects unsupported versions", () => {
    expect(() =>
      parseDeckDocument({
        format: "web-music-flashcards-deck",
        version: 2,
        deck: {},
      }),
    ).toThrow("unsupported deck document format");
  });
});

describe("superseded packages", () => {
  it("finds the older key a renamed deck tree is still stored under", () => {
    const decks = [
      { name: "Intervals", pkg: "Intervals|Intervals by Note|Interval Identification" },
      { name: "Intervals::♯11", pkg: "Intervals|Intervals by Note|Interval Identification" },
      { name: "Intervals by Note::C", pkg: "Intervals|Intervals by Note|Interval Identification" },
      { name: "Music Staff", pkg: "Music Staff" },
    ];

    expect(
      supersededPackages(["Intervals", "Interval Identification"], decks),
    ).toEqual(["Intervals|Intervals by Note|Interval Identification"]);
    // A package that owns nothing of ours is left alone, and so is our own key
    // when nothing has been imported yet.
    expect(supersededPackages(["Guitar Fretboard"], decks)).toEqual([]);
    expect(supersededPackages(["Music Staff"], decks)).toEqual(["Music Staff"]);
  });
});
