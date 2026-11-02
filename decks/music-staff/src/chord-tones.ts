// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { TRIAD_FREQUENCIES, FOUR_NOTE_FREQUENCIES } from "./chord-tone-frequency";
import { DEFAULT_CHORD_NOTATION, type ChordNotation } from "./diatonic";
export const CHORD_TONE_DECKS = { triads: "Chord Tones (Triads)", fourNote: "Chord Tones (Four-note Chords)" } as const;
export type ChordToneKind = keyof typeof CHORD_TONE_DECKS;
export type ChordTone = Readonly<{ root:string; quality:string; notes:readonly string[]; count:number }>;
export const chordTones: Readonly<Record<ChordToneKind, readonly ChordTone[]>> = { triads:TRIAD_FREQUENCIES, fourNote:FOUR_NOTE_FREQUENCIES };
export function chordToneLabel(root: string, quality: string, notation: ChordNotation = DEFAULT_CHORD_NOTATION): string {
  const minor = notation.minor.replace(/7$/, "");
  const suffix = quality.startsWith("mΔ7") ? notation.minorMajorSeventh + quality.slice(3)
    : quality.startsWith("°Δ7") ? "°" + notation.majorSeventh + quality.slice(3)
    : quality.startsWith("Δ7") ? notation.majorSeventh + quality.slice(2)
    : quality.startsWith("ø7") ? notation.halfDiminished + quality.slice(2)
    : quality.startsWith("m7") ? notation.minor + quality.slice(2)
    : quality.startsWith("m") ? minor + quality.slice(1) : quality;
  return root + suffix;
}
