// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { renderStaffMusicGlyph } from "@web-music/music-notation";
import { keySignatureAccidentalForNote, keySignatureAccidentals, keySignatureAdvance, renderKeySignatureGlyph } from "./key-signature";

describe("key-signature engraving", () => {
  it("uses the shared Maestro outlines", () => {
    for (const symbol of ["♯", "♭"] as const) {
      const glyph = renderKeySignatureGlyph(symbol, 100, 120, 16);
      expect(glyph).toContain(`data-music-glyph="${symbol}"`);
      expect(glyph).toContain('class="glyph ');
      expect(glyph).not.toContain("<text");
      expect(glyph).not.toContain("font-family");
      expect(glyph).toContain('transform="scale(1 -1)"');
      expect(() => renderKeySignatureGlyph(symbol, 0, 0, 0)).toThrow(RangeError);
    }
  });

  it("uses original font dimensions with the shared signature spacing", () => {
    const sharp = renderKeySignatureGlyph("♯", 272.5, 155 + 2.9 * 42.75 / 6, 42.75);
    expect(sharp).toContain(renderStaffMusicGlyph("♯", 272.5, 155, 42.75));
    const flat = renderKeySignatureGlyph("♭", 264.5, 245 + 2 * 42.75 / 6, 42.75);
    expect(flat).toContain(renderStaffMusicGlyph("♭", 264.5, 245, 42.75));
    expect(keySignatureAdvance(42.75, "reading")).toBeCloseTo(48);
    expect(keySignatureAdvance(42.75, "reading", "flat")).toBeCloseTo(42);
    const flats = keySignatureAccidentals("treble", -2, 0, 0, 42.75, "reading");
    expect(flats.accidentals[1].x - flats.accidentals[0].x).toBeCloseTo(42);
  });

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
    expect(keySignatureAdvance(16, "reading")).toBeCloseTo(48 / 42.75 * 16);
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
