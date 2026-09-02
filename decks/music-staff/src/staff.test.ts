// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import { CLEFS, ledgerSteps, staffStep } from "./cards";
import {
  BOTTOM_LINE_Y,
  CLEF_GLYPHS,
  clefBaselineY,
  renderStaffSvg,
  STAFF,
  staffStepY,
} from "./staff";

function noteY(svg: string): number {
  const match = /<g class="staff__note" data-step="(-?\d+)" data-x="\d+" data-y="([\d.]+)"/.exec(
    svg,
  );
  if (!match) throw new Error("no note head in SVG");
  return Number(match[2]);
}

function labelText(svg: string): string {
  const title = /<title id="title">([^<]*)<\/title>/.exec(svg)?.[1] ?? "";
  const description = /<desc id="description">([^<]*)<\/desc>/.exec(svg)?.[1] ?? "";
  return `${title} ${description}`;
}

describe("staff SVG", () => {
  test("draws exactly five staff lines", () => {
    const svg = renderStaffSvg({ clef: "treble", pitch: "G4" });

    expect(svg.match(/class="staff__line"/g)).toHaveLength(5);
    expect(svg).toContain('data-line="1" x1="16" y1="184" x2="244" y2="184"');
    expect(svg).toContain('data-line="5" x1="16" y1="120" x2="244" y2="120"');
    expect(BOTTOM_LINE_Y).toBe(184);
  });

  test("frames every note of a clef the same, wherever this one sits", () => {
    // The room six ledger lines need is kept whether or not this note needs
    // it: a frame cropped to the note would slide the staff up and down the
    // card as the answer changed.
    const frame = 'width="260" height="304" viewBox="0 0 260 304"';
    expect(renderStaffSvg({ clef: "bass", pitch: "F3" })).toContain(frame);
    expect(renderStaffSvg({ clef: "bass", pitch: "B0" })).toContain(frame);
    expect(renderStaffSvg({ clef: "treble", pitch: "D7" })).toContain(frame);
    expect(renderStaffSvg({ clef: "treble" })).toContain(frame);
    // A label is drawn under it, which is the one thing that adds height.
    expect(
      renderStaffSvg({ clef: "bass", pitch: "F3", label: "F3" }),
    ).toContain('width="260" height="368" viewBox="0 0 260 368"');
  });

  test("draws each clef with its own glyph and anchor line", () => {
    expect(CLEF_GLYPHS).toEqual({
      treble: "\u{1D11E}",
      bass: "\u{1D122}",
      alto: "\u{1D121}",
      tenor: "\u{1D121}",
    });
    for (const clef of CLEFS) {
      const svg = renderStaffSvg({
        clef,
        pitch: clef === "treble" ? "G4" : clef === "bass" ? "F3" : "C4",
      });
      expect(svg).toContain(
        `<text class="staff__clef" data-clef="${clef}" x="26" y="${clefBaselineY(clef)}">${CLEF_GLYPHS[clef]}</text>`,
      );
      expect(svg).toContain('font-family:"Noto Music"');
      expect(svg).toContain(`font-size:${STAFF.lineGap * 4}px`);
    }
  });

  test("places the C clef one line higher for tenor than for alto", () => {
    expect(clefBaselineY("alto")).toBe(BOTTOM_LINE_Y);
    expect(clefBaselineY("tenor")).toBe(BOTTOM_LINE_Y - STAFF.lineGap);
    expect(clefBaselineY("treble")).toBe(BOTTOM_LINE_Y);
    expect(clefBaselineY("bass")).toBe(BOTTOM_LINE_Y);
    expect(
      renderStaffSvg({ clef: "alto", pitch: "C4" }),
    ).not.toBe(renderStaffSvg({ clef: "tenor", pitch: "C4" }));
  });

  test("puts middle C where each clef expects it", () => {
    expect(staffStep("treble", "C4")).toBe(-2);
    expect(staffStep("bass", "C4")).toBe(10);
    expect(staffStep("alto", "C4")).toBe(4);
    expect(staffStep("tenor", "C4")).toBe(6);

    // Alto puts middle C on the middle line, tenor on the fourth line, and
    // both other clefs push it onto the first ledger line outside the staff.
    expect(noteY(renderStaffSvg({ clef: "alto", pitch: "C4" }))).toBe(
      staffStepY(4),
    );
    expect(noteY(renderStaffSvg({ clef: "tenor", pitch: "C4" }))).toBe(
      staffStepY(6),
    );
    expect(noteY(renderStaffSvg({ clef: "treble", pitch: "C4" }))).toBe(200);
    expect(noteY(renderStaffSvg({ clef: "bass", pitch: "C4" }))).toBe(104);
  });

  test("places representative notes on their own line or space", () => {
    expect(staffStep("treble", "E4")).toBe(0);
    expect(staffStep("treble", "F5")).toBe(8);
    expect(staffStep("bass", "G2")).toBe(0);
    expect(staffStep("bass", "A3")).toBe(8);
    expect(staffStep("alto", "F3")).toBe(0);
    expect(staffStep("tenor", "D3")).toBe(0);

    expect(noteY(renderStaffSvg({ clef: "treble", pitch: "G4" }))).toBe(168);
    expect(noteY(renderStaffSvg({ clef: "treble", pitch: "B4" }))).toBe(152);
    expect(noteY(renderStaffSvg({ clef: "treble", pitch: "C6" }))).toBe(88);
    expect(noteY(renderStaffSvg({ clef: "treble", pitch: "D7" }))).toBe(24);
    expect(noteY(renderStaffSvg({ clef: "bass", pitch: "C2" }))).toBe(216);
    expect(noteY(renderStaffSvg({ clef: "bass", pitch: "B0" }))).toBe(280);
    expect(noteY(renderStaffSvg({ clef: "tenor", pitch: "C3" }))).toBe(192);
  });

  test("adds ledger lines above and below the staff", () => {
    expect(ledgerSteps(12)).toEqual([10, 12]);
    expect(ledgerSteps(11)).toEqual([10]);
    expect(ledgerSteps(-3)).toEqual([-2]);
    expect(ledgerSteps(-4)).toEqual([-2, -4]);

    const highC = renderStaffSvg({ clef: "treble", pitch: "C6" });
    expect(highC.match(/class="staff__ledger-line"/g)).toHaveLength(2);
    expect(highC).toContain(
      '<line class="staff__ledger-line" data-step="10" x1="139" y1="104" x2="181" y2="104"/>',
    );
    expect(highC).toContain('data-step="12" x1="139" y1="88"');

    const lowC = renderStaffSvg({ clef: "bass", pitch: "C2" });
    expect(lowC.match(/class="staff__ledger-line"/g)).toHaveLength(2);
    expect(lowC).toContain('data-step="-2" x1="139" y1="200"');
    expect(lowC).toContain('data-step="-4" x1="139" y1="216"');

    // Six is as far as any clef reaches.
    const topD = renderStaffSvg({ clef: "treble", pitch: "D7" });
    expect(topD.match(/class="staff__ledger-line"/g)).toHaveLength(6);
    expect(topD).toContain('data-step="20" x1="139" y1="24"');
    const lowB = renderStaffSvg({ clef: "bass", pitch: "B0" });
    expect(lowB.match(/class="staff__ledger-line"/g)).toHaveLength(6);
    expect(lowB).toContain('data-step="-12" x1="139" y1="280"');

    expect(
      renderStaffSvg({ clef: "treble", pitch: "C4" }).match(
        /class="staff__ledger-line"/g,
      ),
    ).toHaveLength(1);
    expect(
      renderStaffSvg({ clef: "alto", pitch: "C3" }).match(
        /class="staff__ledger-line"/g,
      ),
    ).toHaveLength(1);
    expect(
      renderStaffSvg({ clef: "tenor", pitch: "C5" }).match(
        /class="staff__ledger-line"/g,
      ),
    ).toHaveLength(2);
  });

  test("omits ledger lines for notes inside the staff", () => {
    for (const [clef, pitch] of [
      ["treble", "E4"],
      ["treble", "G4"],
      ["treble", "F5"],
      ["bass", "G2"],
      ["bass", "A3"],
      ["alto", "C4"],
      ["tenor", "C4"],
      ["tenor", "C3"],
    ] as const) {
      expect(
        renderStaffSvg({ clef, pitch }),
        `${clef} ${pitch}`,
      ).not.toContain('<line class="staff__ledger-line"');
    }
  });

  test("draws one hollow oblong note head", () => {
    const svg = renderStaffSvg({ clef: "treble", pitch: "G4" });

    expect(svg.match(/class="staff__note-head"/g)).toHaveLength(1);
    expect(svg).toContain('fill-rule="evenodd"');
    // Wider than tall, with a slanted hole punched through it.
    expect(STAFF.noteHeadRadiusX).toBeGreaterThan(STAFF.noteHeadRadiusY);
    expect(svg).toContain(
      `A ${STAFF.noteHeadRadiusX} ${STAFF.noteHeadRadiusY} 0 0 1`,
    );
    expect(svg).toContain(
      `A ${STAFF.noteHoleRadiusX} ${STAFF.noteHoleRadiusY} ${STAFF.noteHoleRotation} 0 1`,
    );
    expect(svg).not.toContain("stem");
  });

  test("never names the note on the question side", () => {
    for (const [clef, pitch] of [
      ["treble", "C4"],
      ["bass", "A3"],
      ["alto", "E4"],
      ["tenor", "C5"],
    ] as const) {
      const labels = labelText(renderStaffSvg({ clef, pitch }));
      expect(labels).not.toMatch(/\b[A-G]-?\d\b/);
      expect(labels).not.toContain(pitch);
    }
    expect(labelText(renderStaffSvg({ clef: "treble", pitch: "C4" }))).toBe(
      "Treble clef staff A treble clef staff with a single whole note.",
    );
  });

  test("names the note only when a label is drawn", () => {
    const svg = renderStaffSvg({
      clef: "treble",
      pitch: "C4",
      label: "C4",
    });

    expect(svg).toContain('<text class="staff__answer" x="130" y="352">C4</text>');
    expect(svg).toContain(".staff__answer{fill:#fcd34d");
    expect(labelText(svg)).toContain("C4 on the treble clef staff");
  });

  test("draws an empty staff when no pitch is given", () => {
    const svg = renderStaffSvg({ clef: "alto" });

    expect(svg.match(/class="staff__line"/g)).toHaveLength(5);
    expect(svg).toContain('data-clef="alto"');
    expect(svg).not.toContain('<g class="staff__note"');
    expect(svg).not.toContain('<line class="staff__ledger-line"');
    expect(svg).toContain('width="260" height="304" viewBox="0 0 260 304"');
    expect(labelText(svg)).toBe("Alto clef staff An empty alto clef staff.");
  });

  test("labels an empty staff with the pitch to place", () => {
    const svg = renderStaffSvg({ clef: "bass", label: "C4" });

    expect(svg).not.toContain('<g class="staff__note"');
    expect(svg).toContain('<text class="staff__answer" x="130" y="352">C4</text>');
    expect(svg).toContain('height="368"');
    // The label is the question here, so the title still says nothing extra.
    expect(labelText(svg)).toBe("Bass clef staff An empty bass clef staff.");
  });

  test("rejects unknown clefs and pitches outside the clef range", () => {
    expect(() =>
      renderStaffSvg({ clef: "soprano" as never, pitch: "C4" }),
    ).toThrow("clef must be one of treble, bass, alto, tenor");
    expect(() => renderStaffSvg({ clef: "treble", pitch: "H4" })).toThrow(
      'like "C4"',
    );
    expect(() => renderStaffSvg({ clef: "treble", pitch: "F2" })).toThrow(
      "F2 is outside the treble clef range G2-D7",
    );
    expect(() => renderStaffSvg({ clef: "treble", pitch: "E7" })).toThrow(
      "E7 is outside the treble clef range G2-D7",
    );
    expect(() => renderStaffSvg({ clef: "bass", pitch: "G5" })).toThrow(
      "G5 is outside the bass clef range B0-F5",
    );
    expect(() => renderStaffSvg({ clef: "tenor", pitch: "E1" })).toThrow(
      "E1 is outside the tenor clef range F1-C6",
    );
  });
});
