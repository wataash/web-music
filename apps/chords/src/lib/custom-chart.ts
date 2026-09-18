// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import type { ImportedSong } from './chord-import';
import { irealScore } from '@web-music/ireal';
import { formatNote, parseChordSymbol, parseNote, qualityIntervals, SUPPORTED_CHORD_QUALITIES } from './chords';
import { parseCustomChartSource, type ChartHeaderName, type ChartLexeme } from './custom-chart-parser';

const PREFIX_FAMILIES = [
  { pattern: /^(maj|M|△|Δ|\^)/, spellings: ['M', '^', 'maj', '△', 'Δ'] },
  { pattern: /^(min|m|-)/, spellings: ['m', '-', 'min'] },
] as const;
// Editor shorthands, including rewrites that change the literal interpretation.
// https://www.irealpro.com/learn/chord-symbols/ (July 2026)
const IREAL_INPUT_ALIASES: Readonly<Record<string, string>> = {
  m: '-', min: '-', m6: '-6', min6: '-6', m7: '-7', min7: '-7',
  m9: '-9', min9: '-9', m11: '-11', min11: '-11',
  'm#5': '-#5', 'm+5': '-#5', '-+5': '-#5',
  '-^': '-^7', 'm^': '-^7', mM7: '-^7',
  '-add9': '-add2', madd2: '-add2', madd9: '-add2',
  '^': '^7', M7: '^7', maj7: '^7', M9: '^9', maj9: '^9', maj13: '^13',
  '^+': '^7#5', '^#5': '^7#5', '^b5': '^7b5', maj7b5: '^7b5', '^#11': '^7#11',
  dim: 'o', dim7: 'o7', 'o^': 'o^7',
  m7b5: 'h7', 'm7-5': 'h7', '-7b5': 'h7', h: 'h7', ø: 'h7', ø7: 'h7', ø9: 'h9',
  aug: '+', aug7: '7#5', add6: '6', add9: 'add2',
  '7+': '7#5', '+7': '7#5', '7b13': '7#5', '7b5': '7#11', alt: '7alt',
  '7b9#5': '7b9b13', 'aug7(b9)': '7b9b13', '7b9b5': '7b9#11',
  '7#9b5': '7#9#11', '9+': '9#5', '+9': '9#5', '9b5': '9#11',
  '2': 'sus2', sus: 'sus4', '7sus4': '7sus', sus7: '7sus',
  '11': '9sus', '9sus4': '9sus', '7b9sus': '7susb9',
  '7b13sus': '7susb9b13', '7susb13': '7susb9b13',
  // ChordWiki writes an altered fifth after the seventh.
  '7-5': '7#11', '7+5': '7#5', 'M7-5': '^7b5', 'M7+5': '^7#5', augM7: '^7#5', '6add9': '69',
};

function prefixSpellings(quality: string): string[] {
  const candidates = [quality];
  for (const { pattern, spellings } of PREFIX_FAMILIES) {
    if (pattern.test(quality)) for (const prefix of spellings) candidates.push(quality.replace(pattern, prefix));
  }
  return candidates;
}

const supportedQualities = new Set(SUPPORTED_CHORD_QUALITIES);
function normalizeQuality(suffix: string): string | undefined {
  const candidates = prefixSpellings(suffix);
  if (suffix.endsWith('sus4')) candidates.push(suffix.replace(/sus4$/, 'sus'));
  for (const quality of candidates) {
    // Resolve official rewrites before accepting a literal quality.
    const canonical = Object.hasOwn(IREAL_INPUT_ALIASES, quality) ? IREAL_INPUT_ALIASES[quality] : quality;
    if (supportedQualities.has(canonical)) return canonical;
  }
  // Tensions in parentheses, the ChordWiki way: the base is normalized like
  // any other quality and the list is kept, if the whole resolves.
  const parenthesized = /^(.*?)(\([^()]*\))$/.exec(suffix);
  if (!parenthesized) return undefined;
  // A bare M before the parentheses is a major triad, not a major seventh.
  const base = /^M?$/.test(parenthesized[1]) ? '' : normalizeQuality(parenthesized[1]);
  const quality = base === undefined ? undefined : base + parenthesized[2];
  return quality !== undefined && qualityIntervals(quality) !== undefined ? quality : undefined;
}

