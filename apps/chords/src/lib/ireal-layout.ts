// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { ScoreToken } from './chord-metadata';

export type IrealItem = { token: ScoreToken; column: number; alternate?: boolean; span?: number };
export type IrealRow = { items: IrealItem[]; gap: number };

// iReal's notation grid is sixteen cells wide. Barlines and annotations do
// not consume cells; compressed spaces have already been expanded by the parser.
export function layoutIreal(blocks: ScoreToken[][]): IrealRow[] {
  const rows: IrealRow[] = [{ items: [], gap: 0 }];
  let column = 0;
  let lastChord = 0;
  let alternate = false;
  const nextRow = () => { rows.push({ items: [], gap: 0 }); column = 0; lastChord = 0; };
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
    const cell = token.kind === 'chord' || (token.kind === 'symbol' && ['x', 'r', 'p'].includes(token.raw));
    const position = alternate || token.kind === 'comment' ? lastChord : column;
    rows.at(-1)!.items.push({ token, column: Math.min(16, position), alternate });
    if (cell && !alternate) { lastChord = column; column++; }
  }
  for (const row of rows) {
    for (const item of row.items) {
      const next = row.items.find(candidate => candidate.column > item.column && !candidate.alternate &&
        ['chord', 'bar', 'symbol'].includes(candidate.token.kind));
      item.span = Math.max(1, (next?.column ?? 16) - item.column);
    }
  }
  return rows.filter(row => row.items.length);
}

export function irealChordParts(symbol: string) {
  const match = /^([A-G])([#b]*)(.*?)(?:\/([A-G][#b]*))?$/.exec(symbol);
  if (!match) return { root: symbol, accidental: '', quality: '', bass: '' };
  const quality = match[3].replace(/^mM/, '-△').replace(/^M/, '△')
    .replace(/^m(?!aj|in)/, '-').replace(/^dim/, '°').replace(/^aug/, '+')
    .replaceAll('^', '△').replaceAll('#', '♯').replaceAll('b', '♭');
  return { root: match[1], accidental: match[2].replaceAll('b', '♭').replaceAll('#', '♯'), quality,
    bass: (match[4] ?? '').replaceAll('b', '♭').replaceAll('#', '♯') };
}
