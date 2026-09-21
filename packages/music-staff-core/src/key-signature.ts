// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Clef, NoteLetter } from "./model";

// Keep the original twelve first: the movable-do deck uses these positions
// for stable card IDs. The three enharmonic keys were added afterward.
export const MAJOR_KEYS = [
  { tonic: "C", fifths: 0 },
  { tonic: "G", fifths: 1 },
  { tonic: "D", fifths: 2 },
  { tonic: "A", fifths: 3 },
  { tonic: "E", fifths: 4 },
  { tonic: "B", fifths: 5 },
  { tonic: "F♯", fifths: 6 },
  { tonic: "F", fifths: -1 },
  { tonic: "B♭", fifths: -2 },
  { tonic: "E♭", fifths: -3 },
  { tonic: "A♭", fifths: -4 },
  { tonic: "D♭", fifths: -5 },
  { tonic: "C♯", fifths: 7 },
  { tonic: "G♭", fifths: -6 },
  { tonic: "C♭", fifths: -7 },
] as const;

export const MAJOR_KEYS_BY_SIGNATURE = [...MAJOR_KEYS].sort((a, b) => b.fifths - a.fifths);

const SHARP_ORDER = "FCGDAEB";
const FLAT_ORDER = "BEADGCF";

// Staff steps count lines and spaces upward from the bottom line. The treble
// and bass sequences preserve the circle-of-fifths diagram's engraving.
const SIGNATURE_STEPS = {
  treble: {
    sharp: [8, 5, 9, 6, 3, 7, 4],
    flat: [4, 7, 3, 6, 2, 5, 1],
  },
  bass: {
    sharp: [6, 3, 7, 4, 1, 5, 2],
    flat: [2, 5, 1, 4, 0, 3, -1],
  },
  alto: {
    sharp: [7, 4, 8, 5, 2, 6, 3],
    flat: [3, 6, 2, 5, 1, 4, 0],
  },
  tenor: {
    sharp: [2, 6, 3, 7, 4, 8, 5],
    flat: [5, 8, 4, 7, 3, 6, 2],
  },
} as const satisfies Record<Clef, Record<"sharp" | "flat", readonly number[]>>;

// Both layouts are measured against a six-unit staff line gap. The compact
// layout keeps the circle diagram legible; the reading layout gives accidentals
// their conventional height and spacing on a full-size staff.
const REFERENCE_LINE_GAP = 6;
const SIGNATURE_METRICS = {
  compact: {
    advance: 7,
    sharp: { fontSize: 18, baselineOffset: -7 },
    flat: { fontSize: 18, baselineOffset: -7 },
  },
  reading: {
    advance: 5,
    // Noto Music: both signs are about 2.25 staff spaces tall. With an
    // alphabetic baseline, align the sharp's centre and the flat's bowl
    // to the pitch, independently of the font's overall vertical metrics.
    sharp: { fontSize: 16.5, baselineOffset: 2.9 },
    flat: { fontSize: 24, baselineOffset: 2 },
  },
} as const;

export type KeySignatureLayout = keyof typeof SIGNATURE_METRICS;
export type KeySignatureSign = "sharp" | "flat";

export const KEY_SIGNATURE_FONT_FAMILY =
  '"Noto Music", "Noto Sans Symbols2", "DejaVu Sans", sans-serif';

export type KeySignatureAccidental = Readonly<{ x: number; y: number }>;

export function keySignatureAccidentalForNote(
  note: NoteLetter,
  fifths: number,
): "♯" | "♭" | "" {
  validateFifths(fifths);
  if (fifths > 0 && SHARP_ORDER.slice(0, fifths).includes(note)) return "♯";
  if (fifths < 0 && FLAT_ORDER.slice(0, -fifths).includes(note)) return "♭";
  return "";
}

export function keySignatureAccidentals(
  clef: Clef,
  fifths: number,
  firstX: number,
  topLineY: number,
  lineGap: number,
  layout: KeySignatureLayout = "compact",
): Readonly<{ symbol: "♯" | "♭" | ""; accidentals: readonly KeySignatureAccidental[] }> {
  validateFifths(fifths);
  if (!(lineGap > 0)) {
    throw new RangeError(`lineGap must be positive: ${lineGap}`);
  }
  const symbol = fifths > 0 ? "♯" : fifths < 0 ? "♭" : "";
  const sign = fifths >= 0 ? "sharp" : "flat";
  const steps = SIGNATURE_STEPS[clef][sign];
  const metrics = SIGNATURE_METRICS[layout];
  const scale = lineGap / REFERENCE_LINE_GAP;
  return {
    symbol,
    accidentals: Array.from({ length: Math.abs(fifths) }, (_, index) => ({
      x: firstX + index * metrics.advance * scale,
      y:
        topLineY + (8 - steps[index]) * lineGap / 2 +
        metrics[sign].baselineOffset * scale,
    })),
  };
}

function validateFifths(fifths: number): void {
  if (!Number.isInteger(fifths) || Math.abs(fifths) > 7) {
    throw new RangeError(`fifths must be an integer from -7 to 7: ${fifths}`);
  }
}

export function keySignatureGlyphCss(
  lineGap: number,
  layout: KeySignatureLayout = "compact",
  sign: KeySignatureSign = "sharp",
): string {
  if (!(lineGap > 0)) {
    throw new RangeError(`lineGap must be positive: ${lineGap}`);
  }
  return [
    `font-family:${KEY_SIGNATURE_FONT_FAMILY}`,
    `font-size:${SIGNATURE_METRICS[layout][sign].fontSize * lineGap / REFERENCE_LINE_GAP}px`,
    "text-anchor:middle",
    `dominant-baseline:${layout === "reading" ? "alphabetic" : "central"}`,
  ].join(";");
}

export function keySignatureAdvance(
  lineGap: number,
  layout: KeySignatureLayout = "compact",
): number {
  if (!(lineGap > 0)) {
    throw new RangeError(`lineGap must be positive: ${lineGap}`);
  }
  return SIGNATURE_METRICS[layout].advance * lineGap / REFERENCE_LINE_GAP;
}