export function normalizeInputChord(input: string): string {
  if (input === 'n') return 'N.C.';
  const symbol = input.replaceAll('♭', 'b').replaceAll('♯', '#').replaceAll('−', '-');
  const parsed = parseChordSymbol(symbol, true);
  if (!parsed) return symbol;
  const quality = normalizeQuality(parsed.suffix);
  if (quality === undefined) throw new Error(`Unsupported chord: ${input}`);
  return `${formatNote(parsed.root)}${quality}${parsed.bass ? '/' + formatNote(parsed.bass) : ''}`;
}

// The help enumerates the parser's qualities and alias rules, then validates
// each spelling with the same normalization used by the editor.
function notationGroup(quality: string): string {
  if (/^(h|o|dim)/.test(quality) || /^m7(?:b5|-5)$/.test(quality)) return 'Diminished / half-diminished';
  if (/^(aug|\+)/.test(quality)) return 'Augmented';
  if (quality.includes('sus') || quality === '2') return 'Suspended';
  if (/^(maj|M|\^)/.test(quality)) return 'Major';
  if (/^(min|m|-)/.test(quality)) return 'Minor';
  if (/^(7|9|11|13)/.test(quality)) return 'Dominant / tensions';
  return 'Triads / added tones';
}
export const CHORD_NOTATION_GROUPS = (() => {
  const qualities = new Set([...SUPPORTED_CHORD_QUALITIES, ...Object.keys(IREAL_INPUT_ALIASES)]);
  for (const quality of SUPPORTED_CHORD_QUALITIES) {
    for (const spelling of prefixSpellings(quality)) qualities.add(spelling);
    if (quality.endsWith('sus')) qualities.add(quality + '4');
  }
  const groups = new Map<string, string[]>();
  for (const quality of qualities) {
    const canonical = normalizeQuality(quality);
    if (canonical === undefined) continue;
    const group = notationGroup(canonical);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push('A' + quality);
  }
  return [...groups].map(([label, symbols]) => ({ label, symbols }));
})();

// The playlist every custom chart belongs to.
export const CUSTOM_PLAYLIST = 'Custom charts';

export function refreshCustomChart(song: ImportedSong): ImportedSong {
  if (song.customText === undefined) return song;
  // Reinterpret saved input with the current rules, keeping identity and order.
  // Leave an unreadable record intact rather than losing the rest of the library.
  try { return { ...song, ...createCustomChart(song.customText, song.title, song.originalKey, song.id) }; }
  catch { return song; }
}

// A chart typed by hand, in a notation that compiles to iReal's: the bars,
// repeats, endings, sections, time signatures and comments are written the
// way a lead sheet shows them, and the result is an iReal music string, so
// the chart is laid out, practised and exported like an imported one.
//
//   title: Example Blues        ← optional header lines: title, key, artist,
//   key: C                        style, tempo
//   [A] 4/4                     ← section; time signature
//   |: C7 | F7 | C7 % | C7 |    ← |: :| repeat, % previous bar, %% previous two
//   | G7 | F7 | 1. C7 | G7 :|   ← 1. 2. endings
//   | 2. C7 {last time} <Fine> | G7 |] ← {lyrics}, <note>, |] final bar
//   | Dm7 (Db7) G7 | NC |       ← (alternate chord), NC
//
// A line without barlines puts each chord in its own bar; either way each
// line is one row of the chart, its 16 cells shared out among its bars.
const BARS: Readonly<Record<string, string>> = { '|]': 'Z', '|:': '{', ':|': '}', '||': '[', '|': '|' };
const WORDS: Readonly<Record<string, string>> = {
  '%': 'x', '%%': 'r', '/': 'p', segno: 'S', coda: 'Q', fermata: 'f', fine: '<Fine>', 'd.s.': '<D.S.>', 'd.c.': '<D.C.>',
};
type ChartToken = { kind: 'bar' | 'cell' | 'mark' | 'lyrics'; raw: string; chord?: string; alternate?: string; section?: string; lyric?: string; annotation?: string };
const irealComment = (text: string) => `<${text.replaceAll('->', '→').replaceAll('>', '＞')}>`;

