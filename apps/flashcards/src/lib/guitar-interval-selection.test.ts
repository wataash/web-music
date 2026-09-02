// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  DEFAULT_FRET_WINDOW,
  clampFretReach,
  fretWindowCellCount,
  fretWindowVariables,
  guitarIntervalDeckSetting,
  includesGuitarIntervalCard,
  parseFretWindow,
} from "./guitar-interval-selection";

const card = (fretOffset: number) => ({
  fields: ["id", "guitar-interval", "2", "1", String(fretOffset), "M3"],
});

describe("guitar fret window", () => {
  it("keeps a stored window inside the board the deck draws", () => {
    expect(parseFretWindow(null)).toEqual(DEFAULT_FRET_WINDOW);
    expect(parseFretWindow({ left: 0, right: 6 })).toEqual({
      left: 0,
      right: 6,
    });
    expect(parseFretWindow({ left: -2, right: 99 })).toEqual({
      left: 0,
      right: 6,
    });
    expect(parseFretWindow({ left: "wide" })).toEqual(DEFAULT_FRET_WINDOW);
    expect(clampFretReach(2.4)).toBe(2);
  });

  it("asks about every position in the window but the root's own", () => {
    expect(fretWindowCellCount(DEFAULT_FRET_WINDOW)).toBe(41);
    expect(fretWindowCellCount({ left: 0, right: 0 })).toBe(5);
  });

  it("drops the cards the window has cropped away", () => {
    const window = { left: 1, right: 3 };
    expect(includesGuitarIntervalCard(card(0), window)).toBe(true);
    expect(includesGuitarIntervalCard(card(-1), window)).toBe(true);
    expect(includesGuitarIntervalCard(card(-2), window)).toBe(false);
    expect(includesGuitarIntervalCard(card(3), window)).toBe(true);
    expect(includesGuitarIntervalCard(card(4), window)).toBe(false);
    // A card from another deck is not this setting's to exclude.
    expect(
      includesGuitarIntervalCard(
        { fields: ["id", "interval", "C", "m3"] },
        window,
      ),
    ).toBe(true);
  });

  it("hands the window to the card's own CSS", () => {
    expect(fretWindowVariables({ left: 1, right: 4 })).toEqual({
      "--fret-left": "1",
      "--fret-right": "4",
    });
  });

  it("offers its settings on the one deck", () => {
    expect(guitarIntervalDeckSetting("Guitar Intervals")).toEqual({
      deckLabel: "Guitar Intervals",
    });
    expect(guitarIntervalDeckSetting("Guitar Fretboard")).toBeNull();
  });
});
