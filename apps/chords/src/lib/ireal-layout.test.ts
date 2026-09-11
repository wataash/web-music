// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from 'vitest';
import { extractIreal, scramble } from '@web-music/ireal';
import { layoutIreal, irealChordParts } from './ireal-layout';

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
