// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  CLEF_RANGES,
  CLEFS,
  diatonicIndex,
  HIGHEST_STAFF_STEP,
  LOWEST_STAFF_STEP,
  formatPitch,
  isOnStaff,
  ledgerSteps,
  naturalPitchesInRange,
  parsePitch,
  keyAtSemitone,
  keyboardKeyPlacement,
  keyboardLabelPlacement,
  keyboardRangeFor,
  keyboardWidthForKeys,
  pitchAtStaffStep,
  pitchSemitone,
  renderKeyboardRangeSvg,
  renderKeyboardSvg,
  renderStaffRowSvg,
  ROW_STAFF_GEOMETRY,
  staffStepY,
  staffStep,
  TOP_STAFF_STEP,
} from "./index";

describe("staff positions", () => {
  it("numbers diatonic steps so middle C is C4", () => {
    expect(diatonicIndex({ note: "C", octave: 4 })).toBe(28);
    expect(diatonicIndex({ note: "B", octave: 3 })).toBe(27);
    expect(formatPitch({ note: "C", octave: 4 })).toBe("C4");
    expect(parsePitch("C4")).toEqual({ note: "C", octave: 4 });
    expect(() => parsePitch("C#4")).toThrow('like "C4"');
  });

  it("covers six ledger lines either side of every clef", () => {
    for (const clef of CLEFS) {
      const pitches = naturalPitchesInRange(clef);
      expect(pitches).toHaveLength(33);
      expect(staffStep(clef, pitches[0])).toBe(LOWEST_STAFF_STEP);
      expect(staffStep(clef, pitches[32])).toBe(HIGHEST_STAFF_STEP);
      expect(ledgerSteps(staffStep(clef, pitches[0]))).toHaveLength(6);
      expect(ledgerSteps(staffStep(clef, pitches[32]))).toHaveLength(6);
    }
    expect(CLEF_RANGES).toEqual({
      treble: { lowest: "G2", highest: "D7" },
      bass: { lowest: "B0", highest: "F5" },
      alto: { lowest: "A1", highest: "E6" },
      tenor: { lowest: "F1", highest: "C6" },
    });
    expect(formatPitch(pitchAtStaffStep("treble", 0))).toBe("E4");
    expect(formatPitch(pitchAtStaffStep("bass", 8))).toBe("A3");
  });

  it("puts middle C where each clef expects it", () => {
    expect(staffStep("treble", "C4")).toBe(-2);
    expect(staffStep("bass", "C4")).toBe(10);
    expect(staffStep("alto", "C4")).toBe(4);
    expect(staffStep("tenor", "C4")).toBe(6);
  });

  it("anchors each clef's bottom line", () => {
    expect(staffStep("treble", "E4")).toBe(0);
    expect(staffStep("bass", "G2")).toBe(0);
    expect(staffStep("alto", "F3")).toBe(0);
    expect(staffStep("tenor", "D3")).toBe(0);
    expect(TOP_STAFF_STEP).toBe(8);
  });

  it("adds ledger lines only outside the staff", () => {
    expect(ledgerSteps(0)).toEqual([]);
    expect(ledgerSteps(8)).toEqual([]);
    expect(ledgerSteps(-1)).toEqual([]);
    expect(ledgerSteps(-2)).toEqual([-2]);
    expect(ledgerSteps(-4)).toEqual([-2, -4]);
    expect(ledgerSteps(11)).toEqual([10]);
    expect(ledgerSteps(12)).toEqual([10, 12]);
    expect(ledgerSteps(20)).toEqual([10, 12, 14, 16, 18, 20]);
    expect(ledgerSteps(-12)).toEqual([-2, -4, -6, -8, -10, -12]);
    expect(isOnStaff(0)).toBe(true);
    expect(isOnStaff(8)).toBe(true);
    expect(isOnStaff(-1)).toBe(false);
    expect(isOnStaff(9)).toBe(false);
  });
});

