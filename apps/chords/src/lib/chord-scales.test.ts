// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from 'vitest';
import { chordScale, outsideScale, scaleFormula, scaleTones, suggestedScales } from './chord-scales';
import { describeChord } from './chords';

const chord = (symbol: string) => describeChord(symbol, 'C', 'C', true);

it('spells the notes a scale adds over a chord, leaving out the chord tones', () => {
  expect(scaleTones(chord('A7'), chordScale('altered')!).map(tone => `${tone.interval} ${tone.note}`)).toEqual(['b9 Bb', '#9 B#', '#11 D#', 'b13 F']);
  expect(scaleTones(chord('A7'), chordScale('mixolydian')!).map(tone => tone.note)).toEqual(['B', 'D', 'F#']);
  expect(scaleTones(chord('G7'), chordScale('altered')!).map(tone => tone.note)).toEqual(['Ab', 'A#', 'C#', 'Eb']);
  expect(scaleTones(chord('N.C.'), chordScale('altered')!)).toEqual([]);
  expect(scaleTones(chord('Cxyz'), chordScale('altered')!)).toEqual([]);
});

it('names the chord tones a scale leaves out', () => {
  expect([...outsideScale(chord('A7'), chordScale('altered')!)]).toEqual(['P5']);
  expect([...outsideScale(chord('A7'), chordScale('whole-tone')!)]).toEqual(['P5']);
  expect([...outsideScale(chord('A7'), chordScale('mixolydian')!)]).toEqual([]);
  expect([...outsideScale(chord('A7b9'), chordScale('mixolydian')!)]).toEqual(['b9']);
});

it('suggests scales by the kind of chord', () => {
  const ids = (symbol: string) => suggestedScales(chord(symbol)).map(scale => scale.id);
  expect(ids('A7')).toContain('altered');
  expect(ids('A7')[0]).toBe('mixolydian');
  expect(ids('A7#5')).toEqual(['whole-tone', 'altered', 'mixolydian-b13']);
  expect(ids('C^7')[0]).toBe('ionian');
  expect(ids('D-7')[0]).toBe('dorian');
  expect(ids('D-^7')).toEqual(['melodic-minor', 'harmonic-minor']);
  expect(ids('Bh7')).toEqual(['locrian', 'locrian-natural-2']);
  expect(ids('Bo7')).toEqual(['whole-half-diminished']);
  expect(ids('G7sus')[0]).toBe('mixolydian');
  expect(ids('N.C.')).toEqual([]);
});

it('writes a scale as degrees', () => {
  expect(scaleFormula(chordScale('altered')!)).toBe('1 ♭9 ♯9 3 ♯11 ♭13 ♭7');
  expect(scaleFormula(chordScale('blues')!)).toBe('1 ♭3 11 ♭5 5 ♭7');
  expect(chordScale('')).toBeUndefined();
});
