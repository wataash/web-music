// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import {
  angleForHour,
  BASIC_NOTES,
  createLabelPlacements,
  DEFAULT_LAYOUT,
  formatNoteName,
  fifthsForMajorNote,
  isBasicNote,
  NOTES_BY_DIFFICULTY,
  pointAtClockAngle,
  POSITIONS,
} from "./index";

describe("circle of fifths data", () => {
  test("contains all twelve positions and both rings", () => {
    expect(POSITIONS).toHaveLength(12);
    expect(createLabelPlacements()).toHaveLength(24);
    expect(new Set(POSITIONS.map(({ hour }) => hour)).size).toBe(12);
  });

  test("matches the note spellings at every clock position", () => {
    expect(POSITIONS).toEqual([
      { hour: 12, major: ["B#", "C", "Dbb"], minor: ["g##", "a", "bbb"] },
      { hour: 1, major: ["F##", "G", "Abb"], minor: ["d##", "e", "fb"] },
      { hour: 2, major: ["C##", "D", "Ebb"], minor: ["a##", "b", "cb"] },
      { hour: 3, major: ["G##", "A", "Bbb"], minor: ["e##", "f#", "gb"] },
      { hour: 4, major: ["D##", "E", "Fb"], minor: ["b##", "c#", "db"] },
      { hour: 5, major: ["A##", "B", "Cb"], minor: ["g#", "ab"] },
      { hour: 6, major: ["E##", "F#", "Gb"], minor: ["d#", "eb", "fbb"] },
      { hour: 7, major: ["B##", "C#", "Db"], minor: ["a#", "bb", "cbb"] },
      { hour: 8, major: ["G#", "Ab"], minor: ["e#", "f", "gbb"] },
      { hour: 9, major: ["D#", "Eb", "Fbb"], minor: ["b#", "c", "dbb"] },
      { hour: 10, major: ["A#", "Bb", "Cbb"], minor: ["f##", "g", "abb"] },
      { hour: 11, major: ["E#", "F", "Gbb"], minor: ["c##", "d", "ebb"] },
    ]);
    expect(POSITIONS.flatMap(({ major }) => major)).toHaveLength(35);
    expect(POSITIONS.flatMap(({ minor }) => minor)).toHaveLength(35);
  });

  test("maps cardinal positions to the circle", () => {
    const { center, majorLabelRadius: radius } = DEFAULT_LAYOUT;

    expect(angleForHour(12)).toBe(0);
    expect(angleForHour(3)).toBe(90);
    expect(pointAtClockAngle(center, radius, 0)).toEqual({
      x: center,
      y: center - radius,
    });
    expect(pointAtClockAngle(center, radius, 180).x).toBeCloseTo(center);
    expect(pointAtClockAngle(center, radius, 180).y).toBeCloseTo(
      center + radius,
    );
  });

  test("gives the inner ring enough radial space for full-size labels", () => {
    const outerRingDepth =
      DEFAULT_LAYOUT.outerRadius - DEFAULT_LAYOUT.dividerRadius;
    const innerRingDepth =
      DEFAULT_LAYOUT.dividerRadius - DEFAULT_LAYOUT.innerRadius;

    expect(innerRingDepth).toBeGreaterThan(outerRingDepth);
    expect(DEFAULT_LAYOUT.minorLabelRadius).toBe(
      (DEFAULT_LAYOUT.dividerRadius + DEFAULT_LAYOUT.innerRadius) / 2,
    );
  });

  test("uses the requested accidental glyphs", () => {
    expect(formatNoteName("F#")).toBe("F♯");
    expect(formatNoteName("Fb")).toBe("F♭");
    expect(formatNoteName("F##")).toBe("F𝄪");
    expect(formatNoteName("Fbb")).toBe("F𝄫");
  });

  test("calculates major-key signature counts from note spellings", () => {
    expect(fifthsForMajorNote("D#")).toBe(9);
    expect(fifthsForMajorNote("Eb")).toBe(-3);
    expect(fifthsForMajorNote("Fbb")).toBe(-15);
    expect(fifthsForMajorNote("B#")).toBe(12);
    expect(fifthsForMajorNote("C")).toBe(0);
    expect(fifthsForMajorNote("Dbb")).toBe(-12);
    expect(() => fifthsForMajorNote("c#")).toThrow(
      "invalid major note spelling: c#",
    );
  });

  test("classifies Basic notes on each ring", () => {
    expect(BASIC_NOTES.major).toHaveLength(13);
    expect(BASIC_NOTES.minor).toHaveLength(13);
    expect(isBasicNote("major", "C")).toBe(true);
    expect(isBasicNote("major", "B#")).toBe(false);
    expect(isBasicNote("minor", "a")).toBe(true);
    expect(isBasicNote("minor", "g##")).toBe(false);
    expect(
      ["Fb", "Cb", "C#", "G#"].every(
        (note) => !isBasicNote("major", note),
      ),
    ).toBe(true);
    expect(
      ["b#", "e#", "a#", "ab", "db"].every(
        (note) => !isBasicNote("minor", note),
      ),
    ).toBe(true);
  });

  test("partitions all notes into ring-specific difficulty sets", () => {
    expect(NOTES_BY_DIFFICULTY.major.advanced).toHaveLength(9);
    expect(NOTES_BY_DIFFICULTY.major.esoteric).toHaveLength(13);
    expect(NOTES_BY_DIFFICULTY.minor.advanced).toHaveLength(13);
    expect(NOTES_BY_DIFFICULTY.minor.esoteric).toHaveLength(9);
    expect(NOTES_BY_DIFFICULTY.major.advanced).toContain("F##");
    expect(NOTES_BY_DIFFICULTY.major.esoteric).toContain("C##");
    expect(NOTES_BY_DIFFICULTY.minor.advanced).toContain("c##");

    for (const role of ["major", "minor"] as const) {
      const notes = Object.values(NOTES_BY_DIFFICULTY[role]).flat();
      expect(notes).toHaveLength(35);
      expect(new Set(notes)).toEqual(
        new Set(POSITIONS.flatMap((position) => position[role])),
      );
    }
  });
});
