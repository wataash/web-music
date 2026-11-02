// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { MAJOR_KEYS, NATURAL_SEMITONES, NOTE_LETTERS } from "@web-music/music-staff-core";

export const DIATONIC_ROOT = "Diatonic Chords";
export const DIATONIC_DIRECTIONS = ["degree-chord"] as const;
export type DiatonicDirection = typeof DIATONIC_DIRECTIONS[number];
export type Tonality = "major" | "minor";
export const SCALE_STEPS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  melodic: [0, 2, 3, 5, 7, 9, 11],
} as const;
export type Scale = keyof typeof SCALE_STEPS;
export const QUALITY_INTERVALS = {
  "Δ7": [0, 4, 7, 11], "m7": [0, 3, 7, 10], "7": [0, 4, 7, 10],
  "ø7": [0, 3, 6, 10], "°7": [0, 3, 6, 9], "mΔ7": [0, 3, 7, 11],
  "Δ7(♯5)": [0, 4, 8, 11],
} as const;
export type ChordQuality = keyof typeof QUALITY_INTERVALS;
export type DiatonicVariant = Readonly<{
  id: string; mode: Tonality; degree: number; offset: number;
  quality: ChordQuality; label: string; scales: readonly Scale[]; defaultOn: boolean;
}>;
const accidental = (n: number) => n < 0 ? "♭".repeat(-n) : "♯".repeat(n);
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
export const MINOR_DEGREE_NOTATIONS = ["i7", "i-7", "im7", "Im7", "I-7"] as const;
export type MinorDegreeNotation = typeof MINOR_DEGREE_NOTATIONS[number];
export function parseMinorDegreeNotation(value: unknown): MinorDegreeNotation {
  return MINOR_DEGREE_NOTATIONS.find(style => style === value) ?? "im7";
}
export const CHORD_NOTATION_OPTIONS = [
  { key: "majorSeventh", label: "Major seventh", values: ["Δ7", "maj7", "M7"] },
  { key: "minor", label: "Minor chord", values: ["m7", "-7", "min7", "mi7"] },
  { key: "halfDiminished", label: "Half-diminished", values: ["ø7", "m7(♭5)", "m7♭5"] },
  { key: "minorMajorSeventh", label: "Minor-major seventh", values: ["mΔ7", "m(maj7)", "mM7"] },
] as const;
export type ChordNotation = { readonly [Option in typeof CHORD_NOTATION_OPTIONS[number] as Option["key"]]: Option["values"][number] };
export const DEFAULT_CHORD_NOTATION: ChordNotation = { majorSeventh: "Δ7", minor: "m7", halfDiminished: "ø7", minorMajorSeventh: "mΔ7" };
export function parseChordNotation(value: unknown): ChordNotation {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(CHORD_NOTATION_OPTIONS.map(option => [option.key,
    option.values.find(value => value === row[option.key]) ?? DEFAULT_CHORD_NOTATION[option.key],
  ])) as ChordNotation;
}
export function chordQualityLabel(quality: ChordQuality, notation: ChordNotation = DEFAULT_CHORD_NOTATION): string {
  switch (quality) {
    case "Δ7": return notation.majorSeventh;
    case "Δ7(♯5)": return notation.majorSeventh + "(♯5)";
    case "m7": return notation.minor;
    case "ø7": return notation.halfDiminished;
    case "mΔ7": return notation.minorMajorSeventh;
    default: return quality;
  }
}

function degreeLabel(degree: number, quality: ChordQuality, notation: MinorDegreeNotation = "im7", chords: ChordNotation = DEFAULT_CHORD_NOTATION): string {
  if (quality === "m7" || quality === "mΔ7") {
    const numeral = notation.startsWith("i") ? ROMAN[degree].toLowerCase() : ROMAN[degree];
    const suffix = quality === "m7" ? "7" : chords.minorMajorSeventh.slice(1);
    return numeral + (notation === "i7" ? "" : notation.includes("-") ? "-" : "m") + suffix;
  }
  const minor = quality === "ø7" || quality === "°7";
  const numeral = minor ? ROMAN[degree].toLowerCase() : ROMAN[degree];
  return numeral + chordQualityLabel(quality, chords);
}
export function diatonicDegreeLabel(variant: DiatonicVariant, notation: MinorDegreeNotation = "im7", chords: ChordNotation = DEFAULT_CHORD_NOTATION): string {
  return accidental(variant.offset - SCALE_STEPS.major[variant.degree]) + degreeLabel(variant.degree, variant.quality, notation, chords);
}
export function relativeMajorDegreeLabel(variant: DiatonicVariant, notation: MinorDegreeNotation = "im7", chords: ChordNotation = DEFAULT_CHORD_NOTATION): string {
  return accidental(variant.offset - SCALE_STEPS.natural[variant.degree]) + degreeLabel((variant.degree + 5) % 7, variant.quality, notation, chords);
}

