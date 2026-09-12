// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from 'vitest';
import { extractIreal, scramble } from '@web-music/ireal';
import { layoutIreal, irealChordParts, resolveIreal, commentText } from './ireal-layout';

function score(raw: string) {
  return extractIreal('irealb://' + encodeURIComponent('Grid=Example==Swing=C==1r34LbKcu7' + scramble(raw) + '==0=0')).score.blocks;
}

it('keeps seventeen four-cell bars on five rows regardless of viewport width', () => {
  const rows = layoutIreal(score('*A[T44' + 'C-7XyQ|'.repeat(8) + '*B[' + 'F^7XyQ|'.repeat(8) + 'G7XyQZ '));
  expect(rows).toHaveLength(5);
  expect(rows.map(row => row.items.filter(item => item.token.kind === 'chord').map(item => item.column)))
    .toEqual([[0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12], [0, 4, 8, 12], [0]]);
  expect(rows[2].items.find(item => item.token.kind === 'section')?.column).toBe(0);
});

it('gives compressed bar repeats the same cells and rows as literal repeats', () => {
  const compressed = layoutIreal(score('[T44' + 'C7XyQKcl LZ x LZ x LZ'.repeat(4)));
  const literal = layoutIreal(score('[T44' + 'C7   |x   | x  | x  |'.repeat(4)));
  const positions = (rows: ReturnType<typeof layoutIreal>) => rows.map(row => row.items.map(item =>
    [item.token.kind, item.token.text, item.column]));
  expect(positions(compressed)).toEqual(positions(literal));
  expect(compressed).toHaveLength(4);
  for (const row of compressed) {
    expect(row.items.filter(item => item.token.kind === 'chord').map(item => item.column)).toEqual([0]);
    expect(row.items.filter(item => item.token.text === '％').map(item => item.column)).toEqual([4, 9, 13]);
  }
});

it('places alternate chords above their main chord and keeps narrow chords in their cells', () => {
  const row = layoutIreal(score('[C7(D7b9) sEb7,E7|F7XyQZ'))[0];
  expect(row.items.filter(item => item.token.kind === 'chord').map(item => [item.column, item.alternate]))
    .toEqual([[0, false], [0, true], [2, false], [3, false], [4, false]]);
});

it('retains variable bar widths and displays chord qualities in iReal notation', () => {
  const row = layoutIreal(score('[C |F XyQ G7XyQZ'))[0];
  expect(row.items.filter(item => item.token.kind === 'bar').map(item => item.column)).toEqual([0, 2, 12]);
  expect(irealChordParts('Bbm7')).toEqual({ root: 'B', accidental: '♭', quality: '-7', bass: '' });
  expect(irealChordParts('EbM7/G')).toEqual({ root: 'E', accidental: '♭', quality: '△7', bass: 'G' });
});

it('carries ending brackets across rows and closes them at repeat and final bars', () => {
  const rows = layoutIreal(score('{N1' + 'C7XyQ|'.repeat(4) + 'F7XyQ}N2G7XyQ|C7XyQZ'));
  expect(rows[0].endings).toEqual([{ label: '1', start: 0, end: 16, begins: true, closes: false }]);
  expect(rows[1].endings).toEqual([
    { label: '1', start: 0, end: 4, begins: false, closes: true },
    { label: '2', start: 4, end: 12, begins: true, closes: true },
  ]);
  expect(layoutIreal(score('[C7XyQZ'))[0].endings).toEqual([]);
});

it('resolves chord and bar repeats while keeping each occurrence on its written symbol', () => {
  const { rows, events } = resolveIreal(score('*A[C7 p |D7XyQ|XyQr| XyQ|*B xXyQZ'));
  expect(events.map(event => event.chordIndex)).toEqual([0, 0, 1, 0, 0, 1, 1]);
  const repeats = rows.flatMap(row => row.items).filter(item => ['/', '𝄎', '％'].includes(item.token.text ?? ''));
  expect(repeats.map(item => item.indices)).toEqual([[1], [3, 4, 5], [6]]);
  expect(events.at(-1)?.section).toBe('B');
});

it('centers repeat signs using variable-width bar boundaries', () => {
  const row = layoutIreal(score('[C |x XyQ|D7 XyQZ'))[0];
  expect(row.items.find(item => item.token.text === '％')?.repeatColumn).toBe(4.5);
  const double = layoutIreal(score('[C7XyQ|D7XyQ|XyQr|XyQZ'))[0];
  expect(double.items.find(item => item.token.text === '𝄎')?.repeatColumn).toBe(12);
});

it('does not invent chords for unresolved repeats or copy alternate chords into repeated bars', () => {
  expect(resolveIreal(score('[xXyQ|C7(D7)XyQ|xXyQZ')).events.map(event => event.chordIndex)).toEqual([0, 1, 0]);
});

it('leaves leading blank cells empty and decodes annotation spacing without mutating the source', () => {
  const blocks = score('[C7XyQ|D7XyQ|E7XyQ|F7XyQ}XyQXyQ LZN2G7<XyQFine>XyQ|C7XyQZ');
  const before = JSON.stringify(blocks);
  expect(layoutIreal(blocks)[1].leadingBar).toBe(false);
  expect(commentText('XyQXyQFine')).toBe('      Fine');
  expect(JSON.stringify(blocks)).toBe(before);
});

it.skipIf(!process.env.IREAL_PLAYLIST_PATH)('retains every written chord while resolving the local playlist', async () => {
  const { readFileSync } = await import('node:fs');
  const { extractIrealPlaylist } = await import('@web-music/ireal');
  const { songs } = extractIrealPlaylist(readFileSync(process.env.IREAL_PLAYLIST_PATH!, 'utf8'));
  for (const song of songs) {
    const { events } = resolveIreal(song.score.blocks);
    expect(events.filter(event => !event.repeated).map(event => event.chordIndex), song.title)
      .toEqual(song.chords.map((_, i) => i));
  }
});

it('changes minor notation without changing roots, basses or other chord qualities', () => {
  expect(irealChordParts('BbmM7/Db', 'm')).toEqual({ root: 'B', accidental: '♭', quality: 'm△7', bass: 'D♭' });
  expect(irealChordParts('C7b9', 'm').quality).toBe('7♭9');
  expect(irealChordParts('Cdim7', 'm').quality).toBe('°7');
});
