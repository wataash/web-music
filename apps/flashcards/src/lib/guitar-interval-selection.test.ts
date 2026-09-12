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
  parseGuitarDifficulty,
  parseGuitarOverrides,
  guitarIntervalLevel,
} from "./guitar-interval-selection";

const card = (fretOffset: number) => ({
  fields: ["id", "guitar-interval", "2", "1", String(fretOffset), "M3"],
});

it("persists valid individual choices and keeps the fret window as a boundary", () => {
  const note = { fields: ["r6-s5-f2", "guitar-interval", "6", "5", "2", "P5"], tags: "learning-level::1" };
  expect(includesGuitarIntervalCard(note, DEFAULT_FRET_WINDOW, 1, { "r6-s5-f2": false })).toBe(false);
  expect(includesGuitarIntervalCard({ ...note, tags: "learning-level::10" }, DEFAULT_FRET_WINDOW, 1, { "r6-s5-f2": true })).toBe(true);
  expect(includesGuitarIntervalCard(note, { left: 3, right: 0 }, 1, { "r6-s5-f2": true })).toBe(false);
  expect(parseGuitarOverrides({ "r6-s5-f2": false, "r3-s2-0": true, invalid: true, "r6-s5-b1": "false" })).toEqual({ "r6-s5-f2": false, "r3-s2-0": true });
  expect(parseGuitarOverrides(null)).toEqual({});
});

describe("guitar fret window", () => {
  it("defaults to all levels and sanitizes stored difficulty", () => {
    for (const value of [null, undefined, "1", NaN, Infinity]) {
      expect(parseGuitarDifficulty(value)).toBe(10);
    }
    expect(parseGuitarDifficulty(-1)).toBe(1);
    expect(parseGuitarDifficulty(30)).toBe(10);
    expect(parseGuitarDifficulty(2.6)).toBe(3);
  });

  it("combines cumulative difficulty with the fret window", () => {
    const note = { ...card(2), tags: "degree::P5 learning-level::1 root-string::6" };
    expect(includesGuitarIntervalCard(note, DEFAULT_FRET_WINDOW, 1)).toBe(true);
    expect(includesGuitarIntervalCard(note, { left: 3, right: 1 }, 1)).toBe(false);
    const harder = { ...card(0), tags: "learning-level::3" };
    expect(includesGuitarIntervalCard(harder, DEFAULT_FRET_WINDOW, 2)).toBe(false);
    expect(includesGuitarIntervalCard(harder, DEFAULT_FRET_WINDOW, 3)).toBe(true);
    expect(includesGuitarIntervalCard(harder, DEFAULT_FRET_WINDOW, 10)).toBe(true);
    expect(includesGuitarIntervalCard({ fields: ["id", "interval"], tags: "learning-level::10" }, DEFAULT_FRET_WINDOW, 1)).toBe(true);
  });

  it("keeps old or unknown metadata available only at all levels", () => {
    for (const tags of [undefined, "", "learning-level::0", "learning-level::11", "xlearning-level::1", "learning-level::1x"]) {
      const note = { ...card(0), tags };
      expect(guitarIntervalLevel(note)).toBe(10);
      expect(includesGuitarIntervalCard(note, DEFAULT_FRET_WINDOW, 1)).toBe(false);
      expect(includesGuitarIntervalCard(note, DEFAULT_FRET_WINDOW)).toBe(true);
    }
  });

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
