// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import {
  calcBlockInlayRect,
  calcNormalizedFretPositions,
} from "./fretboard";

describe("fret positions", () => {
  test("uses equal-temperament spacing by default", () => {
    const positions = calcNormalizedFretPositions(24);

    expect(positions).toHaveLength(26);
    expect(positions[0]).toBe(0);
    expect(positions[25]).toBe(1);
    expect(positions[1]).toBeCloseTo(
      (1 - 1 / 2 ** (1 / 12)) / (1 - 1 / 2 ** (25 / 12)),
    );
    expect(positions[1]).toBeGreaterThan(positions[2] - positions[1]);
  });

  test("supports equal-width spacing", () => {
    const positions = calcNormalizedFretPositions(24, "equal-width");

    expect(positions).toHaveLength(26);
    expect(positions[0]).toBe(0);
    expect(positions[1]).toBe(0.04);
    expect(positions[12]).toBe(0.48);
    expect(positions[24]).toBe(0.96);
    expect(positions[25]).toBe(1);
  });
});

describe("block inlay geometry", () => {
  test("uses 70% of the space between the fret-line edges", () => {
    const fretXs = [40, 140, 230, 310];
    const stringYs = [30, 70, 110, 150, 190, 230];

    expect(calcBlockInlayRect(fretXs, stringYs, 1)).toEqual({
      x: 56.75,
      y: 38,
      width: 66.5,
      height: 184,
    });
    expect(calcBlockInlayRect(fretXs, stringYs, 3)).toEqual({
      x: 243.75,
      y: 38,
      width: 52.5,
      height: 184,
    });
  });

  test("keeps the two-string fallback centered at 80% height", () => {
    expect(calcBlockInlayRect([40, 140], [30, 70], 1)).toEqual({
      x: 56.75,
      y: 34,
      width: 66.5,
      height: 32,
    });
  });
});
