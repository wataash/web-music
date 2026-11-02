// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from 'vitest';
import { chordSymbolsHtml } from './chord-symbols';

it('preserves every supported spelling, including Roman degrees and relative-key prose', () => {
  const spellings = ['Δ7', 'maj7', 'M7', 'm7', '-7', 'min7', 'mi7', 'ø7', 'm7(♭5)', 'm7♭5', '°7', 'mΔ7', 'm(maj7)', 'mM7', 'Δ7(♯5)'];
  const symbols = ['B♭', 'F♯', 'B𝄫', 'C𝄪', 'I', 'iv', '♭III'].flatMap(root => spellings.map(suffix => root + suffix));
  symbols.push('i7', 'i-7', 'im7', 'Im7', 'I-7', '(viiø7 → III7 → vim7 in C major)');
  for (const text of symbols) {
    const html = chordSymbolsHtml(text);
    expect(html).toContain('class="chord-symbol"');
    expect(html.replace(/<[^>]*>/g, '')).toBe(text);
  }
});

it('separates root accidentals from alterations without formatting ordinary prose', () => {
  const html = chordSymbolsHtml('B♭m7(♭5)');
  expect(html).toContain('class="chord-accidental"');
  expect(html).toContain('class="chord-modifier"');
  expect(html).toContain('data-glyph="\uED60" aria-hidden="true"');
  expect(html).toContain('<span class="reading">♭</span>');
  expect(chordSymbolsHtml('A minor, C major, interval 7, Aim7, C7unknown')).not.toContain('chord-symbol');
  expect(chordSymbolsHtml('<script> & "C7"')).toBe('&lt;script&gt; &amp; &quot;C7&quot;');
});

it('runs in the card document without module dependencies', () => {
  const embedded = Function(`return (${chordSymbolsHtml.toString()})`)() as typeof chordSymbolsHtml;
  expect(embedded('F♯mΔ7')).toBe(chordSymbolsHtml('F♯mΔ7'));
  expect(embedded('B♭m',true)).toBe(chordSymbolsHtml('B♭m',true));
});

it('engraves bare triads and extended core spellings only in explicit chord fields', () => {
  for (const text of ['C','B♭','Am','A-','Amin','Ami','Caug','B°','Fsus4','C(♭5)','Cm(♯5)','F7sus4','Cadd9','Cm(add4)','C°Δ7','C°maj7']) {
    const html=chordSymbolsHtml(text,true);expect(html).toContain('class="chord-symbol"');expect(html.replace(/<[^>]*>/g,'')).toBe(text);
  }
  expect(chordSymbolsHtml('A minor, C major')).not.toContain('chord-symbol');
  expect(chordSymbolsHtml('A-',true)).toContain('data-glyph="\uE874"');
  expect(chordSymbolsHtml('B°',true)).toContain('data-glyph="\uE870"');
});
