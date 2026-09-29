// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { formatNoteName, musicGlyphMetrics, musicGlyphScript, MUSIC_GLYPH_CSS, MUSIC_GLYPH_SCRIPT, renderMusicGlyphSvg, renderMusicTextHtml, renderStaffMusicGlyph, staffMusicGlyphBounds } from './index';

describe('formatNoteName', () => {
  it('formats only the first note letter and its accidental', () => {
    expect(formatNoteName('Bbmaj7')).toBe('B♭maj7');
    expect(formatNoteName('c##-7')).toBe('c𝄪-7');
    expect(formatNoteName('Fbb/G#')).toBe('F𝄫/G#');
    expect(formatNoteName('Ax9')).toBe('A𝄪9');
    expect(formatNoteName('C#extra')).toBe('C♯extra');
    expect(formatNoteName('hello #')).toBe('hello #');
  });

  it('can run as an embedded function without module references', () => {
    const embedded = Function(`return (${formatNoteName.toString()})`)() as typeof formatNoteName;
    expect(embedded('eb')).toBe('e♭');
  });
});

describe('glyph markup', () => {
  it('anchors original Maestro outlines in staff units without font fallback', () => {
    const sharp = renderStaffMusicGlyph('♯', 100, 200, 250, 'start');
    expect(sharp).toContain('x="100" y="-144"');
    expect(Number(/ width="([^"]+)"/.exec(sharp)?.[1])).toBeCloseTo(238);
    expect(Number(/ height="([^"]+)"/.exec(sharp)?.[1])).toBeCloseTo(683);
    expect(sharp).toContain('d="M170 -314H199');
    expect(staffMusicGlyphBounds('𝄞', 250)).toEqual({ top: -1170, bottom: 690, width: 683 });
    expect(renderStaffMusicGlyph('?', 0, 0, 10)).toBe('');
    expect(() => renderStaffMusicGlyph('♯', 0, 0, 0)).toThrow(RangeError);
  });

  it('preserves the source aspect ratios and renders outlines without added strokes', () => {
    for (const symbol of ['♭', '♯', '♮', '𝄪', '𝄫']) {
      const svg = renderMusicGlyphSvg(symbol, { glyphStyle: 'engraved' });
      const [, , width, height] = /viewBox="([^"]+)"/.exec(svg)![1].split(' ').map(Number);
      const metrics = musicGlyphMetrics(symbol, 'engraved')!;
      expect(metrics.width / metrics.height).toBeCloseTo(width / height);
      const paths = svg.match(/<path[^>]+>/g)!;
      expect(paths.length).toBe(1);
      for (const path of paths) expect(path).toContain('fill="currentColor" stroke="none"');
    }
  });

  it('uses the original Finale Maestro Text outline bounds per em for note names', () => {
    for (const symbol of ['♭', '♯', '♮', '𝄪', '𝄫']) {
      const svg = renderMusicGlyphSvg(symbol, { glyphStyle: 'engraved' });
      const [, top, width, height] = /viewBox="([^"]+)"/.exec(svg)![1].split(' ').map(Number);
      const metrics = musicGlyphMetrics(symbol, 'engraved')!;
      expect(metrics.width).toBe(width / 1000);
      expect(metrics.height).toBe(height / 1000);
      expect(metrics.baseline).toBe((top + height) / 1000);
    }
  });

  it('escapes arbitrary text while leaving the original symbol available to readers', () => {
    const html = renderMusicTextHtml('A♭<script> & "△" Δ');
    expect(html).toContain('<span class="reading">♭</span>');
    expect(html).toContain('<span class="reading">△</span>');
    expect(html).toContain('<span class="reading">Δ</span>');
    expect(html).toContain('&lt;script&gt; &amp; &quot;');
    expect(html).not.toContain('<script>');
  });

  it('preserves the original paths and flat stroke metrics without CSS', () => {
    const flat = renderMusicGlyphSvg('♭');
    expect(flat).toContain('d="M3.3 1L2.2 15" stroke-width="0.75"');
    expect(flat).toContain('d="M2.8 8.3C9.2 3.4 11.2 8.7 2.2 15C8.2 8.9 8 6.2 2.9 9.6Z" fill="currentColor" stroke="none"');
    expect(renderMusicGlyphSvg('♯')).toContain('M1 11.6L9.2 10.2');
    expect(renderMusicGlyphSvg('Δ')).toContain('M5 1.2L9 12.8H1Z');
    expect(renderMusicGlyphSvg('△')).toContain('M5 1.2L9 12.8H1Z');
    expect(renderMusicGlyphSvg('x')).toBe('');
    expect(MUSIC_GLYPH_CSS).toContain('.glyph.flat .stem { stroke-width: 0.75; }');
    expect(musicGlyphMetrics('♭')).toEqual({ width: 0.44, height: 0.96, baseline: 0.06 });
  });

  it('selects the engraved flat while keeping chart defaults and other glyphs unchanged', () => {
    const chart = renderMusicGlyphSvg('♭');
    const engraved = renderMusicGlyphSvg('♭', { glyphStyle: 'engraved' });
    expect(renderMusicGlyphSvg('♭', { glyphStyle: 'chart' })).toBe(chart);
    expect(chart).toContain('d="M3.3 1L2.2 15"');
    expect(engraved).toContain('d="M288 283');
    expect(engraved).not.toContain('d="M3.3 1L2.2 15"');
    expect(engraved).toContain('fill="currentColor" stroke="none"');
    expect(engraved).not.toContain('M2.8 8.3C9.2 3.4');
    for (const symbol of ['Δ', '△']) {
      expect(renderMusicGlyphSvg(symbol, { glyphStyle: 'engraved' })).toBe(renderMusicGlyphSvg(symbol));
    }
    expect(renderMusicGlyphSvg('♯', { glyphStyle: 'engraved' })).not.toBe(renderMusicGlyphSvg('♯'));
    expect(musicGlyphMetrics('♯', 'engraved')).toEqual({ width: 0.267, height: 0.871, baseline: 0.072 });
    expect(musicGlyphMetrics('𝄪', 'engraved')).toEqual({ width: 0.34, height: 0.341, baseline: -0.192 });
    expect(musicGlyphMetrics('♭', 'engraved')?.height).toBe(0.823);
    expect(musicGlyphMetrics('x', 'engraved')).toBeUndefined();
  });

  it('preserves the chart text for natural and double accidentals and renders them in engraved style', () => {
    const symbols = ['♯', '♮', '𝄪', '𝄫'];
    for (const symbol of symbols.slice(1)) {
      expect(renderMusicTextHtml(symbol)).toBe(symbol);
    }
    const original = 'C♯ D♮ E𝄪 F𝄫';
    expect(renderMusicTextHtml(original)).toContain('<span class="reading">♯</span>');
    expect(renderMusicTextHtml(original)).not.toContain('class="glyph natural"');
    expect(renderMusicTextHtml(original)).not.toContain('class="glyph double-sharp"');
    expect(renderMusicTextHtml(original)).not.toContain('class="glyph double-flat"');

    for (const symbol of symbols) {
      const svg = renderMusicGlyphSvg(symbol, { glyphStyle: 'engraved' });
      expect(svg).toContain('<svg class="glyph ');
      expect(svg).toContain('<path');
    }
    expect(renderMusicTextHtml(original, 'engraved').match(/class="glyph /g)).toHaveLength(4);
    const engravedHtml = renderMusicTextHtml(original, 'engraved');
    for (const symbol of symbols) expect(engravedHtml).toContain(`<span class="reading">${symbol}</span>`);
  });

  it('uses the selected flat in escaped HTML and the embedded enhancement script', () => {
    expect(renderMusicTextHtml('E♭')).toBe(renderMusicTextHtml('E♭', 'chart'));
    expect(renderMusicTextHtml('E♭')).toContain('d="M3.3 1L2.2 15"');
    const html = renderMusicTextHtml('E♭<', 'engraved');
    expect(html).toContain('d="M288 283');
    expect(html).toContain('<span class="reading">♭</span>&lt;');
    expect(html).not.toContain('d="M3.3 1L2.2 15"');
    expect(musicGlyphScript()).toBe(MUSIC_GLYPH_SCRIPT);
    expect(musicGlyphScript('chart')).toBe(MUSIC_GLYPH_SCRIPT);
    expect(MUSIC_GLYPH_SCRIPT).toContain('M3.3 1L2.2 15');
    expect(musicGlyphScript('engraved')).toContain('M288 283');
    expect(musicGlyphScript('engraved')).not.toContain('M3.3 1L2.2 15');
  });

  it('uses fixed SVG dimensions and accessible labels when requested', () => {
    const svg = renderMusicGlyphSvg('♭', { x: 10, y: 20, fontSize: 16, color: '#333' });
    expect(Number(/ y="([^"]+)"/.exec(svg)?.[1])).toBeCloseTo(5.6);
    expect(svg).toContain('width:7.04px;height:15.36px');
    expect(svg).toContain('width="7.04" height="15.36"');
    expect(svg).toContain('role="img" aria-label="♭"');
    expect(svg).toContain('color:#333');
    expect(renderMusicGlyphSvg('♭', { decorative: true })).toContain('aria-hidden="true"');
  });

  it('provides a self-contained script', () => {
    expect(MUSIC_GLYPH_SCRIPT).toMatch(/^<script>.*<\/script>$/s);
    expect(MUSIC_GLYPH_SCRIPT).toContain('data-music-glyph');
    expect(MUSIC_GLYPH_SCRIPT).toContain('document.fonts');
  });
});
