// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { ScoreToken } from './chord-metadata';

export type IrealItem = { token: ScoreToken; column: number; alternate?: boolean; span?: number; repeatColumn?: number; indices: number[]; section?: string };
export type EndingBracket = { label: string; start: number; end: number; begins: boolean; closes: boolean };
export type IrealRow = { items: IrealItem[]; gap: number; endings: EndingBracket[]; leadingBar: boolean };
export type IrealEvent = { chordIndex: number; repeated?: boolean; section?: string; comments: string[] };

// iReal's notation grid is sixteen cells wide. Barlines and annotations do
// not consume cells; compressed spaces have already been expanded by the parser.
export function layoutIreal(blocks: ScoreToken[][]): IrealRow[] {
  return resolveIreal(blocks).rows;
}

export function resolveIreal(blocks: ScoreToken[][]): { rows: IrealRow[]; events: IrealEvent[] } {
  const rows: IrealRow[] = [{ items: [], gap: 0, endings: [], leadingBar: false }];
  let column = 0;
  let lastChord = 0;
  let alternate = false;
  let section: string | undefined;
  const nextRow = () => { rows.push({ items: [], gap: 0, endings: [], leadingBar: false }); column = 0; lastChord = 0; };
  for (const token of blocks.flat()) {
    if (token.kind === 'size' || token.kind === 'divider') continue;
    if (token.kind === 'text' && token.raw === '(') { alternate = true; continue; }
    if (token.kind === 'text' && token.raw === ')') { alternate = false; continue; }
    if (token.kind === 'break') {
      rows.at(-1)!.gap += token.text?.length ?? 1;
      continue;
    }
    const closingBar = token.kind === 'bar' && !['[', '{'].includes(token.raw);
    if (column >= 16 && !closingBar && !alternate && token.kind !== 'comment') nextRow();
    if (token.kind === 'space') { column++; continue; }
    // Expanded repeat tokens can have an empty raw spelling (for example Kcl).
    const cell = token.kind === 'chord' || (token.kind === 'symbol' && ['％', '𝄎', '/'].includes(token.text ?? ''));
    if (token.kind === 'section') section = token.text;
    const position = alternate || token.kind === 'comment' ? lastChord : column;
    rows.at(-1)!.items.push({ token, column: Math.min(16, position), alternate, indices: [], section });
    if (cell && !alternate) { lastChord = column; column++; }
  }
  for (const row of rows) {
    row.leadingBar = row.items.some(item => item.column === 0 && (item.token.kind === 'chord' || isRepeat(item))) &&
      !row.items.some(item => item.column === 0 && item.token.kind === 'bar');
    for (const item of row.items) {
      const next = row.items.find(candidate => candidate.column > item.column && !candidate.alternate &&
        ['chord', 'bar', 'symbol'].includes(candidate.token.kind));
      item.span = Math.max(1, (next?.column ?? 16) - item.column);
    }
  }
  // Brackets span bars and continue across systems until a closing bar or ending.
  let ending: string | undefined;
  for (const row of rows) {
    let start = 0;
    let begins = false;
    const finish = (end: number, closes: boolean) => {
      if (ending && end > start) row.endings.push({ label: ending, start, end, begins, closes });
    };
    for (const item of row.items) {
      if (item.token.kind === 'symbol' && /^N\d/.test(item.token.raw)) {
        finish(item.column, true);
        ending = item.token.raw.slice(1);
        start = item.column;
        begins = true;
      } else if (item.token.kind === 'bar' && ['}', ']', 'Z'].includes(item.token.raw)) {
        finish(item.column, true);
        ending = undefined;
      }
    }
    finish(16, false);
  }
  // Measure boundaries retain the original variable-width grid. A repeat owns
  // its practice occurrences even when their chords come from an earlier bar.
  const located = rows.flatMap((row, r) => row.items.map(item => ({ item, at: r * 16 + item.column, row: r })));
  const boundaries = [...new Set([0, ...located.filter(({ item }) => item.token.kind === 'bar').map(({ at }) => at), rows.length * 16])].sort((a, b) => a - b);
  const events: IrealEvent[] = [];
  const history: number[][] = [];
  let continuation: { chords: number[]; owner: IrealItem } | undefined;
  for (let b = 0; b < boundaries.length - 1; b++) {
    const start = boundaries[b], end = boundaries[b + 1];
    const cells = located.filter(({ at, item }) => at >= start && at < end && item.token.kind !== 'bar');
    const measure: number[] = [];
    const append = (chordIndex: number, owner: IrealItem) => {
      owner.indices.push(events.length);
      events.push({ chordIndex, repeated: isRepeat(owner), section: owner.section, comments: cells.filter(({ item }) => item.token.kind === 'comment').map(({ item }) => commentText(item.token.text ?? '')) });
      if (!owner.alternate) measure.push(chordIndex);
    };
    if (continuation) {
      for (const chord of continuation.chords) append(chord, continuation.owner);
      continuation = undefined;
    } else {
      for (const { item, row } of cells) {
        if (item.token.chordIndex !== undefined) append(item.token.chordIndex, item);
        else if (isRepeat(item)) {
          const twoBars = item.token.text === '𝄎';
          item.repeatColumn = (twoBars ? end : (start + end) / 2) - row * 16;
          const previous = item.token.text === '/' ? (measure.length ? measure.slice(-1) : history.at(-1)?.slice(-1) ?? []) : history.at(twoBars ? -2 : -1) ?? [];
          for (const chord of previous) append(chord, item);
          if (twoBars && previous.length) continuation = { chords: history.at(-1) ?? [], owner: item };
        }
      }
    }
    history.push(measure);
  }
  return { rows: rows.filter(row => row.items.length), events };
}

export function irealChordParts(symbol: string, minor: '-' | 'm' = '-') {
  const match = /^([A-G])([#b]*)(.*?)(?:\/([A-G][#b]*))?$/.exec(symbol);
  if (!match) return { root: symbol, accidental: '', quality: '', bass: '' };
  const quality = match[3].replace(/^mM/, '-△').replace(/^M/, '△')
    .replace(/^m(?!aj|in)/, '-').replace(/^dim/, '°').replace(/^aug/, '+')
    .replaceAll('^', '△').replaceAll('#', '♯').replaceAll('b', '♭');
  return { root: match[1], accidental: match[2].replaceAll('b', '♭').replaceAll('#', '♯'), quality: minor === 'm' ? quality.replace(/^-/, 'm') : quality,
    bass: (match[4] ?? '').replaceAll('b', '♭').replaceAll('#', '♯') };
}

function isRepeat(item: IrealItem): boolean {
  return item.token.kind === 'symbol' && ['％', '𝄎', '/'].includes(item.token.text ?? '');
}

export function commentText(text: string): string {
  return text.replaceAll('XyQ', '   ');
}
