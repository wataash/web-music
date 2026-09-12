// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import type { ImportedSong } from './chord-import';
import type { ScoreToken } from './chord-metadata';
import { formatNote, parseChordSymbol, parseNote, SUPPORTED_CHORD_QUALITIES } from './chords';

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
}

function normalizeInputChord(input: string): string {
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

export function refreshCustomChart(song: ImportedSong): ImportedSong {
  if (song.customText === undefined) return song;
  // Reinterpret saved input with the current rules, keeping identity and order.
  // Leave an unreadable record intact rather than losing the rest of the library.
  try { return { ...song, ...createCustomChart(song.customText, song.title, song.originalKey, song.id) }; }
  catch { return song; }
}

export function createCustomChart(text: string, title: string, key: string, id = 'custom-' + crypto.randomUUID()): ImportedSong {
  parseNote(key);
  title = title.trim() || 'Untitled';
  const chords: string[] = [];
  const blocks: ScoreToken[][] = [];
  for (const [lineIndex, source] of text.split(/\r?\n/).entries()) {
    const line = source.trim();
    if (!line) continue;
    const measures = line.includes('|') ? line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(bar => bar.trim().split(/\s+/)) : line.split(/\s+/).map(chord => [chord]);
    const count = measures.reduce((sum, bar) => sum + bar.length, 0);
    if (count > 16) throw new Error(`Line ${lineIndex + 1}: use at most 16 chords per line; add a line break.`);
    let column = 0;
    const row: ScoreToken[] = [{ kind: 'bar', raw: '[', text: '║', label: 'Opening double barline' }];
    // Allocate all 16 cells to this input line, keeping each measure at least
    // wide enough for its chords. Input line breaks then survive every view.
    const spare = 16 - count;
    for (const [barIndex, bar] of measures.entries()) {
      const width = bar.length + Math.floor((barIndex + 1) * spare / measures.length) - Math.floor(barIndex * spare / measures.length);
      const start = column;
      for (const [offset, input] of bar.entries()) {
        let symbol: string;
        try { symbol = normalizeInputChord(input); }
        catch { throw new Error(`Line ${lineIndex + 1}, bar ${barIndex + 1}: unrecognized chord “${input}”.`); }
        row.push({ kind: 'chord', raw: symbol, chordIndex: chords.length });
        chords.push(symbol);
        column++;
        const end = start + Math.floor((offset + 1) * width / bar.length);
        while (column < end) { row.push({ kind: 'space', raw: ' ', text: ' ' }); column++; }
      }
      row.push({ kind: 'bar', raw: '|', text: '│', label: 'Barline' });
    }
    blocks.push(row);
  }
  if (!chords.length) throw new Error('Enter at least one chord.');
  return { id, title, artist: '', originalKey: key, chords, playlist: 'My charts', customText: text,
    metadata: { comments: [], annotations: [], score: { format: 'ireal', fields: [{ label: 'Title', value: title }, { label: 'Original key', value: key }], blocks } } };
}
