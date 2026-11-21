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

export const CHART_LINE_BREAK = /\r\n|[\r\n]/;

const HEADERS: Readonly<Record<string, ChartHeaderName>> = {
  title: 'title', artist: 'artist', composer: 'artist', key: 'key', style: 'style', tempo: 'tempo', bpm: 'tempo',
};
// Read only the leading headers, even while the music below is incomplete.
export function customChartHeaders(source: string) {
  const headers: { name: ChartHeaderName; value: string; line: number }[] = [];
  for (const [line, raw] of source.split(CHART_LINE_BREAK).entries()) {
    if (!raw.trim()) continue;
    const match = /^([a-z]+)\s*:\s*(.*)$/i.exec(raw.trim());
    const name = match && HEADERS[match[1].toLowerCase()];
    if (!name || !match) break;
    headers.push({ name, value: match[2].trim(), line });
  }
  return headers;
}

export function setCustomChartHeader(source: string, name: 'title' | 'key', value: string): string {
  // Retain each separator so changing a header cannot reformat the rest of the chart.
  const parts = source.split(/(\r\n|[\r\n])/);
  for (const header of customChartHeaders(source)) {
    if (header.name !== name) continue;
    // The key selector changes the tonic, not the existing major/minor mode.
    const minor = name === 'key' ? /[-m]$/.exec(header.value)?.[0] ?? '' : '';
    const index = header.line * 2;
    parts[index] = parts[index].replace(/^(\s*[a-z]+\s*:\s*).*$/i, (_, prefix) => prefix + value + minor);
  }
  return parts.join('');
}

const BAR_TOKENS = ['|]', '|:', ':|', '||', '|'] as const;

function delimited(line: string, start: number, end: string, description: string, lineNumber: number, arrowSafe = false): number {
  let depth = 1;
  for (let index = start + 1; index < line.length; index++) {
    if (end === ')' && line[index] === '(') depth++;
    if (line[index] !== end || (arrowSafe && line[index - 1] === '-')) continue;
    depth--;
    if (depth === 0) return index;
  }
  throw new Error(`Line ${lineNumber}: close the ${description} with ${end}.`);
}

function lexLine(line: string, lineNumber: number): ChartLexeme[] {
  const tokens: ChartLexeme[] = [];
  const barAt = (offset: number) => BAR_TOKENS.find(bar => line.startsWith(bar, offset));
  let index = 0;
  while (index < line.length) {
    if (/\s/u.test(line[index])) { index++; continue; }
    const bar = barAt(index);
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
    while (end < line.length && !/\s/u.test(line[end]) && !barAt(end)) end++;
    const raw = line.slice(index, end);
    tokens.push({ kind: 'word', raw, value: raw });
    index = end;
  }
  return tokens;
}

export function parseCustomChartSource(source: string): ChartLine[] {
  const lines: ChartLine[] = [];
  let inHeader = true;
  for (const [index, sourceLine] of source.split(CHART_LINE_BREAK).entries()) {
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
