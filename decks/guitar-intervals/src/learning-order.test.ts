// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { GUITAR_INTERVAL_CARDS } from "./cards";
import { learningOrderGroup } from "./learning-order";

const group = (id: string) => {
  const card = GUITAR_INTERVAL_CARDS.find((card) => card.id === id);
  if (!card) throw new Error(`Missing card ${id}`);
  return learningOrderGroup(card);
};

describe("guitar interval learning priorities", () => {
  it("starts with power-chord fifths and octaves, then major thirds", () => {
    expect(GUITAR_INTERVAL_CARDS.filter((card) => learningOrderGroup(card) === 0)
      .map((card) => card.id).sort()).toEqual([
      "r5-s3-f2", "r5-s4-f2", "r6-s4-f2", "r6-s5-f2",
    ]);
    expect(group("r6-s5-b1")).toBe(1);
    expect(group("r5-s4-b1")).toBe(1);
  });

  it("introduces the B-string correction with the other anchor extensions", () => {
    for (const id of ["r3-s2-f3", "r4-s2-f3", "r3-s1-f3", "r3-s2-0",
      "r6-s1-0", "r1-s6-0"]) expect(group(id)).toBe(2);
    // The uncorrected octave shape is a major seventh, taught later.
    expect(group("r4-s2-f2")).toBe(5);
  });

  it("expands from nearby anchors to other degrees and distant positions", () => {
    expect(group("r4-s6-b2")).toBe(3); // octave below
    expect(group("r6-s5-b2")).toBe(4); // minor third
    expect(group("r6-s5-0")).toBe(4); // fourth
    expect(group("r6-s4-0")).toBe(5); // minor seventh
    expect(group("r6-s6-f2")).toBe(6); // major second
    expect(group("r6-s6-f4")).toBe(7); // same string, outside default window
    expect(group("r6-s3-f2")).toBe(8); // three strings away
    expect(group("r6-s5-f4")).toBe(9); // wider fret offset
  });

  it("assigns all 462 shapes to the ten planned groups", () => {
    const counts = Array<number>(10).fill(0);
    for (const card of GUITAR_INTERVAL_CARDS) counts[learningOrderGroup(card)]++;
    expect(counts).toEqual([4, 2, 10, 21, 29, 28, 70, 12, 82, 204]);
  });
});
