// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { DEGREES, QUALITY_INTERVALS as IREAL_INTERVALS } from "@web-music/ireal/intervals";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_PITCHES = [0, 2, 4, 5, 7, 9, 11] as const;

type NoteLetter = (typeof LETTERS)[number];

export type SpelledNote = Readonly<{
  letter: NoteLetter;
  accidental: number;
}>;

type IntervalDefinition = Readonly<{
  label: string;
  semitones: number;
  letterSteps: number;
}>;

export type ChordTone = Readonly<{
  interval: string;
  note: string;
  pitchClass: number;
}>;

export type ChordDescription = Readonly<{
  symbol: string;
  tones: readonly ChordTone[];
  bass: Readonly<{ note: string; pitchClass: number }> | null;
  noChord: boolean;
  unsupported?: boolean;
}>;

export type ParsedChord = Readonly<{
  root: SpelledNote;
  suffix: string;
  bass: SpelledNote | null;
}>;

// App spellings and voicings override iReal's literal degree lists. Keep the
// displayed interval labels (M9, P11, etc.) used by the practice UI.
const APP_QUALITIES: Readonly<Record<string, string>> = {
  add2: 'M3 P5 M2', '-add2': 'm3 P5 M2', '^7b5': 'M3 d5 M7',
  sus2: 'M2 P5', '7susb9': 'P4 P5 m7 b9', '7susb9b13': 'P4 P5 m7 b9 b13',
  M7: 'M3 P5 M7', M9: 'M3 P5 M7 M9',
  '(b9)': 'M3 P5 m9', '7(b9)': 'M3 P5 m7 m9',
  '7(13)': 'M3 P5 m7 M13', '9': 'M3 P5 m7 M9',
  '9(13)': 'M3 P5 m7 M9 M13', '13': 'M3 P5 m7 M9 M13',
  '11': 'M3 P5 m7 M9 P11', '9sus4': 'P4 P5 m7 M9',
  aug7: 'M3 A5 m7', 'aug7(b9)': 'M3 A5 m7 m9', 'aug7(#9)': 'M3 A5 m7 #9',
  m6: 'm3 P5 M6', m: 'm3 P5', m7: 'm3 P5 m7',
  'm7-5': 'm3 d5 m7', m7b5: 'm3 d5 m7', m9: 'm3 P5 m7 M9',
  m11: 'm3 P5 m7 M9 P11', mM7: 'm3 P5 M7', 'mM7(13)': 'm3 P5 M7 M13',
  dim7: 'm3 d5 d7', sus4: 'P4 P5',
};
const DEGREE_NAMES: Readonly<Record<string, string>> = { m9: 'b9', M9: '9', P11: '11', M13: '13' };
const QUALITY_INTERVALS: Readonly<Record<string, readonly IntervalDefinition[]>> = Object.fromEntries(
  [...IREAL_INTERVALS, ...Object.entries(APP_QUALITIES).map(([quality, labels]) => [quality, labels.split(' ')] as const)]
    .map(([quality, labels]) => [quality, [
      { label: 'R', semitones: 0, letterSteps: 0 },
      ...labels.map(label => {
        const degree = DEGREES.get(DEGREE_NAMES[label] ?? label)!;
        return { label, semitones: degree.semitones, letterSteps: degree.size - 1 };
      }),
    ]]),
);

export const SUPPORTED_CHORD_QUALITIES: readonly string[] = Object.keys(QUALITY_INTERVALS);

export const PRACTICE_KEYS = [
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
] as const;