describe("keyboard diagram", () => {
  it("highlights the key the answer names", () => {
    const svg = renderKeyboardSvg({ pitch: "B4" });

    expect(
      /class="keyboard__white-key is-highlighted" data-note="(\w+)"/.exec(
        svg,
      )?.[1],
    ).toBe("B4");
    // One octave and five black keys.
    expect(svg.match(/data-note=/g)).toHaveLength(7);
    expect(svg.match(/class="keyboard__black-key"/g)).toHaveLength(5);
    // The name is the card's to write, so the drawing holds no text at all.
    expect(svg).not.toContain("<text");
  });

  it("says where the card should write the name", () => {
    const octave = keyboardLabelPlacement({ pitch: "B4", labelLength: 1 });
    const piano = keyboardLabelPlacement({
      pitch: "F4",
      layout: "piano",
      labelLength: 2,
    });
    const lowest = keyboardLabelPlacement({
      pitch: "A0",
      layout: "piano",
      labelLength: 2,
    });

    // On the key it names, low on the keys, and about three keys wide on a
    // piano against one on a single octave.
    expect(octave.x).toBeCloseTo(0.89, 2);
    expect(piano.x).toBeCloseTo(0.51, 2);
    expect(piano.y).toBeCloseTo(0.79, 2);
    expect(piano.size * 780).toBeCloseTo(32.8, 1);
    expect(octave.size * 260).toBeCloseTo(17, 1);
    // Pulled back inside the board at the ends.
    expect(lowest.x).toBeGreaterThan(0.02);
  });

  it("draws the whole 88-key piano when asked where the note is", () => {
    const svg = renderKeyboardSvg({ pitch: "F4", layout: "piano" });
    const keys = [...svg.matchAll(/data-note="(\w+)"/g)].map(([, note]) => note);

    // A0 to C8, with nothing marked on it but the answer.
    expect(keys).toHaveLength(52);
    expect([keys[0], keys.at(-1)]).toEqual(["A0", "C8"]);
    expect(svg).toContain(
      'class="keyboard__white-key is-highlighted" data-note="F4"',
    );
    expect(svg).not.toContain("<text");
  });

  it("draws the same keyboard unmarked for the question side", () => {
    const answer = renderKeyboardSvg({ pitch: "F4", layout: "piano" });
    const question = renderKeyboardSvg({
      pitch: "F4",
      layout: "piano",
      highlighted: false,
    });
    const height = (svg: string) => /height="([\d.]+)"/.exec(svg)?.[1];

    expect(question).not.toContain('class="keyboard__white-key is-highlighted"');
    expect(question).not.toContain("<text");
    // The same board at the same size, so revealing the answer does not move
    // the card around.
    expect(question.match(/data-note=/g)).toHaveLength(52);
    expect(height(question)).toBe(height(answer));
  });

  it("rejects a pitch it cannot place", () => {
    expect(() => renderKeyboardSvg({ pitch: "H4" })).toThrow(RangeError);
  });
});