// Stack thirds in each scale, then merge identical chords across minor forms.
// Melodic means ascending/jazz melodic minor; its descending form is natural.
export const DIATONIC_VARIANTS: readonly DiatonicVariant[] = (() => {
  const variants: DiatonicVariant[] = [];
  for (const scale of Object.keys(SCALE_STEPS) as Scale[]) {
    const mode = scale === "major" ? "major" : "minor";
    const steps = SCALE_STEPS[scale];
    for (let degree = 0; degree < 7; degree++) {
      const intervals = [0, 2, 4, 6].map(n => steps[(degree + n) % 7] + 12 * Math.floor((degree + n) / 7) - steps[degree]);
      const quality = (Object.keys(QUALITY_INTERVALS) as ChordQuality[]).find(q => QUALITY_INTERVALS[q].every((n, i) => n === intervals[i]));
      if (!quality) throw new Error(`Unknown chord: ${scale}, ${degree}`);
      const offset = steps[degree];
      const id = `${mode}-${degree + 1}-${offset}-${quality}`;
      const existing = variants.find(v => v.id === id);
      if (existing) {
        variants[variants.indexOf(existing)] = { ...existing, scales: [...existing.scales, scale] };
      } else {
        variants.push({ id, mode, degree, offset, quality,
          label: accidental(offset - SCALE_STEPS.major[degree]) + degreeLabel(degree, quality),
          scales: [scale], defaultOn: scale === "major" || scale === "natural" || (degree === 4 && quality === "7") || quality === "°7",
        });
      }
    }
  }
  return variants;
})();

function noteIndex(note: string): number {
  return NOTE_LETTERS.indexOf(note[0] as typeof NOTE_LETTERS[number]);
}
function semitone(note: string): number {
  return NATURAL_SEMITONES[noteIndex(note)] + [...note.slice(1)].reduce((n, c) => n + (c === "♭" ? -1 : c === "♯" ? 1 : 0), 0);
}
function spell(letter: number, pitch: number): string {
  const i = (letter + 7) % 7;
  const delta = ((pitch - NATURAL_SEMITONES[i] + 18) % 12) - 6;
  return NOTE_LETTERS[i] + accidental(delta);
}
export function diatonicKey(fifths: number, mode: Tonality): string {
  const key = MAJOR_KEYS.find(k => k.fifths === fifths);
  if (!key) throw new RangeError(`Invalid fifths: ${fifths}`);
  return mode === "major" ? key.tonic : spell(noteIndex(key.tonic) + 5, semitone(key.tonic) + 9);
}
export function diatonicChord(fifths: number, variant: DiatonicVariant, notation: MinorDegreeNotation = "im7", chords: ChordNotation = DEFAULT_CHORD_NOTATION) {
  const tonic = diatonicKey(fifths, variant.mode);
  const rootLetter = noteIndex(tonic) + variant.degree;
  const rootPitch = semitone(tonic) + variant.offset;
  const notes = QUALITY_INTERVALS[variant.quality].map((n, i) => spell(rootLetter + i * 2, rootPitch + n));
  const major = MAJOR_KEYS.find(k => k.fifths === fifths)!.tonic;
  return { tonic, chord: notes[0] + variant.quality, notes,
    relative: variant.mode === "minor" ? `${relativeMajorDegreeLabel(variant, notation, chords)} in ${major} major` : "",
  };
}

export type DiatonicContext = Readonly<{ fifths: number; variant: string }>;
export type DiatonicSelection = Readonly<{
  majorKeys: readonly number[]; minorKeys: readonly number[];
  minorChords: readonly string[]; relativeMajor: boolean;
}>;
export type DiatonicSelections = Readonly<Record<DiatonicDirection, DiatonicSelection>>;
export function defaultDiatonicSelection(): DiatonicSelection {
  return { majorKeys: [0,-1,-2], minorKeys: [0,-1],
    minorChords: DIATONIC_VARIANTS.filter(v => v.mode === "minor" && v.defaultOn).map(v => v.id), relativeMajor: false };
}
export function parseDiatonicSelections(value: unknown): DiatonicSelections {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(DIATONIC_DIRECTIONS.map(direction => {
    const raw = record[direction];
    const row = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const defaults = defaultDiatonicSelection();
    const keys = (name: "majorKeys" | "minorKeys") => {
      const values = row[name];
      return Array.isArray(values) ? MAJOR_KEYS.map(k => k.fifths).filter(n => values.includes(n)) : defaults[name];
    };
    const values = row.minorChords;
    const minorChords = Array.isArray(values)
      ? DIATONIC_VARIANTS.filter(v => v.mode === "minor" && (v.scales.includes("natural") || values.includes(v.id))).map(v => v.id)
      : defaults.minorChords;
    return [direction, { majorKeys: keys("majorKeys"), minorKeys: keys("minorKeys"), minorChords, relativeMajor: row.relativeMajor === true }];
  })) as DiatonicSelections;
}
export function contextSelected(context: DiatonicContext, selection: DiatonicSelection): boolean {
  const variant = DIATONIC_VARIANTS.find(v => v.id === context.variant);
  if (!variant) return false;
  const keys = variant.mode === "major" ? selection.majorKeys : selection.minorKeys;
  return keys.includes(context.fifths) && (variant.mode === "major" || variant.scales.includes("natural") || selection.minorChords.includes(variant.id));
}

export function diatonicOrigin(variant: DiatonicVariant): string {
  if (variant.mode !== "minor" || variant.scales.includes("natural")) return "";
  if (variant.scales.includes("harmonic") && variant.scales.includes("melodic")) return "Harmonic / melodic minor";
  return variant.scales.includes("harmonic") ? "Harmonic minor" : "Melodic minor";
}
