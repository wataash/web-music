// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { noteSemitone } from "./cards";
import { INTERVAL_KEY_COUNTS, intervalKeyboards } from "./keyboard";
import { drawIntervalKeyboard } from "./web-keyboard";

const M3 = { root: "C", answer: "E" } as const;

describe("note names", () => {
  it("counts semitones through the accidentals", () => {
    expect(noteSemitone("C")).toBe(60);
    expect(noteSemitone("Cb")).toBe(59);
    expect(noteSemitone("B#")).toBe(72);
    expect(noteSemitone("Fbb")).toBe(63);
    expect(() => noteSemitone("H")).toThrow(TypeError);
  });
});

describe("the keyboard on an interval card", () => {
  it("draws the same fixed 37-key range on both sides", () => {
    const { front, back } = intervalKeyboards(M3);
    expect(front.svg).toContain('data-first-key="B2"');
    expect(front.svg).toContain('data-last-key="B5"');
    expect(back.svg.match(/viewBox="[^"]+"/)?.[0]).toBe(
      front.svg.match(/viewBox="[^"]+"/)?.[0],
    );
  });

  it("centres every selectable key count between E4 and F4", () => {
    for (const keyCount of INTERVAL_KEY_COUNTS) {
      const { front, back } = intervalKeyboards({ ...M3, keyCount });
      for (const keyboard of [front, back]) {
        expect(keyboard.svg).toContain(`data-key-count="${keyCount}"`);
        expect(keyboard.svg).toContain('data-center-between="E4/F4"');

        const [, x, width] = keyboard.svg.match(
          /viewBox="([\d.]+) 0 ([\d.]+) [\d.]+"/,
        )!;
        const [, eX, eWidth] = keyboard.svg.match(
          /data-note="E4" x="([\d.]+)"[^>]+width="([\d.]+)"/,
        )!;
        expect(Number(eX) + Number(eWidth)).toBeCloseTo(
          Number(x) + Number(width) / 2,
          1,
        );
      }
    }
    expect(() =>
      intervalKeyboards({ ...M3, keyCount: 23 as never }),
    ).toThrow("keyCount must be an odd number from 25 through 37");
  });

  it("puts the given note on the fixed board on the front", () => {
    const { front } = intervalKeyboards(M3);

    expect(front.labels.map(({ text }) => text)).toEqual(["C"]);
    expect(front.svg).toContain(
      'class="keyboard__white-key is-given" data-note="C4"',
    );
    expect(front.svg).not.toMatch(/class="keyboard__\w+-key is-highlighted"/);
  });

  it("puts the answer below and above the given note on the back", () => {
    const { back } = intervalKeyboards({
      root: "G",
      answer: "B",
    });

    expect(back.labels.map(({ text }) => text)).toEqual(["B", "B", "G"]);
    const [below, above, root] = back.labels;
    expect(below.x).toBeLessThan(root.x);
    expect(root.x).toBeLessThan(above.x);
    expect(back.svg).toContain(
      'class="keyboard__white-key is-given" data-note="G4"',
    );
    expect(back.svg).toContain(
      'class="keyboard__white-key is-highlighted" data-note="B3"',
    );
    expect(back.svg).toContain(
      'class="keyboard__white-key is-highlighted" data-note="B4"',
    );
  });

  it("keeps the crop fixed between notes at the 25-key minimum", () => {
    const crop = (svg: string): string => svg.match(/viewBox="([^"]+)"/)![1];
    const keyboards = ["C", "E♭", "B"].map((root) =>
      intervalKeyboards({ root, answer: "D♭", keyCount: 25 }),
    );

    expect(new Set(keyboards.map(({ front }) => crop(front.svg))).size).toBe(1);
    expect(new Set(keyboards.map(({ back }) => crop(back.svg))).size).toBe(1);
    // With a fixed short crop, only answer occurrences inside it are named.
    expect(keyboards[0].back.labels.map(({ text }) => text)).toEqual([
      "D♭",
      "C",
    ]);
  });

  it("shares drawings between cards that sound alike", () => {
    // B♯ is C, and D♯ is E♭ — the same two keys as C→E♭ rather than C→E.
    const sharpened = intervalKeyboards({
      root: "B#",
      answer: "D#",
    });
    const minor = intervalKeyboards({ root: "C", answer: "Eb" });

    expect(sharpened.front.id).toBe(minor.front.id);
    expect(sharpened.front.svg).toBe(minor.front.svg);
    expect(sharpened.back.id).toBe(minor.back.id);
    expect(sharpened.back.svg).toBe(minor.back.svg);
    // Only the drawing is shared; the names on it are each card's own.
    expect(sharpened.back.labels.map(({ text }) => text)).toEqual([
      "D♯",
      "D♯",
      "B♯",
    ]);
  });

  // What the app asks for when the reader has said the front should carry
  // more, or less, than the question names.
  it("leaves the given note off when it is not to be marked", () => {
    const bare = drawIntervalKeyboard("C", null, 37, false);

    expect(bare.labels).toEqual([]);
    expect(bare.svg).not.toMatch(/class="keyboard__\w+-key is-given"/);
    expect(bare.svg).toContain("with no keys marked");
  });

  it("marks the answer on the front, but leaves the naming to the reader", () => {
    const shown = drawIntervalKeyboard("C", "E", 37, true, false);

    expect(shown.labels.map(({ text }) => text)).toEqual(["?", "?", "C"]);
    expect(shown.svg).toContain(
      'class="keyboard__white-key is-given" data-note="C4"',
    );
    expect(shown.svg).toContain(
      'class="keyboard__white-key is-highlighted" data-note="E4"',
    );
    // The back names it, as it always has.
    expect(
      drawIntervalKeyboard("C", "E", 37).labels.map(({ text }) => text),
    ).toEqual(["E", "E", "C"]);
  });

  it("puts names on black keys above names on white keys", () => {
    const { back } = intervalKeyboards({
      root: "C",
      answer: "Eb",
    });

    // E♭ is a black key: shorter, so its name sits above the white keys'.
    expect(back.labels[0].y).toBeLessThan(back.labels[2].y);
  });
});
