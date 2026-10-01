// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_LAYOUT } from "@circle-of-fifths/core";
import { keySignatureAdvance, renderKeySignatureGlyph } from "@web-music/music-staff-core";
import { renderStaffMusicGlyph, staffMusicGlyphBounds } from "@web-music/music-notation";
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

    const ys = major.noteLines.map(({ y }) => y);
    expect(minor.noteLines.map(({ y }) => y)).toEqual(ys);
    expect(ys[1] - ys[0]).toBeGreaterThan(0);
    expect(ys[2] - ys[1]).toBe(ys[1] - ys[0]);
    expect(major.noteLines[0].accidentalX).toBeGreaterThan(0);
    expect(minor.noteLines[0].accidentalX).toBe(major.noteLines[0].accidentalX);
  });

  test("renders a self-contained SVG", () => {
    const svg = renderCircleOfFifthsSvg();

    expect(svg).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).not.toMatch(/<foreignObject|<script|<image|(?:href|src)=/i);
    expect(svg.match(/circle-of-fifths__sector/g)).toHaveLength(12);
  });

  test("draws accidentals with shared paths and keeps the source text", () => {
    const svg = renderCircleOfFifthsSvg({ visibleNotes: ["F#", "Gb", "f##"] });

    expect(svg).toContain('class="glyph sharp"');
    expect(svg).toContain('d="M288 283');
    expect(svg.match(/class="glyph [^"]+"/g)).toHaveLength(3);
    expect(svg.match(/data-music-glyph-enhanced=""/g)).toHaveLength(3);
    expect(svg).toMatch(/class="circle-of-fifths__accidental"[^>]*>♯<\/text>/);
    expect(svg).toMatch(/class="circle-of-fifths__accidental"[^>]*>♭<\/text>/);
    expect(svg).toContain('class="circle-of-fifths__accidental" x="13"');
    expect(svg).toContain('>𝄪</text>');
  });

  test.each(["paths", "text"] as const)("uses the shared key signature glyphs in %s mode", (glyphs) => {
    const model = createDiagramModel({ showKeySignatures: true });
    const svg = renderCircleOfFifthsSvg({ visibleNotes: [], showKeySignatures: true, glyphs });
    const signatures = model.keySignatureGroups.flatMap(({ staffs }) =>
      staffs.flatMap(({ signatures }) => signatures),
    );
    const accidentalCount = signatures.reduce((count, signature) => count + signature.accidentals.length, 0);
    const sharp = signatures.find(({ symbol }) => symbol === "♯")!;
    const flat = signatures.find(({ symbol }) => symbol === "♭")!;

    expect(svg.match(/class="glyph (?:sharp|flat)"/g)).toHaveLength(accidentalCount);
    expect(svg.match(/data-music-glyph="[♯♭]"/g)).toHaveLength(accidentalCount);
    expect(svg).toContain(renderKeySignatureGlyph("♯", sharp.accidentals[0].x, sharp.accidentals[0].y, 6));
    expect(svg).toContain(renderKeySignatureGlyph("♭", flat.accidentals[0].x, flat.accidentals[0].y, 6));
    expect(svg).not.toContain("circle-of-fifths__key-accidental");
    expect(svg).not.toContain("<script");
  });

  test("uses upright engraved flats in standard and single-note SVGs", () => {
    const standardSvg = renderCircleOfFifthsSvg({
      visibleNotes: ["Ab", "ab"],
      showKeySignatures: true,
    });
    const singleNoteSvg = renderCircleOfFifthsSvg({
      visibleNotes: ["Ab", "ab"],
      labelLayout: "single-note",
    });

    expect(standardSvg).toContain('d="M288 283');
    expect(standardSvg).not.toContain('d="M3.3 1L2.2 15"');
    expect(singleNoteSvg).toContain('d="M288 283');
    expect(singleNoteSvg).toMatch(/>A<tspan[^>]*>♭<\/tspan><\/text>/);
    expect(singleNoteSvg).toMatch(/>a<tspan[^>]*>♭<\/tspan><\/text>/);
  });

  test("keeps note-label text in browser-enhanced diagrams", () => {
    const svg = renderCircleOfFifthsSvg({
      visibleNotes: ["F#", "Gb"],
      showKeySignatures: true,
      glyphs: "text",
    });

    expect(svg).toContain('<text class="circle-of-fifths__accidental" x="13"');
    expect(svg).toContain('class="glyph sharp"');
    expect(svg).toContain('class="glyph flat"');
    expect(svg).not.toContain('class="circle-of-fifths__accidental" data-music-glyph');
    expect(svg).not.toContain("<script");
  });

  test.each(["paths", "text"] as const)("uses shared clef shapes in %s mode", (glyphs) => {
    const svg = renderCircleOfFifthsSvg({ visibleNotes: [], showKeySignatures: true, glyphs });

    expect(svg.match(/class="circle-of-fifths__clef"/g)).toHaveLength(24);
    expect(svg).toContain(renderStaffMusicGlyph("𝄞", -136, 6, 6));
    expect(svg).toContain(renderStaffMusicGlyph("𝄢", -136, -6, 6));
    expect(svg).not.toMatch(/<text[^>]*>[𝄞𝄢]<\/text>/u);
  });

  test("keeps shared clef outlines inside the outer viewBox", () => {
    const model = createDiagramModel({ showKeySignatures: true });

    for (const group of model.keySignatureGroups) {
      for (const staff of group.staffs) {
        const bounds = staffMusicGlyphBounds(staff.clefGlyph, 6);
        const pitchY = staff.clef === "bass" ? -6 : 6;
        expect(group.x - 136 - bounds.width / 2).toBeGreaterThanOrEqual(model.viewBox.x);
        expect(group.x - 136 + bounds.width / 2).toBeLessThanOrEqual(model.viewBox.x + model.viewBox.width);
        expect(group.y + staff.y + pitchY + bounds.top).toBeGreaterThanOrEqual(model.viewBox.y);
        expect(group.y + staff.y + pitchY + bounds.bottom).toBeLessThanOrEqual(model.viewBox.y + model.viewBox.height);
      }
    }
  });

  test("renders a reusable dark theme", () => {
    const svg = renderDarkCircleOfFifthsSvg({ visibleNotes: ["C"], showKeySignatures: true });

    expect(svg).toContain('fill="#111827"');
    expect(svg).toContain("stroke: #d1d5db");
    expect(svg).toContain("fill: #f3f4f6");
    expect(svg).toContain('data-note="C"');
    expect(svg).toContain('.circle-of-fifths__key-signature {\n    fill: #f3f4f6;\n    color: #f3f4f6;');
    expect(svg).toContain('.circle-of-fifths__clef {\n    color: #f3f4f6;');
    expect(svg).toContain('fill="currentColor"');
    expect(DIAGRAM_STYLES).toContain('.circle-of-fifths__clef {\n    color: #000;');
  });

  test("models treble and bass key signatures outside all twelve sectors", () => {
    const model = createDiagramModel({ showKeySignatures: true });
    const atEight = model.keySignatureGroups.find(({ hour }) => hour === 8);
    const atNine = model.keySignatureGroups.find(({ hour }) => hour === 9);
    const atFive = model.keySignatureGroups.find(({ hour }) => hour === 5);
    const atSix = model.keySignatureGroups.find(({ hour }) => hour === 6);
    const atTwelve = model.keySignatureGroups.find(({ hour }) => hour === 12);

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

      if (group.hour === 3 || group.hour === 12) {
        expect(Math.hypot(dx, dy)).toBeGreaterThan(DEFAULT_LAYOUT.outerRadius);
      }
      expect(left).toBeGreaterThanOrEqual(model.viewBox.x);
      expect(right).toBeLessThanOrEqual(model.viewBox.x + model.viewBox.width);
      expect(top).toBeGreaterThanOrEqual(model.viewBox.y);
      expect(bottom).toBeLessThanOrEqual(model.viewBox.y + model.viewBox.height);
    }
    expect(atNine?.staffs.map(({ clef }) => clef)).toEqual([
      "treble",
      "bass",
    ]);
    const bassFlats = atNine!.staffs[1].signatures[0].accidentals;
    expect(bassFlats[0].x).toBe(-104);
    expect(bassFlats[0].y).toBe(8);
    expect(bassFlats[1].x - bassFlats[0].x).toBeCloseTo(keySignatureAdvance(6, "reading", "flat"));
    expect(bassFlats[1].y).toBe(-1);
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
    expect(atEight?.staffs[0].lineEndX).toBe(atEight?.staffs[1].lineEndX);
    expect(atEight!.staffs[0].lineEndX).toBeGreaterThan(atNine!.staffs[0].lineEndX);
    const bassFlatAtSix = atSix!.staffs[1].signatures.find(({ fifths }) => fifths === -6)!.accidentals.at(-1)!;
    expect(atSix!.y + atSix!.staffs[1].y + bassFlatAtSix.y + 2).toBeLessThan(model.viewBox.y + model.viewBox.height);
    expect(
      atFive?.staffs[1].signatures
        .find(({ fifths }) => fifths === -7)
        ?.accidentals.map(({ y }) => y),
    ).toEqual([8, -1, 11, 2, 14, 5, 17]);
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

  test("highlights the basic spelling only beside its neighbours", () => {
    for (const labelLayout of ["standard", "single-note"] as const) {
      const svg = renderCircleOfFifthsSvg({ visibleNotes: ["C", "a"], labelLayout });
      expect(svg).not.toContain('class="circle-of-fifths__basic-highlight"');
    }
    expect(
      renderCircleOfFifthsSvg({ visibleNotes: ["C", "B#"] })
        .match(/class="circle-of-fifths__basic-highlight"/g),
    ).toHaveLength(1);
  });

  test("sizes labels, centring a lone spelling whole", () => {
    const svg = renderCircleOfFifthsSvg({ visibleNotes: ["C", "Bb", "B#"], labelSize: 60 });
    expect(svg).toContain("font-size: 60px;");
    // B♭ alone: letter and accidental centred together, not the letter alone.
    expect(svg).toMatch(/data-note="Bb">\s*<text class="circle-of-fifths__spelling" x="-/);
    // C beside B♯: the highlight and line spacing grow with the size.
    expect(svg).toContain('<rect class="circle-of-fifths__basic-highlight" x="-70" y="4" width="140" height="68" rx="6"');
  });

  test("lines a cell's spellings up along the radius", () => {
    const y = (svg: string, note: string) => Number(
      new RegExp(`data-note="${note}">[\\s\\S]*?<text[^>]* y="(-?[\\d.]+)"`).exec(svg)![1],
    );
    const sharps = renderCircleOfFifthsSvg({ labelStacking: "sharps-outside" });
    const flats = renderCircleOfFifthsSvg({ labelStacking: "flats-outside" });
    // At twelve the rim is up, so the outermost spelling has the least y.
    expect(y(sharps, "B#")).toBeLessThan(y(sharps, "C"));
    expect(y(sharps, "C")).toBeLessThan(y(sharps, "Dbb"));
    expect(y(flats, "Dbb")).toBeLessThan(y(flats, "B#"));
    expect(sharps.match(/class="circle-of-fifths__basic-highlight"/g)).toHaveLength(26);
  });

  test("drifts each cell along the radius by its place on the line of fifths", () => {
    const at = (svg: string, note: string) => {
      const match = new RegExp(`data-note="${note}">[\\s\\S]*?<text[^>]* x="(-?[\\d.]+)" y="(-?[\\d.]+)"`).exec(svg)!;
      return { x: Number(match[1]), y: Number(match[2]) };
    };
    const options = { visibleNotes: ["C", "bb", "g#"], labelStacking: "sharps-outside" } as const;
    const flat = renderCircleOfFifthsSvg(options);
    const spiral = renderCircleOfFifthsSvg({ ...options, labelSpiral: 1 });
    // C, at the middle of the line of fifths, stays put; at seven o'clock the
    // rim is down and left, at five down and right.
    expect(at(spiral, "C")).toEqual(at(flat, "C"));
    expect(at(spiral, "bb").y).toBeLessThan(at(flat, "bb").y);
    expect(at(spiral, "g#").y).toBeGreaterThan(at(flat, "g#").y);
    expect(renderCircleOfFifthsSvg({ ...options, labelSpiral: 1, labelStacking: "vertical" }))
      .toBe(renderCircleOfFifthsSvg({ ...options, labelStacking: "vertical" }));
  });

  test("scales the key signatures, keeping them clear of the rim", () => {
    const svg = renderCircleOfFifthsSvg({ showKeySignatures: true, keySignatureScale: 1.5 });
    expect(svg).toMatch(/class="circle-of-fifths__key-signature-group" data-hour="12" transform="translate\([^)]*\) scale\(1\.5\)"/);
    const [x, y, width, height] = /viewBox="([^"]*)"/.exec(svg)![1].split(" ").map(Number);
    expect(x).toBeLessThan(-56.5);
    expect(y).toBeLessThan(-81.5);
    expect(width).toBeGreaterThan(1113);
    expect(height).toBeGreaterThan(1149);
  });

  test("moves large key signatures apart until neighbours clear", () => {
    const groups = createDiagramModel({ showKeySignatures: true, keySignatureScale: 3 }).keySignatureGroups;
    const box = ({ x, y, scale, staffs }: (typeof groups)[number]) => ({
      left: x - 150 * scale, right: x + staffs[0].lineEndX * scale, top: y - 37 * scale, bottom: y + 37 * scale,
    });
    groups.forEach((group, index) => {
      const a = box(group);
      const b = box(groups[(index + 1) % groups.length]);
      expect(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom).toBe(false);
    });
  });

  test("leaves the basic spellings unboxed when asked", () => {
    expect(renderCircleOfFifthsSvg({ markBasicNotes: false })).not.toContain('class="circle-of-fifths__basic-highlight"');
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
    expect(svg).toMatch(
      /class="circle-of-fifths__spelling"[^>]*>A<tspan fill-opacity="0">♯<\/tspan><\/text>/,
    );
    expect(svg).toContain('class="glyph sharp"');
    expect(svg).toMatch(/class="circle-of-fifths__spelling"[^>]*>f<tspan fill-opacity="0">𝄪<\/tspan><\/text>/);
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
