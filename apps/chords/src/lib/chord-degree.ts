// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// A chord named by its degree in the song's key rather than by its root:
// Dm7 in C is IIm7, and the same chord in every key. The numeral counts
// letters up from the key, so the accidental says how the root leaves the
// major scale — ♭II, ♯IV — the way a chart writes the chord's own root.

import { irealChordParts } from './ireal-layout';
import { notePitchClass, parseChordSymbol, parseNote, type SpelledNote } from './chords';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;
const LETTERS = 'CDEFGAB';
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11] as const;

function degreeNumeral(note: SpelledNote, key: SpelledNote): string {
  const steps = (LETTERS.indexOf(note.letter) - LETTERS.indexOf(key.letter) + 7) % 7;
  let offset = (notePitchClass(note) - notePitchClass(key) - MAJOR_SCALE[steps] + 18) % 12 - 6;
  const accidental = offset < 0 ? '♭'.repeat(-offset) : '♯'.repeat(offset);
  return accidental + NUMERALS[steps];
}

// The chord's quality and bass are written as the charts write them; only
// the roots become numerals. A symbol without a root — N.C. — is left alone.
export function chordDegree(symbol: string, key: string, minor: '-' | 'm' = '-'): string {
  let chord;
  try { chord = parseChordSymbol(symbol, true); } catch { return symbol; }
  if (chord === null) return symbol;
  const tonic = parseNote(key);
  const parts = irealChordParts(symbol, minor);
  const bass = chord.bass ? '/' + degreeNumeral(chord.bass, tonic) : '';
  return degreeNumeral(chord.root, tonic) + parts.quality + bass;
}
