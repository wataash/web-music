// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { createCustomChart, CHORD_NOTATION_GROUPS, refreshCustomChart } from './custom-chart';
import { resolveIreal } from './ireal-layout';
import { describeChord } from './chords';
import { exportIrealLink } from './chord-export';
import { QUALITY_INTERVALS } from '@web-music/ireal/intervals';

const blues = 'A7 D7 A7 A7\nD7 D7 A7 A7\nE7 D7 A7 A7';
describe('custom charts', () => {
  it('documents every supported quality and only advertises usable spellings', () => {
    const symbols = CHORD_NOTATION_GROUPS.flatMap(group => group.symbols);
    expect(new Set(symbols).size).toBe(symbols.length);
    for (const quality of QUALITY_INTERVALS.keys()) expect(symbols).toContain('A' + quality);
    for (const symbol of ['A△7', 'Aø7', 'Adim', 'Aaug', 'A7sus4', 'AmM7(13)', 'Amaj13#11']) expect(symbols).toContain(symbol);
    for (const symbol of symbols) {
      const song = createCustomChart(symbol + '/C#', '', 'A');
      expect(describeChord(song.chords[0], 'A', 'C').tones.length).toBeGreaterThan(0);
    }
  });
  it.each([
    ['A△7', 'A^7'], ['AΔ7', 'A^7'], ['Aø7', 'Ah7'], ['Aø', 'Ah7'], ['Aø9', 'Ah9'],
    ['Adim', 'Ao'], ['Aaug', 'A+'], ['A7sus4', 'A7sus'],
    ['Amaj7', 'A^7'], ['Amaj13', 'A^13'], ['AM13#11', 'Amaj13#11'],
    ['Am13', 'Amin13'], ['Am7b6', 'Amin7b6'], ['Am9b6', 'Amin9b6'],
    ['Amin7', 'A-7'], ['Amin/C#', 'A-/C#'], ['B♭△7/F', 'Bb^7/F'],
  ])('resolves %s to %s with the same tones after transposition', (input, expected) => {
    const song = createCustomChart(input, '', 'A');
    expect(song.chords).toEqual([expected]);
    expect(describeChord(song.chords[0], 'A', 'C')).toEqual(describeChord(expected, 'A', 'C'));
    expect(song.customText).toBe(input);
  });
  it('keeps the twelve bars in three rows with selectable practice occurrences', () => {
    const song = createCustomChart(blues, 'Blues', 'A');
    const { rows, events } = resolveIreal(song.metadata.score.blocks);
    expect(rows).toHaveLength(3);
    expect(rows.map(row => row.items.filter(item => item.token.kind === 'chord').map(item => item.column))).toEqual([[0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12]]);
    expect(events.map(event => song.chords[event.chordIndex])).toEqual(blues.split(/\s+/));
    expect(describeChord(song.chords[0], 'A', 'C').symbol).toBe('C7');
  });
  it('supports explicit measures, multiple chords, unicode spaces and uneven row lengths', () => {
    const song = createCustomChart(' | Dm7　G7 | Cmaj7 |\r\n\nF♯m7/C♯ N.C. A7', '', 'C');
    expect(song.chords).toEqual(['D-7', 'G7', 'C^7', 'F#-7/C#', 'N.C.', 'A7']);
    const { rows, events } = resolveIreal(song.metadata.score.blocks);
    expect(rows).toHaveLength(2);
    expect(events).toHaveLength(6);
    expect(rows[0].items.filter(item => item.token.kind === 'bar').map(item => item.column)).toEqual([0, 8, 16]);
    expect(song.title).toBe('Untitled');
  });
  it('preserves editable source and identity while replacing content', () => {
    const original = createCustomChart(blues, 'Blues', 'A');
    const edited = createCustomChart('Dm7 G7', 'Exercise', 'C', original.id);
    expect(edited.id).toBe(original.id);
    expect(edited.customText).toBe('Dm7 G7');
    expect(edited.chords).toEqual(['D-7', 'G7']);
    expect(() => exportIrealLink([edited])).toThrow('text export');
  });
  it.each(['', 'A7 | | D7', 'A7 nonsense', 'Cwat', 'Amaj123', 'Aø13', 'Adimwat', 'A7sus44', 'C '.repeat(17)])('rejects invalid input: %s', input => {
    expect(() => createCustomChart(input, '', 'C')).toThrow();
  });
});

