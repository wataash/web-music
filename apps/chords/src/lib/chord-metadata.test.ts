// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, expect, it } from 'vitest';
import { chordAnnotation, sectionStarts, setImportedMetadata, songScore, songComments, uniqueAnnotatedChords } from './chord-metadata';
import { describeChord } from './chords';
beforeEach(() => setImportedMetadata(Object.entries({
  example: { comments: ['Practice'], annotations: [
    { chordIndex: 0, section: 'A', comments: [] },
    { chordIndex: 2, section: 'B', comments: ['Soft'] },
  ], score: { format: 'ireal', fields: [], blocks: [
    [{ kind: 'chord', raw: 'C', chordIndex: 0 }],
    [{ kind: 'chord', raw: 'G7', chordIndex: 1 }],
    [{ kind: 'chord', raw: 'C', chordIndex: 2 }],
    [{ kind: 'comment', raw: 'Fine' }],
  ] } },
  blank: { comments: [], annotations: [], score: { format: 'ireal', fields: [], blocks: [
    [{ kind: 'chord', raw: 'C', chordIndex: 0 }],
    [{ kind: 'break', raw: '\n' }],
    [{ kind: 'chord', raw: 'G', chordIndex: 1 }],
  ] } },
}).map(([id, metadata]) => ({ id, metadata }))));
it('preserves section context, anchored comments and trailing directions', () => {
  expect(songComments('example')).toEqual(['Practice']);
  expect(chordAnnotation('example', 1)).toEqual({ section: 'A', comments: [] });
  expect(chordAnnotation('example', 2)).toEqual({ section: 'B', comments: ['Soft'] });
  expect(chordAnnotation('example', 3)).toEqual({ section: 'B', comments: [] });
  expect(sectionStarts('example')).toEqual([0, 2]);
  expect(sectionStarts('blank')).toEqual([]);
  expect(songScore('example')!.blocks.flat().at(-1)!.raw).toBe('Fine');
  expect(songScore('missing')).toBeUndefined();
  expect(sectionStarts('missing')).toEqual([]);
});
it('merges repeated chords globally or within each section, retaining source positions', () => {
  const chords = ['C', 'G7', 'C'].map((symbol, i) => ({ ...describeChord(symbol, 'C', 'C'), sourceIndices: [i] }));
  expect(uniqueAnnotatedChords(chords).map(chord => chord.sourceIndices)).toEqual([[0, 2], [1]]);
  expect(uniqueAnnotatedChords(chords, [0, 2]).map(chord => chord.sourceIndices)).toEqual([[0], [1], [2]]);
  expect(chords.map(chord => chord.sourceIndices)).toEqual([[0], [1], [2]]);
});

it('replaces imported metadata when the library changes', () => {
  setImportedMetadata([]);
  expect(songScore('example')).toBeUndefined();
  expect(songComments('example')).toEqual([]);
  expect(chordAnnotation('example', 0)).toEqual({ section: undefined, comments: [] });
});
