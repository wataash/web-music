// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { keySignatureAccidentalForNote, keySignatureAccidentals, keySignatureAdvance, keySignatureGlyphCss } from "./key-signature";

describe("key-signature engraving", () => {
  it("preserves the circle-of-fifths treble and bass placements", () => {
    expect(keySignatureAccidentals("treble", 2, -104, -12, 6)).toEqual({
      symbol: "♯",
      accidentals: [{ x: -104, y: -19 }, { x: -97, y: -10 }],
    });
    expect(keySignatureAccidentals("bass", -2, -104, -12, 6)).toEqual({
      symbol: "♭",
      accidentals: [{ x: -104, y: -1 }, { x: -97, y: -10 }],
    });
    expect(keySignatureAccidentals("bass", -7, 0, -12, 6).accidentals[6].y).toBe(8);
  });

  it("scales positions and glyphs together for the flashcard staff", () => {
    const signature = keySignatureAccidentals("bass", -1, 100, 120, 16, "reading");
    expect(signature.symbol).toBe("♭");
    expect(signature.accidentals).toEqual([{ x: 100, y: 168 + 2 * 16 / 6 }]);
    expect(keySignatureAdvance(16)).toBe(7 * 16 / 6);
    expect(keySignatureAdvance(16, "reading")).toBe(5 * 16 / 6);
    expect(keySignatureGlyphCss(16)).toContain("font-size:48px");
    expect(keySignatureGlyphCss(16, "reading", "flat")).toContain("font-size:64px");
    expect(keySignatureGlyphCss(16, "reading", "sharp")).toContain("font-size:44px");
  });

  it("provides all four clefs and validates the signature", () => {
    expect(keySignatureAccidentalForNote("F", 1)).toBe("♯");
    expect(keySignatureAccidentalForNote("B", -1)).toBe("♭");
    expect(keySignatureAccidentalForNote("E", -2)).toBe("♭");
    expect(keySignatureAccidentalForNote("A", -2)).toBe("");
    for (const clef of ["treble", "bass", "alto", "tenor"] as const) {
      expect(keySignatureAccidentals(clef, 7, 0, 0, 6).accidentals).toHaveLength(7);
      expect(keySignatureAccidentals(clef, -7, 0, 0, 6).accidentals).toHaveLength(7);
    }
    expect(keySignatureAccidentals("treble", 0, 0, 0, 6)).toEqual({ symbol: "", accidentals: [] });
    expect(() => keySignatureAccidentals("treble", 8, 0, 0, 6)).toThrow();
  });
});
