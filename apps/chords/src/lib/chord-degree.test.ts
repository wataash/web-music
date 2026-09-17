// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from 'vitest';
import { chordDegree } from './chord-degree';

it('names a chord by its degree in the key, spelling accidentals from the major scale', () => {
  expect(chordDegree('D-7', 'C')).toBe('II-7');
  expect(chordDegree('D-7', 'C', 'm')).toBe('IIm7');
  expect(chordDegree('G7', 'C')).toBe('V7');
  expect(chordDegree('C^7', 'C')).toBe('I△7');
  expect(chordDegree('Db7', 'C')).toBe('♭II7');
  expect(chordDegree('F#h7', 'C')).toBe('♯IVh7');
  expect(chordDegree('Bb^7', 'C')).toBe('♭VII△7');
  expect(chordDegree('G/B', 'C')).toBe('V/VII');
  expect(chordDegree('A7(b9,b13)', 'D')).toBe('V7(♭9,♭13)');
  // The same chord in every key, spelt from that key's letters.
  expect(chordDegree('F#-7', 'E')).toBe('II-7');
  expect(chordDegree('Gb-7', 'E')).toBe('♭♭III-7');
  expect(chordDegree('C', 'A')).toBe('♭III');
  expect(chordDegree('N.C.', 'C')).toBe('N.C.');
  expect(chordDegree('Cm7(#13)', 'C')).toBe('I-7(♯13)');
});
