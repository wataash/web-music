// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  DEGREE_NAMES,
  GUITAR_INTERVAL_CARDS,
  MAX_FRET_REACH,
  STRING_COUNT,
  semitonesBetween,
} from "./cards";

const card = (root: number, target: number, offset: number) =>
  GUITAR_INTERVAL_CARDS.find(
    (candidate) =>
      candidate.rootString === root &&
      candidate.targetString === target &&
      candidate.fretOffset === offset,
  );

describe("guitar interval cards", () => {
  it("asks about every reachable cell but the root's own", () => {
    const cells = STRING_COUNT * (MAX_FRET_REACH * 2 + 1);
    expect(GUITAR_INTERVAL_CARDS).toHaveLength(STRING_COUNT * (cells - 1));
    expect(GUITAR_INTERVAL_CARDS).toHaveLength(462);
    expect(new Set(GUITAR_INTERVAL_CARDS.map(({ id }) => id)).size).toBe(
      GUITAR_INTERVAL_CARDS.length,
    );
    expect(card(2, 2, 0)).toBeUndefined();
  });

  it("measures from the root in standard tuning", () => {
    // The example shape: the root on the B string, one fret lower on the E
    // string above it, is a major 3rd.
    expect(card(2, 1, -1)?.names).toEqual(["M3"]);
    // Straight across from the 5th string to the 4th is a 4th.
    expect(card(5, 4, 0)?.names).toEqual(["P4", "11"]);
    // The B string is tuned a 3rd above the G string, not a 4th.
    expect(card(3, 2, 0)?.names).toEqual(["M3"]);
    // Two octaves down the neck on one string is still measured in one.
    expect(card(1, 1, -1)?.names).toEqual(["M7"]);
    expect(card(1, 1, 5)?.names).toEqual(["P4", "11"]);
  });

  it("folds a distance into the octave and names every spelling of it", () => {
    expect(DEGREE_NAMES).toHaveLength(12);
    expect(semitonesBetween(6, 6, 15)).toBe(3);
    expect(DEGREE_NAMES[3]).toEqual(["m3", "♯9"]);
    expect(DEGREE_NAMES[6]).toEqual(["d5", "A4", "♯11"]);
    expect(
      GUITAR_INTERVAL_CARDS.every(
        ({ semitones, names }) => names === DEGREE_NAMES[semitones],
      ),
    ).toBe(true);
  });
});