describe("keys of a keyboard", () => {
  it("finds the key that sounds a semitone", () => {
    expect(pitchSemitone({ note: "C", octave: 4 })).toBe(60);
    expect(keyAtSemitone(60)).toEqual({ index: 28, black: false });
    // C♯4 and D♭4 are the one black key, named after the white key below it.
    expect(keyAtSemitone(61)).toEqual({ index: 28, black: true });
    expect(keyAtSemitone(59)).toEqual({ index: 27, black: false });
  });

  it("cuts the board to the keys it has to show, with one to spare", () => {
    // C4 and E4, so B3 to F4.
    expect(keyboardRangeFor([keyAtSemitone(60), keyAtSemitone(64)])).toEqual({
      firstIndex: 27,
      keyCount: 5,
    });
    // A black key needs both of the white keys it sits between.
    expect(keyboardRangeFor([keyAtSemitone(61)])).toEqual({
      firstIndex: 27,
      keyCount: 4,
    });
    expect(() => keyboardRangeFor([])).toThrow(RangeError);
    // Keys of the same width however many of them there are.
    expect(keyboardWidthForKeys(7)).toBe(260);
    expect(keyboardWidthForKeys(14)).toBe(498);
  });

  it("marks black keys, and says which key was given", () => {
    const range = keyboardRangeFor([keyAtSemitone(60), keyAtSemitone(63)]);
    const svg = renderKeyboardRangeSvg({
      range,
      width: keyboardWidthForKeys(range.keyCount),
      marks: [
        { key: keyAtSemitone(60), tone: "given" },
        { key: keyAtSemitone(63), tone: "answer" },
      ],
    });

    expect(svg).toContain('class="keyboard__white-key is-given" data-note="C4"');
    expect(svg).toContain(
      'class="keyboard__black-key is-highlighted" data-key="D#4"',
    );
    expect(svg).toContain(
      ".keyboard__black-key.is-highlighted{fill:#fcd34d}",
    );
    expect(svg).toContain(".keyboard__black-key.is-given{fill:#8ab4f8}");
    expect(svg).not.toContain("<text");
  });

  it("writes a name on a black key higher than one on a white key", () => {
    const range = keyboardRangeFor([keyAtSemitone(60), keyAtSemitone(63)]);
    const width = keyboardWidthForKeys(range.keyCount);
    const white = keyboardKeyPlacement({
      key: keyAtSemitone(60),
      range,
      width,
      labelLength: 1,
    });
    const black = keyboardKeyPlacement({
      key: keyAtSemitone(63),
      range,
      width,
      labelLength: 2,
    });

    expect(black.y).toBeLessThan(white.y);
    expect(black.x).toBeGreaterThan(white.x);
  });
});

describe("a row of a clef's notes", () => {
  const row = (selected: readonly string[]) =>
    renderStaffRowSvg({
      clef: "treble",
      pitches: ["G2", "A2", "C4", "D7"],
      selected,
    });

  it("gives each note a column of its own, in the order it is passed", () => {
    const svg = row(["C4"]);
    const columns = [...svg.matchAll(/data-pitch="([^"]+)"/g)].map(
      ([, pitch]) => pitch,
    );
    expect(columns).toEqual(["G2", "A2", "C4", "D7"]);
    const xs = [...svg.matchAll(/class="staff__column" x="([\d.]+)"/g)].map(
      ([, x]) => Number(x),
    );
    expect(xs).toEqual([...xs].sort((left, right) => left - right));
  });

  it("says which notes are on, and draws the rest faint", () => {
    const svg = row(["C4"]);
    expect(svg).toContain('data-pitch="C4" data-selected="true"');
    expect(svg).toContain('aria-checked="true" aria-label="C4"');
    expect(svg).toContain('data-pitch="G2" data-selected="false"');
    expect(svg).toMatch(/\[data-selected="false"\][^{]*\{opacity:0\.3\}/);
  });

  it("puts a note where the card puts it, ledger lines and all", () => {
    const svg = row([]);
    // Six ledger lines below for G2 and five for A2, one above for C4 and
    // six for D7: each note carries its own.
    expect(svg.match(/class="staff__ledger-line"/g)).toHaveLength(18);
    const noteY = staffStepY(
      ROW_STAFF_GEOMETRY,
      staffStep("treble", parsePitch("C4")),
    );
    const c4 = svg.slice(svg.indexOf('data-pitch="C4"'));
    const column = c4.slice(0, c4.indexOf("</g>"));
    expect(column).toContain(`y1="${noteY}"`);
    expect(column).toContain(`${noteY} A`);
  });

  it("names every note under its column", () => {
    const svg = row([]);
    for (const pitch of ["G2", "A2", "C4", "D7"]) {
      expect(svg).toContain(`>${pitch}</text>`);
    }
  });
});
