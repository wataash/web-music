// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { MAJOR_KEYS } from "./key-signature";
import { renderStaffRowSvg } from "./staff-svg";

describe("keyed staff row", () => {
  // Expected degrees for C D E F G A B, independently listed for each key.
  const degreesByFifths: Record<number, readonly string[]> = {
    7: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"],
    6: ["Sol", "La", "Ti", "Do", "Re", "Mi", "Fa"],
    5: ["Re", "Mi", "Fa", "Sol", "La", "Ti", "Do"],
    4: ["La", "Ti", "Do", "Re", "Mi", "Fa", "Sol"],
    3: ["Mi", "Fa", "Sol", "La", "Ti", "Do", "Re"],
    2: ["Ti", "Do", "Re", "Mi", "Fa", "Sol", "La"],
    1: ["Fa", "Sol", "La", "Ti", "Do", "Re", "Mi"],
    0: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"],
    [-1]: ["Sol", "La", "Ti", "Do", "Re", "Mi", "Fa"],
    [-2]: ["Re", "Mi", "Fa", "Sol", "La", "Ti", "Do"],
    [-3]: ["La", "Ti", "Do", "Re", "Mi", "Fa", "Sol"],
    [-4]: ["Mi", "Fa", "Sol", "La", "Ti", "Do", "Re"],
    [-5]: ["Ti", "Do", "Re", "Mi", "Fa", "Sol", "La"],
    [-6]: ["Fa", "Sol", "La", "Ti", "Do", "Re", "Mi"],
    [-7]: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"],
  };

  it("renders all 15 major signatures, named notes, and movable do", () => {
    for (const { tonic, fifths } of MAJOR_KEYS) {
      const svg = renderStaffRowSvg({
        clef: "treble",
        pitches: ["C4", "D4", "E4", "F4", "G4", "A4", "B4"],
        keyFifths: fifths,
        showSolfege: true,
        interactive: false,
        columnWidth: 52,
        nameHeight: 45,
      });
      expect(svg).toContain(`Treble clef, ${tonic} major notes`);
      expect(svg.match(/class="staff__key-signature"/g)).toHaveLength(1);
      const signature = svg.split('<g class="staff__key-signature"')[1]?.split("</g>")[0] ?? "";
      expect(signature.match(/<text/g) ?? []).toHaveLength(Math.abs(fifths));
      if (fifths !== 0) {
        expect(signature).toContain('font-family:&quot;Noto Music&quot;');
        expect(signature).not.toContain('font-family:"Noto Music"');
      }
      const actualDegrees = [...svg.matchAll(/class="staff__solfege"[^>]*>([^<]+)<\/text>/g)]
        .map(([, degree]) => degree);
      expect(actualDegrees, `${tonic} major`).toEqual(degreesByFifths[fifths]);
      expect(svg).not.toContain('role="checkbox"');
      expect(svg).not.toContain("tabindex=");
      expect(svg).not.toContain("staff__column");
      expect(svg).not.toContain("data-selected=");
    }
  });

  it("uses C major for solfege when no signature is requested", () => {
    const svg = renderStaffRowSvg({
      clef: "treble",
      pitches: ["C4", "G4", "B4"],
      showSolfege: true,
      interactive: false,
    });
    expect(svg).toContain("Treble clef, C major notes");
    expect(svg).toContain(">Do</text>");
    expect(svg).toContain(">Sol</text>");
    expect(svg).toContain(">Ti</text>");
    expect(svg).not.toContain("staff__key-signature");
  });

  it("spells C-sharp major with B-sharp and C-flat major with F-flat", () => {
    const render = (keyFifths: number) => renderStaffRowSvg({
      clef: "bass", pitches: ["B2", "C3", "F3"], keyFifths,
      showSolfege: true, interactive: false, columnWidth: 55, nameHeight: 45,
    });
    expect(render(7)).toContain(">B♯2</text>");
    expect(render(7)).toContain(">C♯3</text>");
    expect(render(-7)).toContain(">C♭3</text>");
    expect(render(-7)).toContain(">F♭3</text>");
  });

  it("rejects a key outside the available signatures", () => {
    expect(() => renderStaffRowSvg({ clef: "alto", pitches: [], keyFifths: 8 })).toThrow(RangeError);
  });
});
