// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Typesetting only: keep the chosen spelling and the surrounding prose intact.
// Self-contained so the same formatter can run inside a card's iframe.
export function chordSymbolsHtml(text: string, allowBareChords = false): string {
  const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  // Leland Text's chord glyphs, as used by MuseScore's Standard style.
  const glyphs: Record<string, string> = { '♭':'\uED60', '♮':'\uED61', '♯':'\uED62', '𝄪':'\uED63', '𝄫':'\uED64', 'Δ':'\uE873', '△':'\uE873', 'ø':'\uE871', '°':'\uE870', '-':'\uE874' };
  const music = (value: string) => [...value].map(char => glyphs[char]
    ? `<span class="chord-music" data-glyph="${glyphs[char]}" aria-hidden="true"></span><span class="reading">${char}</span>`
    : escape(char)).join('');
  const span = (role: string, value: string) => `<span class="chord-${role}">${music(value)}</span>`;
  // Bare roots/triads are allowed only in fields known to contain a chord.
  // Relative-key prose still uses the strict numbered-chord pattern.
  const start = /(^|[\s(→])/u;
  const roots = /[♭♯♮𝄪𝄫]*[ivIV]+|[A-G][♭♯♮𝄪𝄫]*/u;
  const numbered = /(?:[ø°]?(?:maj|min|mi|mM|m|M|-)?[Δ△ø°]{0,2}\d+(?:sus[24])?|m\(maj\d+\))/u;
  const bare = /(?:min|mi|m|-|aug|°|sus[24]|m?add\d+|m\(add\d+\))?/u;
  const modifiersPattern = /((?:\([♭♯]\d+\)|[♭♯]\d+)*)/u;
  const finish = /(?=$|[\s)→])/u;
  const qualityPattern = numbered.source + (allowBareChords ? '|' + bare.source : '');
  const pattern = new RegExp(start.source + '(' + roots.source + ')(' + qualityPattern + ')' + modifiersPattern.source + finish.source, 'gu');
  let html = '', end = 0;
  for (const match of text.matchAll(pattern)) {
    const [whole, before, root, quality, modifiers] = match;
    html += escape(text.slice(end, match.index) + before);
    const rootHtml = root.split(/([♭♯♮𝄪𝄫]+)/u).map(value => /^[♭♯♮𝄪𝄫]+$/u.test(value) ? span('accidental', value) : escape(value)).join('');
    const qualityHtml = quality.split(/(\(maj\d+\)|\d+|[Δ△]|[ø°]|maj|min|mi|M)/u).map(value => {
      if (/^\d+$/.test(value)) return span('extension', value);
      if (/^[Δ△]$/.test(value)) return span('triangle', value);
      if (/^[ø°]$/.test(value)) return span('quality', value);
      if (value.startsWith('(')) return span('modifier', value);
      if (/^(maj|min|mi|M)$/.test(value)) return span('quality-text', value);
      return music(value);
    }).join('');
    html += `<span class="chord-symbol">${rootHtml}${qualityHtml}${modifiers ? span('modifier', modifiers) : ''}</span>`;
    end = match.index + whole.length;
  }
  return html + escape(text.slice(end));
}

export const CHORD_SYMBOL_CSS = `
.chord-symbol { display:inline-block; white-space:nowrap; font-family:"Flashcard Chords",serif; font-weight:400; font-synthesis:none; }
.chord-music { font-family:"Flashcard Chord Symbols",serif; }
.chord-music::before { content:attr(data-glyph); }
.chord-accidental, .chord-triangle, .chord-extension,
.chord-modifier, .chord-quality-text { font-size:1em; }
.chord-quality { font-size:.5em; position:relative; top:-.6em; margin-right:.1em; }
`;