export function parseNote(value: string): SpelledNote {
  const match = /^([A-G])([#]*|[b]*)$/.exec(value);
  if (!match) throw new TypeError(`Invalid note: ${value}`);
  return {
    letter: match[1] as NoteLetter,
    accidental:
      match[2].startsWith("b") ? -match[2].length : match[2].length,
  };
}

export function formatNote(note: SpelledNote): string {
  const accidental =
    note.accidental < 0
      ? "b".repeat(-note.accidental)
      : "#".repeat(note.accidental);
  return `${note.letter}${accidental}`;
}

export function notePitchClass(note: SpelledNote): number {
  return mod(
    NATURAL_PITCHES[LETTERS.indexOf(note.letter)] + note.accidental,
    12,
  );
}

export function parseChordSymbol(symbol: string, allowUnknown = false): ParsedChord | null {
  if (symbol === "N.C.") return null;
  const match = /^([A-G](?:[b#]*))(.*?)(?:\/([A-G](?:[b#]*)))?$/.exec(
    symbol,
  );
  if (!match) throw new TypeError(`Invalid chord: ${symbol}`);
  const suffix = match[2];
  if (!allowUnknown && !Object.hasOwn(QUALITY_INTERVALS, suffix)) {
    throw new TypeError(`Unsupported chord quality: ${symbol}`);
  }
  return {
    root: parseNote(match[1]),
    suffix,
    bass: match[3] ? parseNote(match[3]) : null,
  };
}

export function transposeChordSymbol(
  symbol: string,
  originalKey: string,
  targetKey: string,
  allowUnknown = false,
): string {
  const chord = parseChordSymbol(symbol, allowUnknown);
  if (chord === null) return symbol;
  const source = parseNote(originalKey);
  const target = parseNote(targetKey);
  const root = transposeNote(chord.root, source, target);
  const bass = chord.bass ? transposeNote(chord.bass, source, target) : null;
  return `${formatNote(root)}${chord.suffix}${bass ? `/${formatNote(bass)}` : ""}`;
}

export function describeChord(
  symbol: string,
  originalKey: string,
  targetKey: string,
  allowUnknown = false,
): ChordDescription {
  const transposedSymbol = transposeChordSymbol(symbol, originalKey, targetKey, allowUnknown);
  const chord = parseChordSymbol(transposedSymbol, allowUnknown);
  if (chord === null) {
    return { symbol: transposedSymbol, tones: [], bass: null, noChord: true };
  }
  if (!Object.hasOwn(QUALITY_INTERVALS, chord.suffix)) {
    return { symbol: transposedSymbol, tones: [], bass: null, noChord: false, unsupported: true };
  }
  const tones = QUALITY_INTERVALS[chord.suffix].map((interval) => {
    const note = noteAtInterval(chord.root, interval);
    return {
      interval: interval.label,
      note: formatNote(note),
      pitchClass: notePitchClass(note),
    };
  });
  const bass = chord.bass
    ? {
        note: formatNote(chord.bass),
        pitchClass: notePitchClass(chord.bass),
      }
    : null;
  return { symbol: transposedSymbol, tones, bass, noChord: false };
}

// Count distinct pitches, not the repeated positions across the fretboard.
export function omittedChordIntervals(chord: ChordDescription): ReadonlySet<string> {
  if (chord.unsupported) return new Set();
  const pitches = new Set(chord.tones.map(tone => tone.pitchClass));
  if (chord.bass) pitches.add(chord.bass.pitchClass);
  const explicit = new Set(parseChordSymbol(chord.symbol)?.suffix.match(/[#b]?\d+/g) ?? []);
  const tensions: Readonly<Record<string, string>> = { M9: "9", P11: "11", M13: "13" };
  const priority = (interval: string): number => {
    if (interval === "P5") return 0;
    if (interval === "R") return 1;
    const tension = tensions[interval];
    return tension && !explicit.has(tension) ? 2 : Infinity;
  };
  const candidates = chord.tones.filter(tone =>
    tone.pitchClass !== chord.bass?.pitchClass && Number.isFinite(priority(tone.interval)))
    .sort((a, b) => priority(a.interval) - priority(b.interval));
  const omitted = new Set<string>();
  for (const tone of candidates) {
    if (pitches.size <= 4) break;
    pitches.delete(tone.pitchClass);
    omitted.add(tone.interval);
  }
  return omitted;
}

function noteAtInterval(
  root: SpelledNote,
  interval: IntervalDefinition,
): SpelledNote {
  const rootLetterIndex = LETTERS.indexOf(root.letter);
  const letterIndex = mod(rootLetterIndex + interval.letterSteps, LETTERS.length);
  const pitchClass = mod(notePitchClass(root) + interval.semitones, 12);
  return noteWithPitch(LETTERS[letterIndex], pitchClass);
}

function transposeNote(
  note: SpelledNote,
  sourceKey: SpelledNote,
  targetKey: SpelledNote,
): SpelledNote {
  const letterShift = mod(
    LETTERS.indexOf(targetKey.letter) - LETTERS.indexOf(sourceKey.letter),
    LETTERS.length,
  );
  const pitchShift = mod(
    notePitchClass(targetKey) - notePitchClass(sourceKey),
    12,
  );
  const targetLetter = LETTERS[
    mod(LETTERS.indexOf(note.letter) + letterShift, LETTERS.length)
  ];
  return noteWithPitch(targetLetter, notePitchClass(note) + pitchShift);
}

function noteWithPitch(letter: NoteLetter, pitchClass: number): SpelledNote {
  const naturalPitch = NATURAL_PITCHES[LETTERS.indexOf(letter)];
  let accidental = mod(pitchClass - naturalPitch, 12);
  if (accidental > 6) accidental -= 12;
  return { letter, accidental };
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
