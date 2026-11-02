// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { MAJOR_KEYS } from "@web-music/music-staff-core";
import { DIATONIC_VARIANTS, chordQualityLabel, diatonicChord, diatonicDegreeLabel, relativeMajorDegreeLabel,
  DEFAULT_CHORD_NOTATION, type ChordNotation, type MinorDegreeNotation, type Tonality } from "./diatonic";
export const PROGRESSION_ROOT = "II–V–I Progressions";
export type ProgressionSelection = Readonly<{ majorKeys: readonly number[]; minorKeys: readonly number[]; relativeMajor: boolean }>;
export function parseProgressionSelection(value: unknown): ProgressionSelection {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const keys = (field: "majorKeys" | "minorKeys") => {
    const all = MAJOR_KEYS.map(key => key.fifths);
    if (Array.isArray(row[field])) return all.filter(fifths => (row[field] as unknown[]).includes(fifths));
    return all.filter(fifths => fifths >= -5 && fifths <= 5);
  };
  return { majorKeys: keys("majorKeys"), minorKeys: keys("minorKeys"), relativeMajor: row.relativeMajor !== false };
}
export function iiVIGroups(mode: Tonality) {
  const qualities = mode === "major" ? ["m7", "7", "Δ7"] : ["ø7", "7", "m7"];
  return [1, 4, 0].map((degree, index) => {
    const variant = DIATONIC_VARIANTS.find(v => v.mode === mode && v.degree === degree && v.quality === qualities[index]);
    if (!variant) throw new Error(`Missing II–V–I chord: ${mode}, ${degree}`);
    return variant;
  });
}
export function iiVIProgression(fifths: number, mode: Tonality, minor: MinorDegreeNotation = "im7", notation: ChordNotation = DEFAULT_CHORD_NOTATION) {
  const variants = iiVIGroups(mode);
  const values = variants.map(variant => diatonicChord(fifths, variant));
  return { key: `${values[0].tonic} ${mode}`,
    degrees: variants.map(variant => diatonicDegreeLabel(variant, minor, notation)),
    chords: variants.map((variant, i) => values[i].notes[0] + chordQualityLabel(variant.quality, notation)),
    relative: mode === "minor" ? `(${variants.map(variant => relativeMajorDegreeLabel(variant, minor, notation)).join(" → ")}\nin ${MAJOR_KEYS.find(key => key.fifths === fifths)!.tonic} major)` : "",
    notes: values.map(value => value.notes) };
}
export function progressionLine(values: readonly string[]): string {
  return values.map(value => `<span>${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</span>`).join('<span class="progression-arrow" aria-hidden="true">→</span>');
}
