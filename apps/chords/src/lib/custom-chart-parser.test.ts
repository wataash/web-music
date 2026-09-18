// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { parseCustomChartSource } from './custom-chart-parser';

describe('custom chart parser', () => {
  it('builds a line AST without treating an ASCII arrow as an annotation end', () => {
    const lines = parseCustomChartSource(`title: Exercise
composer: Example
key: C
[Part one] 4/4
| C {first phrase -> second phrase} <move D/F# -> G> | (Db7) G7 :|
key: Db`);
    expect(lines.slice(0, 3)).toEqual([
      { kind: 'header', line: 1, name: 'title', value: 'Exercise' },
      { kind: 'header', line: 2, name: 'artist', value: 'Example' },
      { kind: 'header', line: 3, name: 'key', value: 'C' },
    ]);
    expect(lines[3]).toMatchObject({ kind: 'music', line: 4, tokens: [
      { kind: 'section', value: 'Part one' }, { kind: 'word', value: '4/4' },
    ] });
    expect(lines[4]).toMatchObject({ kind: 'music', line: 5, tokens: [
      { kind: 'bar', value: '|' },
      { kind: 'word', value: 'C' },
      { kind: 'lyrics', value: 'first phrase -> second phrase' },
      { kind: 'annotation', value: 'move D/F# -> G' },
      { kind: 'bar', value: '|' },
      { kind: 'alternate', value: 'Db7' },
      { kind: 'word', value: 'G7' },
      { kind: 'bar', value: ':|' },
    ] });
    expect(lines[5]).toEqual({ kind: 'key-change', line: 6, value: 'Db' });
  });

  it.each([
    ['[Part one', 'section with ].'],
    ['C {unfinished', 'lyrics with }.'],
    ['C <unfinished', 'annotation with >.'],
    ['C (Db7', 'alternate with ).'],
  ])('reports an unterminated delimiter in %s', (source, message) => {
    expect(() => parseCustomChartSource(source)).toThrow(`Line 1: close the ${message}`);
  });

  it('rejects whitespace inside an alternate chord', () => {
    expect(() => parseCustomChartSource('C (Db7 G7)')).toThrow('Line 1: an alternate chord cannot contain spaces.');
  });
});
