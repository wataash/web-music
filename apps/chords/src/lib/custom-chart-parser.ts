// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type ChartHeaderName = 'title' | 'artist' | 'key' | 'style' | 'tempo';
export type ChartLexeme = Readonly<{
  kind: 'bar' | 'section' | 'lyrics' | 'annotation' | 'alternate' | 'word';
  raw: string;
  value: string;
}>;
export type ChartLine =
  | Readonly<{ kind: 'header'; line: number; name: ChartHeaderName; value: string }>
  | Readonly<{ kind: 'key-change'; line: number; value: string }>
  | Readonly<{ kind: 'blank'; line: number }>
  | Readonly<{ kind: 'music'; line: number; tokens: readonly ChartLexeme[] }>;

const HEADERS: Readonly<Record<string, ChartHeaderName>> = {
  title: 'title', artist: 'artist', composer: 'artist', key: 'key', style: 'style', tempo: 'tempo', bpm: 'tempo',
};
// Read only the leading headers, even while the music below is incomplete.
export function customChartHeaders(source: string) {
  const headers: { name: ChartHeaderName; value: string; line: number }[] = [];
  for (const [line, raw] of source.split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    const match = /^([a-z]+)\s*:\s*(.*)$/i.exec(raw.trim());
    const name = match && HEADERS[match[1].toLowerCase()];
    if (!name || !match) break;
    headers.push({ name, value: match[2].trim(), line });
  }
  return headers;
}

export function setCustomChartHeader(source: string, name: 'title' | 'key', value: string): string {
  const lines = source.split(/\r?\n/);
  for (const header of customChartHeaders(source)) {
    if (header.name === name) lines[header.line] = lines[header.line].replace(/^(\s*[a-z]+\s*:\s*).*$/i, (_, prefix) => prefix + value);
  }
  return lines.join(source.includes('\r\n') ? '\r\n' : '\n');
}

const BAR_TOKENS = ['|]', '|:', ':|', '||', '|'] as const;

function delimited(line: string, start: number, end: string, description: string, lineNumber: number, arrowSafe = false): number {
  for (let index = start + 1; index < line.length; index++) {
    if (line[index] === end && (!arrowSafe || line[index - 1] !== '-')) return index;
  }
  throw new Error(`Line ${lineNumber}: close the ${description} with ${end}.`);
}

function lexLine(line: string, lineNumber: number): ChartLexeme[] {
  const tokens: ChartLexeme[] = [];
  let index = 0;
  while (index < line.length) {
    if (/\s/u.test(line[index])) { index++; continue; }
    const bar = BAR_TOKENS.find(candidate => line.startsWith(candidate, index));
    if (bar) {
      tokens.push({ kind: 'bar', raw: bar, value: bar });
      index += bar.length;
      continue;
    }
    const opening = line[index];
    if (opening === '[' || opening === '{' || opening === '<' || opening === '(') {
      const close = opening === '[' ? ']' : opening === '{' ? '}' : opening === '<' ? '>' : ')';
      const kind = opening === '[' ? 'section' : opening === '{' ? 'lyrics' : opening === '<' ? 'annotation' : 'alternate';
      const end = delimited(line, index, close, kind, lineNumber, opening === '<');
      const raw = line.slice(index, end + 1);
      const value = raw.slice(1, -1);
      if (opening === '(' && /\s/u.test(value)) throw new Error(`Line ${lineNumber}: an alternate chord cannot contain spaces.`);
      tokens.push({ kind, raw, value });
      index = end + 1;
      continue;
    }
    let end = index + 1;
    while (end < line.length && !/\s/u.test(line[end])) end++;
    const raw = line.slice(index, end);
    tokens.push({ kind: 'word', raw, value: raw });
    index = end;
  }
  return tokens;
}

export function parseCustomChartSource(source: string): ChartLine[] {
  const lines: ChartLine[] = [];
  let inHeader = true;
  for (const [index, sourceLine] of source.split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    const lineNumber = index + 1;
    const directive = /^([a-z]+)\s*:\s*(.*)$/i.exec(line);
    const headerName = directive && HEADERS[directive[1].toLowerCase()];
    if (inHeader && directive && headerName) {
      lines.push({ kind: 'header', line: lineNumber, name: headerName, value: directive[2].trim() });
      continue;
    }
    if (!inHeader && directive?.[1].toLowerCase() === 'key') {
      lines.push({ kind: 'key-change', line: lineNumber, value: directive[2].trim() });
      continue;
    }
    if (!line) {
      if (!inHeader) lines.push({ kind: 'blank', line: lineNumber });
      continue;
    }
    inHeader = false;
    lines.push({ kind: 'music', line: lineNumber, tokens: lexLine(line, lineNumber) });
  }
  return lines;
}
