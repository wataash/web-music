// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  INTERVAL_CARDS,
  INTERVAL_IDENTIFICATION_CARDS,
  INTERVALS,
  ROOT_NOTES,
  difficultyForRoot,
  formatNote,
  noteSlug,
} from "./cards";

function answer(interval: string, root: string): string | undefined {
  return INTERVAL_CARDS.find(
    (card) => card.interval.id === interval && card.root === root,
  )?.answer;
}

describe("interval cards", () => {
  it("lists the simple intervals and tensions by learning priority, without P8", () => {
    expect(INTERVALS.map(({ id }) => id)).toEqual([
      "P5", "M3", "m3", "P4", "M2", "m2", "m7", "M7", "M6",
      "m6", "d7", "d5", "A4", "A5", "9", "13", "11", "b9",
      "#9", "#11", "b13",
    ]);
  });

  it("identifies only intervals determined by note names without octaves", () => {
    expect(
      [...new Set(INTERVAL_IDENTIFICATION_CARDS.map(({ interval }) => interval.id))],
    ).toEqual([
      "P5", "M3", "m3", "P4", "M2", "m2", "m7", "M7", "M6",
      "m6", "d7", "d5", "A4", "A5",
    ]);
    expect(
      new Set(
        INTERVAL_IDENTIFICATION_CARDS.map(
          ({ root, answer }) => `${root} → ${answer}`,
        ),
      ).size,
    ).toBe(INTERVAL_IDENTIFICATION_CARDS.length);
  });

  it("spells intervals rather than collapsing enharmonic answers", () => {
    expect(answer("m3", "C")).toBe("Eb");
    expect(answer("M3", "F")).toBe("A");
    expect(answer("#9", "C")).toBe("D#");
    expect(answer("m3", "C")).not.toBe(answer("#9", "C"));
    expect(answer("A4", "C")).toBe("F#");
    expect(answer("d5", "C")).toBe("Gb");
    expect(answer("#11", "F#")).toBe("B#");
    expect(answer("b13", "F#")).toBe("D");
  });

  it("includes double accidentals but excludes triple accidentals", () => {
    expect(ROOT_NOTES).toHaveLength(35);
    expect(ROOT_NOTES.slice(0, 3)).toEqual(["Fbb", "Cbb", "Gbb"]);
    expect(ROOT_NOTES.at(-1)).toBe("B##");
    expect(answer("M3", "Cbb")).toBe("Ebb");
    expect(answer("m3", "Cbb")).toBeUndefined();
    expect(answer("M3", "C##")).toBe("E##");
    expect(answer("A4", "C##")).toBeUndefined();
    expect(INTERVAL_CARDS.every(({ answer }) => !/bbb|###/.test(answer))).toBe(
      true,
    );
  });

  it("classifies roots by accidental depth", () => {
    expect(difficultyForRoot("C")).toBe("basic");
    expect(difficultyForRoot("Cb")).toBe("advanced");
    expect(difficultyForRoot("C#")).toBe("advanced");
    expect(difficultyForRoot("Cbb")).toBe("esoteric");
    expect(difficultyForRoot("C##")).toBe("esoteric");
  });

  it("formats accidentals as music glyphs", () => {
    expect(["Cb", "C#", "Cbb", "C##"].map(formatNote)).toEqual([
      "C♭", "C♯", "C𝄫", "C𝄪",
    ]);
    expect(noteSlug("Cbb")).toBe("c-double-flat");
    expect(noteSlug("C##")).toBe("c-double-sharp");
  });
});