function chartToken(token: ChartLexeme): ChartToken {
  const text = token.raw;
  const word = WORDS[text.toLowerCase()];
  if (token.kind === 'bar') return { kind: 'bar', raw: BARS[text] };
  if (word) return 'xrp'.includes(word) ? { kind: 'cell', raw: word } : { kind: 'mark', raw: word };
  if (/^(n|nc|n\.c\.)$/i.test(text)) return { kind: 'cell', raw: 'n', chord: 'N.C.' };
  if (token.kind === 'lyrics') {
    const lyric = token.value;
    // An ASCII arrow contains iReal's closing comment delimiter. Keep the
    // exact editor text locally and use a safe glyph in exported iReal data.
    return { kind: 'lyrics', raw: irealComment(lyric), lyric };
  }
  if (token.kind === 'annotation') {
    const annotation = token.value;
    return { kind: 'mark', raw: irealComment(annotation), annotation };
  }
  // iReal stores a rehearsal mark, while the custom chart keeps and displays
  // the whole section name (for example Aメロ or サビ).
  if (token.kind === 'section') {
    const section = token.value.trim();
    if (!section) throw new Error('Enter a section name between [ and ].');
    const marker = /^intro$/i.test(section) ? 'i' : /^[A-Za-z]/.test(section) ? section[0].toUpperCase() : 'A';
    return { kind: 'mark', raw: '*' + marker, section };
  }
  const time = /^(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (time) return { kind: 'mark', raw: 'T' + (time[1] === '12' && time[2] === '8' ? '12' : time[1] + time[2]) };
  if (/^\d\.$/.test(text)) return { kind: 'mark', raw: 'N' + text[0] };
  if (token.kind === 'alternate') return { kind: 'mark', raw: '', alternate: normalizeInputChord(token.value) };
  return { kind: 'cell', raw: '', chord: normalizeInputChord(text) };
}

export function createCustomChart(text: string, title: string, key: string, id = 'custom-' + crypto.randomUUID()): ImportedSong {
  const header: Partial<Record<ChartHeaderName, string>> = {};
  const chords: string[] = [];
  const chordKeys: string[] = [];
  const positions: { start: number; end: number; chordIndex: number }[] = [];
  const annotations: ImportedSong['metadata']['annotations'] = [];
  const tokenOverrides = new Map<number, { name?: string; text: string }>();
  let raw = '';
  let chordInMeasure: number | undefined;
  const normalizedKey = (written: string) => formatNote(parseNote(written.trim().replaceAll('♭', 'b').replaceAll('♯', '#').replace(/[-m]$/, '')));
  let currentKey = normalizedKey(key);
  // iReal writes the time signature after the bar that opens the row.
  let pendingTime = '';
  const emit = (token: ChartToken) => {
    if (token.kind === 'mark' && token.raw.startsWith('T')) { pendingTime = token.raw; return; }
    if (token.kind !== 'bar') { raw += pendingTime; pendingTime = ''; }
    if (token.kind === 'lyrics') {
      if (chordInMeasure === undefined) throw new Error('Write lyrics after a chord in the same bar.');
      tokenOverrides.set(raw.length, { name: 'lyrics', text: token.lyric ?? '' });
      raw += token.raw;
    } else if (token.chord !== undefined) {
      const spelled = token.raw || token.chord;
      positions.push({ start: raw.length, end: raw.length + spelled.length, chordIndex: chords.length });
      chordInMeasure = chords.length;
      chords.push(token.chord);
      chordKeys.push(currentKey);
      raw += spelled;
    } else if (token.alternate !== undefined) {
      positions.push({ start: raw.length + 1, end: raw.length + 1 + token.alternate.length, chordIndex: chords.length });
      chords.push(token.alternate);
      chordKeys.push(currentKey);
      raw += `(${token.alternate})`;
    } else {
      if (token.kind === 'bar') chordInMeasure = undefined;
      else if (token.raw.startsWith('*')) {
        const section = token.section ?? token.raw.slice(1);
        tokenOverrides.set(raw.length, { text: section });
        annotations.push({ chordIndex: chords.length, section, comments: [] });
      }
      else if (token.raw.startsWith('<')) {
        const annotation = token.annotation ?? token.raw.slice(1, -1);
        tokenOverrides.set(raw.length, { text: annotation });
        annotations.push({ chordIndex: chordInMeasure ?? chords.length, comments: [annotation] });
      }
      raw += token.raw + pendingTime;
      pendingTime = '';
    }
  };
  for (const line of parseCustomChartSource(text)) {
    if (line.kind === 'header') {
      header[line.name] = line.value;
      if (line.name === 'key') currentKey = normalizedKey(line.value);
      continue;
    }
    if (line.kind === 'key-change') {
      currentKey = normalizedKey(line.value);
      tokenOverrides.set(raw.length, { name: 'key-change', text: currentKey });
      raw += `<Key: ${currentKey}>`;
      continue;
    }
    if (line.kind === 'blank') { raw += 'Y'; continue; }
    const barred = line.tokens.some(token => token.kind === 'bar');
    const tokens: ChartToken[] = [];
    for (const token of line.tokens) {
      try { tokens.push(chartToken(token)); }
      catch {
        const bar = 1 + tokens.filter(token => token.kind === (barred ? 'bar' : 'cell')).length - (barred && tokens[0]?.kind === 'bar' ? 1 : 0);
        throw new Error(`Line ${line.line}, bar ${bar}: unrecognized chord “${token.raw}”.`);
      }
    }
    if (!tokens.some(token => token.kind === 'bar')) {
      // Each chord in a bar of its own, as a list of bars.
      if (tokens.some(token => token.kind === 'cell')) tokens.unshift({ kind: 'bar', raw: '[' });
      for (let i = tokens.length - 1; i > 0; i--) if (tokens[i].kind === 'cell') tokens.splice(i + 1, 0, { kind: 'bar', raw: '|' });
    } else {
      const first = tokens.findIndex(token => token.kind === 'bar');
      const last = tokens.findLastIndex(token => token.kind === 'bar');
      if (tokens.slice(0, first).some(token => token.kind === 'cell')) tokens.unshift({ kind: 'bar', raw: '|' });
      if (tokens.slice(last + 1).some(token => token.kind === 'cell')) tokens.push({ kind: 'bar', raw: '|' });
    }
    // A row's leading barline is the bar that closed the row before it.
    if (tokens[0]?.raw === '|' && /[|\]{}Z]$/.test(raw)) tokens.shift();
    // Every row is 16 cells wide: the spare cells go to the bars in turn, and
    // within a bar to its chords, so what is typed as one line stays one row.
    // A two-bar repeat sign spans the bar after it, which is left empty and
    // takes a cell of its own.
    const measures: { tokens: ChartToken[]; width: number }[] = [{ tokens: [], width: 0 }];
    for (const token of tokens) { measures.at(-1)!.tokens.push(token); if (token.kind === 'bar') measures.push({ tokens: [], width: 0 }); }
    for (const [index, measure] of measures.entries()) {
      measure.width = measure.tokens.filter(token => token.kind === 'cell').length;
      const before = measures[index - 1];
      if (measure.width || !before || index === measures.length - 1 || before.tokens.at(-1)!.raw !== '|' || measure.tokens.at(-1)!.raw !== '|') continue;
      if (before.tokens.some(token => token.raw === 'r')) measure.width = 1;
      else throw new Error(`Line ${line.line}: an empty bar between barlines.`);
    }
    const total = measures.reduce((sum, measure) => sum + measure.width, 0);
    if (total > 16) throw new Error(`Line ${line.line}: use at most 16 chords per line; add a line break.`);
    const filled = measures.filter(measure => measure.width);
    for (const measure of measures) {
      const index = filled.indexOf(measure);
      const span = measure.width && measure.width + Math.floor((index + 1) * (16 - total) / filled.length) - Math.floor(index * (16 - total) / filled.length);
      let cell = 0;
      if (measure.width && !measure.tokens.some(token => token.kind === 'cell')) raw += ' '.repeat(span);
      for (const token of measure.tokens) {
        emit(token);
        if (token.kind !== 'cell') continue;
        cell++;
        raw += ' '.repeat(Math.floor(cell * span / measure.width) - Math.floor((cell - 1) * span / measure.width) - 1);
      }
    }
  }
  if (!chords.length) throw new Error('Enter at least one chord.');
  title = (header.title ?? title).trim() || 'Untitled';
  const written = (header.key ?? key).replaceAll('♭', 'b').replaceAll('♯', '#').replace(/m$/, '-');
  const originalKey = formatNote(parseNote(written.replace(/-$/, '')));
  const fields = [title, header.artist ?? '', '', header.style ?? '', written, '', raw, '', header.tempo ?? '', ''];
  const score = irealScore(raw, positions, fields, 6);
  let offset = 0;
  for (const token of score.blocks.flat()) {
    Object.assign(token, tokenOverrides.get(offset));
    offset += token.raw.length;
  }
  return { id, title, artist: header.artist ?? '', originalKey, chords, chordKeys, playlist: CUSTOM_PLAYLIST, customText: text,
    metadata: { comments: [], annotations, score } };
}
