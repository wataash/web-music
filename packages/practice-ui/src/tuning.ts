// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { GUITAR_OPEN_STRINGS } from "./guitar";

// Which strings an instrument has, as MIDI pitches with string 1 first: what
// the chord practice and the guitar decks draw and sound. Presets are starting
// points; every pitch is editable.
export const DEFAULT_TUNING: readonly number[] = GUITAR_OPEN_STRINGS;
export const MIN_STRINGS = 2;
export const MAX_STRINGS = 12;
export type TuningPreset = { id: string; label: string; instrument: string; pitches: number[]; note?: string; bassStrings?: number[] };
export const TUNING_PRESETS: TuningPreset[] = [
  { id: 'guitar-6', instrument: 'Guitar', label: '6-string guitar', pitches: [...DEFAULT_TUNING] },
  { id: 'guitar-7', instrument: 'Guitar', label: '7-string guitar', pitches: [...DEFAULT_TUNING, 35] },
  { id: 'guitar-8', instrument: 'Guitar', label: '8-string guitar', pitches: [...DEFAULT_TUNING, 35, 30] },
  { id: 'guitar-9', instrument: 'Guitar', label: '9-string guitar', pitches: [...DEFAULT_TUNING, 35, 30, 25] },
  { id: 'bass-4', instrument: 'Bass', label: '4-string bass', pitches: [43, 38, 33, 28] },
  { id: 'bass-5', instrument: 'Bass', label: '5-string bass', pitches: [43, 38, 33, 28, 23] },
  { id: 'bass-6', instrument: 'Bass', label: '6-string bass', pitches: [48, 43, 38, 33, 28, 23] },
  { id: 'bass-7', instrument: 'Bass', label: '7-string bass', pitches: [48, 43, 38, 33, 28, 23, 18] },
  { id: 'bass-8', instrument: 'Bass', label: '8-string bass', pitches: [53, 48, 43, 38, 33, 28, 23, 18] },
  { id: 'stick-10', instrument: 'Stick', label: 'Chapman Stick — 10-string Classic', pitches: [62, 57, 52, 47, 42, 24, 31, 38, 45, 52], bassStrings: [6, 7, 8, 9, 10], note: 'Strings 1–5: melody; 6–10: bass in ascending fifths. Positions follow the 34-inch Classic tuning reference; the extended-scale X fret is not shown.' },
  { id: 'stick-12', instrument: 'Stick', label: 'Grand Stick — 12-string Classic', pitches: [62, 57, 52, 47, 42, 37, 24, 31, 38, 45, 52, 59], bassStrings: [7, 8, 9, 10, 11, 12], note: 'Strings 1–6: melody; 7–12: bass in ascending fifths. Positions follow the 34-inch Classic tuning reference; the extended-scale X fret is not shown.' },
  { id: 'violin', instrument: 'Violin', label: 'Violin', pitches: [76, 69, 62, 55], note: 'Grid lines are semitone guides, not physical frets.' },
  { id: 'violin-5', instrument: 'Violin', label: '5-string violin', pitches: [76, 69, 62, 55, 48], note: 'Low C added. Grid lines are semitone guides, not physical frets.' },
  { id: 'viola', instrument: 'Viola', label: 'Viola', pitches: [69, 62, 55, 48], note: 'Grid lines are semitone guides, not physical frets.' },
  { id: 'cello', instrument: 'Cello', label: 'Cello', pitches: [57, 50, 43, 36], note: 'Grid lines are semitone guides, not physical frets.' },
  { id: 'double-bass', instrument: 'Double bass', label: 'Double bass', pitches: [43, 38, 33, 28], note: 'Sounding pitches. Grid lines are semitone guides, not physical frets.' },
  { id: 'ukulele-high-g', instrument: 'Ukulele', label: 'Ukulele — high G', pitches: [69, 64, 60, 67] },
  { id: 'ukulele-low-g', instrument: 'Ukulele', label: 'Ukulele — low G', pitches: [69, 64, 60, 55] },
  { id: 'ukulele-baritone', instrument: 'Ukulele', label: 'Baritone ukulele', pitches: [64, 59, 55, 50] },
  { id: 'mandolin', instrument: 'Mandolin', label: 'Mandolin — 8 strings', pitches: [76, 76, 69, 69, 62, 62, 55, 55], note: 'Four unison pairs. Each physical string is shown separately.' },
  { id: 'mandola', instrument: 'Mandola', label: 'Mandola — 8 strings', pitches: [69, 69, 62, 62, 55, 55, 48, 48], note: 'Four unison pairs. Each physical string is shown separately.' },
  { id: 'octave-mandolin', instrument: 'Octave mandolin', label: 'Octave mandolin — 8 strings', pitches: [64, 64, 57, 57, 50, 50, 43, 43], note: 'Four unison pairs. Each physical string is shown separately.' },
  { id: 'tenor-banjo', instrument: 'Tenor banjo', label: 'Tenor banjo — CGDA', pitches: [69, 62, 55, 48] },
  { id: 'irish-banjo', instrument: 'Tenor banjo', label: 'Irish tenor banjo — GDAE', pitches: [64, 57, 50, 43] },
];
export const PITCH_CLASSES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES: Record<string, string> = { 'C♯': 'D♭', 'D♯': 'E♭', 'F♯': 'G♭', 'G♯': 'A♭', 'A♯': 'B♭' };
// Both spellings for choosing a string's pitch.
export const NOTE_NAMES = PITCH_CLASSES.map(name => FLAT_NAMES[name] ? `${name} / ${FLAT_NAMES[name]}` : name);
export function normalizeTuning(value: unknown): number[] {
  return Array.isArray(value) && value.length >= MIN_STRINGS && value.length <= MAX_STRINGS &&
    value.every(pitch => Number.isInteger(pitch) && pitch >= 0 && pitch <= 127)
    ? [...value] : [...DEFAULT_TUNING];
}
export function matchingPreset(tuning: readonly number[], preferred?: string): TuningPreset | undefined {
  const matches = (p: TuningPreset) => p.pitches.length === tuning.length && p.pitches.every((pitch, i) => pitch === tuning[i]);
  return TUNING_PRESETS.find(p => p.id === preferred && matches(p)) ?? TUNING_PRESETS.find(matches);
}

// Tells one tuning from another where a name is needed: a storage key, a
// guid namespace. Standard six-string guitar is the empty slug, since
// everything written before there were other tunings was written for it.
export function tuningSlug(tuning: readonly number[]): string {
  return isStandardGuitarTuning(tuning) ? "" : tuning.join("-");
}

export function isStandardGuitarTuning(tuning: readonly number[]): boolean {
  return tuning.length === DEFAULT_TUNING.length && tuning.every((pitch, i) => pitch === DEFAULT_TUNING[i]);
}

// What the instrument is called in a sentence: its preset's label, or its
// string count when the reader tuned it themselves.
export function describeTuning(tuning: readonly number[]): string {
  return matchingPreset(tuning)?.label ?? `Custom ${tuning.length}-string tuning`;
}
