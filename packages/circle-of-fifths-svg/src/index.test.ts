// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import {
  createDiagramModel,
  DIAGRAM_STYLES,
  renderCircleOfFifthsSvg,
  renderDarkCircleOfFifthsSvg,
} from "./index";

describe("SVG diagram", () => {
  test("creates twelve sectors and two labels per sector", () => {
    const model = createDiagramModel();

    expect(model.sectors).toHaveLength(12);
    expect(model.sectors.flatMap(({ labels }) => labels)).toHaveLength(24);
  });

  test("aligns note letters independently of accidentals", () => {
    const model = createDiagramModel();
    const label = model.sectors
      .flatMap(({ labels }) => labels)
      .find(({ notes }) => notes.join(" ") === "D## E Fb");

    expect(label?.noteLines.map(({ letter }) => letter)).toEqual(["D", "E", "F"]);
    expect(label?.noteLines.map(({ accidental }) => accidental)).toEqual([
      "𝄪",
      "",
      "♭",
    ]);
  });

  test("uses matching standard label metrics for both rings", () => {
    const model = createDiagramModel();
    const [major, minor] = model.sectors[0].labels;

    expect(major.noteLines.map(({ y }) => y)).toEqual([-38, 0, 38]);
    expect(minor.noteLines.map(({ y }) => y)).toEqual([-38, 0, 38]);
    expect(major.noteLines[0].accidentalX).toBe(13);
    expect(minor.noteLines[0].accidentalX).toBe(13);
  });

  test("renders a self-contained SVG", () => {
    const svg = renderCircleOfFifthsSvg();

    expect(svg).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).not.toMatch(/<foreignObject|<script|<image|(?:href|src)=/i);
    expect(svg.match(/circle-of-fifths__sector/g)).toHaveLength(12);
  });

  test("renders a reusable dark theme", () => {
    const svg = renderDarkCircleOfFifthsSvg({ visibleNotes: ["C"] });

    expect(svg).toContain('fill="#111827"');
    expect(svg).toContain("stroke: #d1d5db");
    expect(svg).toContain("fill: #f3f4f6");
    expect(svg).toContain('data-note="C"');
  });

  test("models treble and bass key signatures outside all twelve sectors", () => {
    const model = createDiagramModel({ showKeySignatures: true });
    const atEight = model.keySignatureGroups.find(({ hour }) => hour === 8);
    const atNine = model.keySignatureGroups.find(({ hour }) => hour === 9);
    const atFive = model.keySignatureGroups.find(({ hour }) => hour === 5);
    const atTwelve = model.keySignatureGroups.find(({ hour }) => hour === 12);

    expect(model.viewBox).toEqual({
      x: -56.5,
      y: -71.5,
      width: 1113,
      height: 1129,
    });
    expect(model.keySignatureGroups).toHaveLength(12);
    expect(model.keySignatureGroups.flatMap(({ staffs }) => staffs)).toHaveLength(
      24,
    );
    for (const group of model.keySignatureGroups) {
      const left = group.x - 150;
      const right = group.x + group.staffs[0].lineEndX;
      const top = group.y - 37;
      const bottom = group.y + 37;
      const dx = Math.max(left - 500, 500 - right, 0);
      const dy = Math.max(top - 500, 500 - bottom, 0);

      expect(Math.hypot(dx, dy)).toBeCloseTo(480);
    }
    expect(atNine?.staffs.map(({ clef }) => clef)).toEqual([
      "treble",
      "bass",
    ]);
    expect(atNine?.staffs.map(({ clefY }) => clefY)).toEqual([12, 18]);
    expect(
      atNine?.staffs[0].signatures.map(
        ({ fifths, accidentals }) => ({
          fifths,
          accidentals: accidentals.length,
        }),
      ),
    ).toEqual([
      { fifths: -3, accidentals: 3 },
    ]);
    expect(
      atTwelve?.staffs[1].signatures.map(
        ({ fifths, accidentals }) => ({
          fifths,
          accidentals: accidentals.length,
        }),
      ),
    ).toEqual([
      { fifths: 0, accidentals: 0 },
    ]);
    expect(atEight?.staffs[0].signatures.map(({ fifths }) => fifths)).toEqual([
      -4,
    ]);
    expect(atEight?.staffs.map(({ lineEndX }) => lineEndX)).toEqual([
      -67,
      -67,
    ]);
    expect(atNine?.staffs.map(({ lineEndX }) => lineEndX)).toEqual([-74, -74]);
    expect(
      atFive?.staffs[1].signatures
        .find(({ fifths }) => fifths === -7)
        ?.accidentals.map(({ y }) => y),
    ).toEqual([-1, -10, 2, -7, 5, -4, 8]);
  });

  test("renders outer key signatures only when requested", () => {
    const plainSvg = renderCircleOfFifthsSvg();
    const signatureSvg = renderCircleOfFifthsSvg({
      showKeySignatures: true,
    });

    expect(createDiagramModel().keySignatureGroups).toEqual([]);
    expect(plainSvg).not.toContain(
      'class="circle-of-fifths__key-signature-group"',
    );
    expect(signatureSvg).toContain(
      'viewBox="-56.5 -71.5 1113 1129" width="1113" height="1129"',
    );
    expect(
      signatureSvg.match(/class="circle-of-fifths__staff"/g),
    ).toHaveLength(24);
    expect(
      signatureSvg.match(/class="circle-of-fifths__staff-line"/g),
    ).toHaveLength(120);
  });

  test("highlights only Basic note rows in light gray", () => {
    const model = createDiagramModel();
    const outerAtTwelve = model.sectors[0].labels[0];
    const svg = renderCircleOfFifthsSvg();

    expect(
      outerAtTwelve.noteLines.map(({ source, basic }) => ({ source, basic })),
    ).toEqual([
      { source: "B#", basic: false },
      { source: "C", basic: true },
      { source: "Dbb", basic: false },
    ]);
    expect(DIAGRAM_STYLES).toContain(
      ".circle-of-fifths__basic-highlight",
    );
    expect(
      svg.match(/class="circle-of-fifths__basic-highlight"/g),
    ).toHaveLength(26);
    expect(svg).toMatch(
      /data-note="C">\s*<rect class="circle-of-fifths__basic-highlight"/,
    );
    expect(svg).not.toMatch(
      /data-note="B#">\s*<rect class="circle-of-fifths__basic-highlight"/,
    );
    expect(svg).not.toMatch(
      /data-note="Dbb">\s*<rect class="circle-of-fifths__basic-highlight"/,
    );
  });

  test("renders an empty circle when visibleNotes is empty", () => {
    const svg = renderCircleOfFifthsSvg({ visibleNotes: [] });

    expect(svg).toContain('class="circle-of-fifths__line"');
    expect(svg).not.toContain('class="circle-of-fifths__note"');
  });

  test("highlights an outer or inner cell without adding labels", () => {
    const svg = renderCircleOfFifthsSvg({
      visibleNotes: [],
      highlightedCells: [
        { hour: 4, ring: "outer" },
        { hour: 1, ring: "inner" },
      ],
    });

    expect(
      svg.match(/class="circle-of-fifths__highlight"/g),
    ).toHaveLength(2);
    expect(svg).toContain('data-hour="4" data-ring="outer"');
    expect(svg).toContain('data-hour="1" data-ring="inner"');
    expect(svg).not.toContain('class="circle-of-fifths__note"');
  });

  test("rejects an invalid or duplicate highlighted cell", () => {
    expect(() =>
      renderCircleOfFifthsSvg({
        highlightedCells: [{ hour: 0, ring: "outer" }],
      }),
    ).toThrow("hour must be an integer from 1 through 12");
    expect(() =>
      renderCircleOfFifthsSvg({
        highlightedCells: [
          { hour: 4, ring: "outer" },
          { hour: 4, ring: "outer" },
        ],
      }),
    ).toThrow("duplicate highlighted cell: outer:4");
  });

  test("renders only the requested notes", () => {
    const model = createDiagramModel({ visibleNotes: ["e", "G"] });
    const visibleNotes = model.sectors.flatMap(({ labels }) =>
      labels.flatMap(({ noteLines }) =>
        noteLines.map(({ source }) => source),
      ),
    );
    const svg = renderCircleOfFifthsSvg({ visibleNotes: ["e", "G"] });

    expect(visibleNotes).toEqual(["G", "e"]);
    expect(svg.match(/class="circle-of-fifths__note"/g)).toHaveLength(2);
    expect(svg).toContain('data-note="e"');
    expect(svg).toContain('data-note="G"');
  });

  test("enlarges labels in the single-note layout", () => {
    const model = createDiagramModel({
      visibleNotes: ["f##", "A#"],
      labelLayout: "single-note",
    });
    const svg = renderCircleOfFifthsSvg({
      visibleNotes: ["f##", "A#"],
      labelLayout: "single-note",
    });
    const noteLines = model.sectors.flatMap(({ labels }) =>
      labels.flatMap(({ noteLines: lines }) => lines),
    );

    expect(svg).toContain("circle-of-fifths--single-note");
    expect(noteLines.every(({ centerWholeNote }) => centerWholeNote)).toBe(true);
    expect(svg).toContain(
      '<text class="circle-of-fifths__spelling" x="0" y="0">A♯</text>',
    );
    expect(svg).toContain(
      '<text class="circle-of-fifths__spelling" x="0" y="0">f𝄪</text>',
    );
  });

  test("rejects multiple notes in one single-note cell", () => {
    expect(() =>
      renderCircleOfFifthsSvg({
        visibleNotes: ["D##", "E"],
        labelLayout: "single-note",
      }),
    ).toThrow("single-note layout cannot display 2 notes in one cell");
  });

  test("rejects invalid note spellings", () => {
    expect(() =>
      renderCircleOfFifthsSvg({ visibleNotes: ["H"] }),
    ).toThrow("invalid note spelling: H");
  });
});
