// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { MAESTRO_GLYPHS, MAESTRO_STAFF_SPACE } from './maestro-glyphs';
import { MAESTRO_TEXT_GLYPHS } from './maestro-text-glyphs';

// Keep this function self-contained: card generators embed formatNoteName.toString().
export function formatNoteName(note: string): string {
  return note.replace(/^([A-Ga-g])(bb|##|b|#|x)/, (_, letter: string, accidental: string) =>
    letter + ({ bb: '𝄫', '##': '𝄪', b: '♭', '#': '♯', x: '𝄪' } as Record<string, string>)[accidental]);
}

type Glyph = { readonly kind: string; readonly viewBox: string; readonly width: number; readonly height: number; readonly baseline: number; readonly paths: string };

const GLYPHS: Record<string, Glyph> = {
  '♭': { kind: 'flat', viewBox: '0 0 10 16', width: 0.44, height: 0.96, baseline: 0.06,
    paths: '<path class="stem" d="M3.3 1L2.2 15" stroke-width="0.75" /><path class="bowl" d="M2.8 8.3C9.2 3.4 11.2 8.7 2.2 15C8.2 8.9 8 6.2 2.9 9.6Z" fill="currentColor" stroke="none" />' },
  '♯': { kind: 'sharp', viewBox: '0 0 10 16', width: 0.52, height: 0.96, baseline: 0.06,
    paths: '<path d="M3.4 2.2V14.8" /><path d="M6.8 1.2V13.8" /><path d="M1 7.4L9.2 6" /><path d="M1 11.6L9.2 10.2" />' },
  'Δ': { kind: 'triangle', viewBox: '0 0 10 14', width: 0.5, height: 0.78, baseline: 0.02,
    paths: '<path d="M5 1.2L9 12.8H1Z" />' },
};
GLYPHS['△'] = GLYPHS['Δ'];

export type MusicGlyphStyle = 'chart' | 'engraved';

const ENGRAVED_GLYPHS: Record<string, Glyph> = { ...GLYPHS, ...MAESTRO_TEXT_GLYPHS };

function glyphsFor(style: MusicGlyphStyle): Record<string, Glyph> {
  return style === 'engraved' ? ENGRAVED_GLYPHS : GLYPHS;
}

export function musicGlyphMetrics(symbol: string, glyphStyle: MusicGlyphStyle = 'chart'): Readonly<{ width: number; height: number; baseline: number }> | undefined {
  const glyph = glyphsFor(glyphStyle)[symbol];
  return glyph && { width: glyph.width, height: glyph.height, baseline: glyph.baseline };
}

export const MUSIC_GLYPH_CSS = `
.glyph { display: inline-block; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; overflow: visible; }
.glyph.flat { width: 0.44em; height: 0.96em; stroke-width: 1.3; vertical-align: -0.06em; }
.glyph.flat .stem { stroke-width: 0.75; }
.glyph.flat .bowl { fill: currentColor; stroke: none; }
.glyph.sharp { width: 0.52em; height: 0.96em; stroke-width: 1.3; vertical-align: -0.06em; }
.glyph.triangle { width: 0.5em; height: 0.78em; stroke-width: 1.5; vertical-align: -0.02em; margin-right: 0.02em; }
.reading { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
`;

export type MusicGlyphSvgOptions = {
  glyphStyle?: MusicGlyphStyle;
  /** Left edge in SVG user units. */
  x?: number;
  /** Text baseline in SVG user units. */
  y?: number;
  /** Font size in SVG user units; fixes the glyph's width and height in px. */
  fontSize?: number;
  alignX?: 'start' | 'center';
  alignY?: 'baseline' | 'center';
  decorative?: boolean;
  color?: string;
};

function svgMarkup(symbol: string, options: MusicGlyphSvgOptions = {}, glyph = glyphsFor(options.glyphStyle ?? 'chart')[symbol]): string {
  if (!glyph) return '';
  const accessibility = options.decorative ? 'aria-hidden="true"' : `role="img" aria-label="${symbol}"`;
  const unit = options.fontSize === undefined ? 'em' : 'px';
  const size = options.fontSize ?? 1;
  const width = glyph.width * size;
  const height = glyph.height * size;
  const location = `${options.x === undefined ? '' : ` x="${options.x - (options.alignX === 'center' ? width / 2 : 0)}"`}${options.y === undefined ? '' : ` y="${options.y - (options.alignY === 'center' ? height / 2 : height - glyph.baseline * size)}"`}`;
  const color = options.color === undefined ? '' : `color:${escapeHtml(options.color)};`;
  return `<svg class="glyph ${glyph.kind}" viewBox="${glyph.viewBox}" preserveAspectRatio="none" ${accessibility}${location}${options.fontSize === undefined ? '' : ` width="${width}" height="${height}"`} style="width:${width}${unit};height:${height}${unit};${color}fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;overflow:visible;stroke-width:${glyph.kind === 'triangle' ? 1.5 : 1.3};vertical-align:-${glyph.baseline}em">${glyph.paths}</svg>`;
}

export function renderMusicGlyphSvg(symbol: string, options?: MusicGlyphSvgOptions): string {
  return svgMarkup(symbol, options);
}

/** Shared Maestro rendering in staff units, anchored on the sounding pitch. */
export function renderStaffMusicGlyph(symbol: string, x: number, pitchY: number, lineGap: number, alignX: 'start' | 'center' = 'center'): string {
  if (!(lineGap > 0)) throw new RangeError('lineGap must be positive');
  const glyph = (MAESTRO_GLYPHS as Record<string, Glyph>)[symbol];
  if (!glyph) return '';
  const [, top, , height] = glyph.viewBox.split(' ').map(Number);
  const scale = lineGap / MAESTRO_STAFF_SPACE;
  return svgMarkup(symbol, {
    glyphStyle: 'engraved', x, y: pitchY + (top + height / 2) * scale,
    fontSize: height * scale / glyph.height, alignX, alignY: 'center', decorative: true,
  }, glyph);
}

export function staffMusicGlyphBounds(symbol: string, lineGap: number): Readonly<{ top: number; bottom: number; width: number }> {
  const glyph = (MAESTRO_GLYPHS as Record<string, Glyph>)[symbol];
  if (!glyph || !(lineGap > 0)) throw new RangeError('invalid staff glyph or lineGap');
  const [, top, width, height] = glyph.viewBox.split(' ').map(Number);
  const scale = lineGap / MAESTRO_STAFF_SPACE;
  return { top: top * scale, bottom: (top + height) * scale, width: width * scale };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function renderMusicTextHtml(text: string, glyphStyle: MusicGlyphStyle = 'chart'): string {
  return [...text].map(char => glyphsFor(glyphStyle)[char]
    ? `${svgMarkup(char, { decorative: true, glyphStyle })}<span class="reading">${char}</span>`
    : escapeHtml(char)).join('');
}

function enhanceMusicGlyphs(glyphs: Record<string, Glyph>, css: string): void {
  const svgNS = 'http://www.w3.org/2000/svg';
  const target = /[♭♯♮𝄪𝄫Δ△]/u;
  const skip = 'script,style,title,desc,.glyph,.reading,[data-music-glyph]';
  const svgElement = (name: string) => document.createElementNS(svgNS, name);

  function enhanceHtml(root: Element): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (target.test(node.data) && !node.parentElement?.closest(skip) && node.parentElement?.namespaceURI !== svgNS) nodes.push(node);
    }
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const char of node.data) {
        const glyph = glyphs[char];
        if (!glyph) { fragment.append(char); continue; }
        const holder = document.createElement('span');
        holder.innerHTML = `<svg class="glyph ${glyph.kind}" viewBox="${glyph.viewBox}" preserveAspectRatio="none" aria-hidden="true" style="width:${glyph.width}em;height:${glyph.height}em;vertical-align:-${glyph.baseline}em">${glyph.paths}</svg><span class="reading">${char}</span>`;
        fragment.append(...holder.childNodes);
      }
      node.replaceWith(fragment);
    }
  }

  function enhanceSvg(text: SVGTextElement): void {
    if (text.hasAttribute('data-music-glyph-enhanced') || !target.test(text.textContent ?? '') || text.closest('title,desc,[data-music-glyph],.staff__key-signature')) return;
    const parent = text.parentNode;
    if (!parent) return;
    const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number }[] = [];
    let offset = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!node.parentElement?.closest('title,desc')) nodes.push({ node, start: offset });
      offset += node.data.length;
    }
    const overlays: { symbol: string; x: number; y: number; advance: number; fontSize: number; color: string; centered: boolean }[] = [];
    for (const { node, start } of nodes) {
      let index = 0;
      for (const char of node.data) {
        if (!glyphs[char]) { index += char.length; continue; }
        try {
          const point = text.getStartPositionOfChar(start + index);
          const end = text.getEndPositionOfChar(start + index);
          const style = getComputedStyle(node.parentElement!);
          overlays.push({ symbol: char, x: point.x, y: point.y, advance: end.x - point.x, fontSize: parseFloat(style.fontSize), color: style.fill,
            centered: ['central', 'middle'].includes(style.dominantBaseline) });
        } catch { /* A hidden text element has no measurable glyphs. */ }
        index += char.length;
      }
    }
    if (!overlays.length) return;
    for (const { node } of nodes) {
      if (!target.test(node.data)) continue;
      const fragment = document.createDocumentFragment();
      for (const char of node.data) {
        if (!glyphs[char]) { fragment.append(char); continue; }
        const original = svgElement('tspan');
        original.setAttribute('fill-opacity', '0');
        original.setAttribute('stroke-opacity', '0');
        original.textContent = char;
        fragment.append(original);
      }
      node.replaceWith(fragment);
    }
    let lastInserted: Node = text;
    for (const item of overlays) {
      const glyph = glyphs[item.symbol];
      // Keep the native outline within the source character's advance.
      const scale = item.advance > 0 ? Math.min(1, item.advance / (glyph.width * item.fontSize)) : 1;
      const width = glyph.width * item.fontSize * scale;
      const height = glyph.height * item.fontSize * scale;
      const outer = svgElement('svg');
      outer.setAttribute('class', `glyph ${glyph.kind}`);
      outer.setAttribute('aria-hidden', 'true');
      outer.setAttribute('viewBox', glyph.viewBox);
      outer.setAttribute('preserveAspectRatio', 'none');
      outer.setAttribute('x', String(item.x + (item.advance - width) / 2));
      outer.setAttribute('y', String(item.centered ? item.y - height / 2 : item.y - height + glyph.baseline * item.fontSize));
      outer.setAttribute('width', String(width));
      outer.setAttribute('height', String(height));
      outer.setAttribute('fill', 'none');
      outer.setAttribute('stroke', 'currentColor');
      outer.setAttribute('stroke-linecap', 'round');
      outer.setAttribute('stroke-linejoin', 'round');
      outer.setAttribute('stroke-width', String(glyph.kind === 'triangle' ? 1.5 : 1.3));
      outer.style.setProperty('width', `${width}px`);
      outer.style.setProperty('height', `${height}px`);
      outer.style.setProperty('color', item.color);
      outer.style.setProperty('pointer-events', 'none');
      outer.innerHTML = glyph.paths;
      // The source text and its overlay share the same parent coordinate system.
      if (text.hasAttribute('transform')) outer.setAttribute('transform', text.getAttribute('transform')!);
      parent.insertBefore(outer, lastInserted.nextSibling);
      lastInserted = outer;
    }
    text.setAttribute('data-music-glyph-enhanced', '');
  }

  const run = () => {
    if (!document.getElementById('music-glyph-style')) {
      const style = document.createElement('style');
      style.id = 'music-glyph-style';
      style.textContent = css;
      document.head.append(style);
    }
    for (const root of document.querySelectorAll('.question,.answer,.key-name')) enhanceHtml(root);
    for (const text of document.querySelectorAll('svg text')) enhanceSvg(text as SVGTextElement);
  };
  const ready = () => { void (document.fonts?.ready ?? Promise.resolve()).then(run); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
}

export function musicGlyphScript(glyphStyle: MusicGlyphStyle = 'chart'): string {
  return `<script>(${enhanceMusicGlyphs.toString()})(${JSON.stringify(glyphsFor(glyphStyle))},${JSON.stringify(MUSIC_GLYPH_CSS)});</script>`;
}

export const MUSIC_GLYPH_SCRIPT = musicGlyphScript();
