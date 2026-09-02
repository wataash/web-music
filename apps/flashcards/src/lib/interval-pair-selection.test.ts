// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  ALL_INTERVAL_PAIRS,
  heatLevel,
  DEFAULT_INTERVAL_PAIR_SELECTION,
  includesIntervalPairCard,
  INTERVAL_DEGREE_ROWS,
  INTERVAL_PAIR_CELLS,
  INTERVAL_PAIR_THRESHOLDS,
  INTERVAL_ROOT_ROWS,
  intervalDeckSetting,
  pairsAtLeast,
  parseIntervalPairs,
  thresholdForPairs,
} from "./interval-pair-selection";

describe("interval pair grid", () => {
  it("orders rows and columns by how often Jazz 1460 names them", () => {
    expect(INTERVAL_DEGREE_ROWS.map(({ label }) => label).slice(0, 7)).toEqual([
      "P5", "m7", "M3", "m3", "M7", "M6", "d5",
    ]);
    // The degrees no chord symbol names keep their learning order, last.
    expect(INTERVAL_DEGREE_ROWS.map(({ id }) => id).slice(-2)).toEqual([
      "m2", "A4",
    ]);
    expect(INTERVAL_ROOT_ROWS.map(({ label }) => label).slice(0, 5)).toEqual([
      "C", "G", "F", "D", "B♭",
    ]);
    expect(INTERVAL_ROOT_ROWS.at(-1)?.label).toBe("B𝄪");
    expect(INTERVAL_PAIR_CELLS[0][0]).toEqual({
      key: "C P5",
      root: "C",
      degree: "P5",
      count: 9769,
      available: true,
    });
  });

  it("marks the pairs whose answer would need a triple accidental", () => {
    expect(INTERVAL_PAIR_CELLS.flat()).toHaveLength(35 * 21);
    expect(ALL_INTERVAL_PAIRS).toHaveLength(646);
    const cell = (key: string) =>
      INTERVAL_PAIR_CELLS.flat().find((candidate) => candidate.key === key);
    expect(cell("Cb d7")?.available).toBe(false);
    expect(cell("Cb P5")?.available).toBe(true);
  });

  it("turns on every pair at or above a threshold", () => {
    expect(INTERVAL_PAIR_THRESHOLDS[0]).toBe(0);
    expect(INTERVAL_PAIR_THRESHOLDS.at(-1)).toBe(9769);
    expect(pairsAtLeast(9769)).toEqual(["C P5"]);
    expect(pairsAtLeast(0)).toEqual(ALL_INTERVAL_PAIRS);
    expect(thresholdForPairs(new Set(pairsAtLeast(5000)))).toBe(5095);
    expect(thresholdForPairs(new Set(["C P5", "B𝄪 P5"]))).toBeNull();
  });

  it("shades a cell by the order of magnitude of its count", () => {
    expect(heatLevel(0)).toBe(0);
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(99)).toBe(1);
    expect(heatLevel(100)).toBe(2);
    expect(heatLevel(499)).toBe(2);
    expect(heatLevel(500)).toBe(3);
    expect(heatLevel(1999)).toBe(3);
    expect(heatLevel(2000)).toBe(4);
    expect(heatLevel(9769)).toBe(4);
  });

  it("defaults to every degree above the natural roots", () => {
    expect(DEFAULT_INTERVAL_PAIR_SELECTION).toHaveLength(7 * 21);
    expect(
      DEFAULT_INTERVAL_PAIR_SELECTION.every((key) => key.split(" ")[0].length === 1),
    ).toBe(true);
  });

  it("normalizes stored pairs", () => {
    expect(parseIntervalPairs(null)).toEqual(DEFAULT_INTERVAL_PAIR_SELECTION);
    expect(parseIntervalPairs(["C m3", "nope", 1, "C P5"])).toEqual([
      "C P5", "C m3",
    ]);
  });

  it("filters calculation and identification cards by pair", () => {
    const pairs = new Set(["C m3"]);
    expect(
      includesIntervalPairCard({ fields: ["id", "interval", "C", "m3"] }, pairs),
    ).toBe(true);
    expect(
      includesIntervalPairCard({ fields: ["id", "interval", "C", "M3"] }, pairs),
    ).toBe(false);
    expect(
      includesIntervalPairCard(
        { fields: ["id", "identification", "C", "m3"] },
        pairs,
      ),
    ).toBe(true);
    // A card from another deck is not this setting's to exclude.
    expect(
      includesIntervalPairCard({ fields: ["id", "treble", "C", "m3"] }, pairs),
    ).toBe(true);
  });

  it("offers the grid on both interval decks and nowhere else", () => {
    expect(intervalDeckSetting("Intervals")).toEqual({ deckLabel: "Intervals" });
    expect(intervalDeckSetting("Interval Identification")).toEqual({
      deckLabel: "Interval Identification",
    });
    expect(intervalDeckSetting("Intervals::♯11")).toBeNull();
    expect(intervalDeckSetting("Music Staff")).toBeNull();
  });
});
