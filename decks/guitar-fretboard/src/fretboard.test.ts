// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import {
  CANVAS,
  calcNormalizedFretPositions,
  renderFretboardSvg,
} from "./fretboard";

describe("fretboard SVG", () => {
  test("uses equal-width fret positions from 0F through 24F", () => {
    const positions = calcNormalizedFretPositions(24);

    expect(positions).toHaveLength(26);
    expect(positions[0]).toBe(0);
    expect(positions[25]).toBe(1);
    expect(positions[1]).toBe(0.04);
    expect(positions[12]).toBe(0.48);
    expect(positions[24]).toBe(0.96);
  });

  test("ends the SVG at the last fret line without right padding", () => {
    const svg = renderFretboardSvg({ string: 3, fret: 24, cue: "♭" });
    const lastFretX =
      CANVAS.nutWidth + CANVAS.boardWidth * calcNormalizedFretPositions(24)[24];

    expect(svg).toContain(
      `width="${lastFretX}" height="260" viewBox="0 0 ${lastFretX} 260"`,
    );
    expect(svg).toContain(
      `data-string="1" x1="${CANVAS.nutWidth}" y1="30" x2="${lastFretX}"`,
    );
    expect(svg).toContain(
      `<g class="fretboard__fret-label" data-fret="24"><text x="1356"`,
    );
  });

  test("renders one pale-yellow target on a dark background", () => {
    const svg = renderFretboardSvg({ string: 3, fret: 7, cue: "♭" });

    expect(svg).toContain('<svg class="fretboard"');
    expect(svg).toContain('<rect width="100%" height="100%" fill="#111827"/>');
    expect(svg).toContain("fill:#fde68a");
    expect(svg).toContain(
      'class="fretboard__target" data-string="3" data-fret="7"',
    );
    expect(svg.match(/class="fretboard__target"/g)).toHaveLength(1);
    expect(svg.match(/class="fretboard__string"/g)).toHaveLength(6);
    expect(svg.match(/class="fretboard__fret-label"/g)).toHaveLength(25);
    expect(svg).toContain(
      'class="fretboard__label" data-label-kind="cue"',
    );
    expect(svg).toContain(">♭</text>");
    expect(svg).not.toContain('data-label-kind="answer"');
  });

  test("renders a sharp cue for sharp-system questions", () => {
    const svg = renderFretboardSvg({ string: 2, fret: 4, cue: "♯" });

    expect(svg).toContain(
      'class="fretboard__label" data-label-kind="cue"',
    );
    expect(svg).toContain(">♯</text>");
  });

  test("renders the typographic note name in the same target on the back", () => {
    const svg = renderFretboardSvg({
      string: 3,
      fret: 1,
      note: "A♭",
    });

    expect(svg).toContain(
      '<text class="fretboard__label" data-label-kind="answer"',
    );
    expect(svg).toContain(">A♭</text>");
    expect(svg).toContain("A♭ on string 3, fret 1");
  });

  test("highlights exactly one string without adding a target", () => {
    const svg = renderFretboardSvg({ highlightedString: 4 });

    expect(svg).toContain(
      'class="fretboard__string-highlight" data-string="4"',
    );
    expect(svg.match(/class="fretboard__string-highlight"/g)).toHaveLength(1);
    expect(svg).not.toContain('class="fretboard__target"');
  });

  test("renders every answer position on one string", () => {
    const svg = renderFretboardSvg({
      targets: [0, 12, 24].map((fret) => ({
        string: 1,
        fret,
        label: "E",
        labelKind: "answer",
      })),
    });

    expect(svg.match(/class="fretboard__target"/g)).toHaveLength(3);
    expect(svg.match(/data-label-kind="answer"/g)).toHaveLength(3);
    for (const fret of [0, 12, 24]) {
      expect(svg).toContain(`data-string="1" data-fret="${fret}"`);
    }
  });

  test("sizes block inlays from their fret and string intervals", () => {
    const svg = renderFretboardSvg({ string: 3, fret: 7, cue: "♭" });
    const fretXs = calcNormalizedFretPositions(24).map(
      (position) => CANVAS.nutWidth + CANVAS.boardWidth * position,
    );
    const labelHeight = CANVAS.fretLabelFontSize + CANVAS.noteRadius;

    for (const inlayFret of [3, 12, 24]) {
      const match = new RegExp(
        `<rect class="[^"]*fretboard__inlay[^"]*" data-fret="${inlayFret}" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"`,
      ).exec(svg);

      expect(match).not.toBeNull();
      const [, x, y, width, height] = match!;
      const innerLeftX =
        fretXs[inlayFret - 1] + CANVAS.fretLineWidth / 2;
      const innerWidth =
        fretXs[inlayFret] -
        fretXs[inlayFret - 1] -
        CANVAS.fretLineWidth;

      expect(Number(x)).toBeCloseTo(innerLeftX + innerWidth * 0.15);
      expect(Number(width)).toBeCloseTo(innerWidth * 0.7);
      expect(Number(y)).toBe(labelHeight + CANVAS.stringGap * 0.2);
      expect(Number(height)).toBe(CANVAS.stringGap * 4.6);
    }
  });

  test("renders every fret line with the same weight", () => {
    const svg = renderFretboardSvg({ string: 3, fret: 7, cue: "♭" });
    const fretLines = svg.match(/<line data-fret="[^"]+"[^>]+>/g);

    expect(fretLines).toHaveLength(25);
    expect(fretLines?.every((line) =>
      line.includes(
        `stroke="#9ca3af" stroke-width="${CANVAS.fretLineWidth}"`,
      ),
    )).toBe(true);
  });

  test("rejects positions outside the generated card range", () => {
    expect(() => renderFretboardSvg({ string: 0, fret: 0 })).toThrow(
      "string must be from 1 to 6",
    );
    expect(() => renderFretboardSvg({ string: 1, fret: 25 })).toThrow(
      "fret must be from 0 to 24",
    );
    expect(() =>
      renderFretboardSvg({ highlightedString: 7 }),
    ).toThrow("highlightedString must be from 1 to 6");
  });
});