describe('iReal editor compatibility', () => {
  it.each([
    ['A^ Ah A11 A7b5 A7b13', ['A^7', 'Ah7', 'A9sus', 'A7#11', 'A7#5']],
    ['Am+5 A-+5 A-^ Am^', ['A-#5', 'A-#5', 'A-^7', 'A-^7']],
    ['A-add2 A-add9 Amadd2 Amadd9', ['A-add2', 'A-add2', 'A-add2', 'A-add2']],
    ['A^+ A^#5 A^b5 A^#11 Ao^', ['A^7#5', 'A^7#5', 'A^7b5', 'A^7#11', 'Ao^7']],
    ['Aadd6 Aadd9 A7+ A+7 Aalt', ['A6', 'Aadd2', 'A7#5', 'A7#5', 'A7alt']],
    ['A7b9#5 A7b9b5 A7#9b5 A9+ A+9 A9b5', ['A7b9b13', 'A7b9#11', 'A7#9#11', 'A9#5', 'A9#5', 'A9#11']],
    ['A2 Asus Asus7 A7b9sus A7b13sus A7susb13', ['Asus2', 'Asus4', 'A7sus', 'A7susb9', 'A7susb9b13', 'A7susb9b13']],
    ['Amin13 Amaj13#11 Amaj7b5 Amin7b6 Amin9b6', ['Amin13', 'Amaj13#11', 'A^7b5', 'Amin7b6', 'Amin9b6']],
  ])('normalizes the official shorthands %s', (input, expected) => {
    expect(createCustomChart(input, '', 'A').chords).toEqual(expected);
  });
  it.each([
    ['A^', ['A', 'C#', 'E', 'G#']],
    ['Ah', ['A', 'C', 'Eb', 'G']],
    ['A11', ['A', 'D', 'E', 'G', 'B']],
    ['A7b5', ['A', 'C#', 'E', 'G', 'D#']],
    ['A7b13', ['A', 'C#', 'E#', 'G']],
    ['A7b13sus', ['A', 'D', 'E', 'G', 'Bb', 'F']],
    ['A-add9', ['A', 'C', 'E', 'B']],
  ])('uses iReal harmony for %s', (input, notes) => {
    const song = createCustomChart(input + '/C#', '', 'A');
    const chord = describeChord(song.chords[0], 'A', 'A');
    expect(chord.tones.map(tone => tone.note)).toEqual(notes);
    expect(chord.bass?.note).toBe('C#');
    expect(describeChord(song.chords[0], 'A', 'B').tones.map(tone => tone.pitchClass))
      .toEqual(chord.tones.map(tone => (tone.pitchClass + 2) % 12));
  });
  it('accepts n as no chord without inventing a root or a slash bass', () => {
    expect(createCustomChart('A7 n N.C.', '', 'A').chords).toEqual(['A7', 'N.C.', 'N.C.']);
    expect(() => createCustomChart('n/C#', '', 'A')).toThrow();
  });
  it('refreshes old custom charts from source without changing their identity or import order', () => {
    const stored = { ...createCustomChart('A^ Ah A11', 'Saved', 'A', 'custom-old'),
      chords: ['A^', 'Ah', 'A11'], importedAt: 123 };
    const updated = refreshCustomChart(stored);
    expect(updated.chords).toEqual(['A^7', 'Ah7', 'A9sus']);
    expect(updated.id).toBe('custom-old');
    expect(updated.importedAt).toBe(123);
    expect(updated.customText).toBe('A^ Ah A11');
    expect(resolveIreal(updated.metadata.score.blocks).events).toHaveLength(3);
    const imported = { ...stored, customText: undefined };
    expect(refreshCustomChart(imported)).toBe(imported);
  });
});
