<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { tick } from "svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { minorNotation, highlightAnnotations } = chordViewPersistence();
  import { irealLabel } from "../lib/ireal-labels";
  import type { ScoreToken } from '../lib/chord-metadata';
  import { layoutIreal, irealChordParts, commentText, type IrealItem } from '../lib/ireal-layout';
  let { blocks, symbols, selected = [], contextIndex, onselect }: { blocks: ScoreToken[][]; symbols: string[]; selected?: number[]; contextIndex?: number; onselect?: (index: number) => void } = $props();
  const allRows = $derived(layoutIreal(blocks));
  const rows = $derived(allRows.filter(row => contextIndex === undefined || row.items.some(item => item.indices.includes(contextIndex))));
  const visibleItems = $derived(rows.flatMap(row => row.items).filter(item => item.indices.length));
  const tabItem = $derived(visibleItems.find(item => item.indices.some(index => selected.includes(index))) ?? visibleItems[0]);
  let sheet: HTMLDivElement;
  async function navigate(event: KeyboardEvent, item: IrealItem) {
    if (!onselect || event.altKey || event.metaKey || event.shiftKey ||
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) ||
      (event.ctrlKey && !['Home', 'End'].includes(event.key))) return;
    event.preventDefault(); event.stopPropagation();
    const systems = allRows.map(row => row.items.filter(candidate => candidate.indices.length)).filter(row => row.length);
    const system = systems.findIndex(row => row.includes(item));
    const items = systems.flat();
    let next: IrealItem | undefined;
    if (event.key === 'Home' || event.key === 'End') {
      const candidates = event.ctrlKey ? items : systems[system];
      next = event.key === 'Home' ? candidates[0] : candidates.at(-1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      next = items[items.indexOf(item) + (event.key === 'ArrowLeft' ? -1 : 1)];
    } else {
      const candidates = systems[system + (event.key === 'ArrowUp' ? -1 : 1)] ?? [];
      const x = item.repeatColumn ?? item.column;
      next = candidates.reduce<IrealItem | undefined>((best, candidate) => !best || Math.abs((candidate.repeatColumn ?? candidate.column) - x) < Math.abs((best.repeatColumn ?? best.column) - x) ? candidate : best, undefined);
    }
    if (!next) return;
    onselect(next.indices[0]);
    await tick();
    sheet.querySelector<HTMLButtonElement>('[data-score-index="' + next.indices[0] + '"]')?.focus();
  }
  function choose(indices: number[]) {
    const current = indices.findIndex(index => selected.includes(index));
    onselect?.(indices[(current + 1) % indices.length]);
  }
  function fitChord(node: HTMLElement, span: number) {
    const row = node.closest<HTMLElement>('.ireal-row')!;
    function fit() {
      if (!row.clientWidth) return;
      const available = row.clientWidth * span / 16 - 2;
      node.style.transform = `scaleX(${Math.min(1, Math.max(0.1, available / Math.max(1, node.offsetWidth)))})`;
    }
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    observer.observe(node);
    fit();
    return { update(value: number) { span = value; fit(); }, destroy() { observer.disconnect(); } };
  }
</script>

<div class="ireal-sheet" class:highlight-annotations={highlightAnnotations()} bind:this={sheet}>
  {#each rows as row}
    <div class="ireal-row" class:compact={row.endings.length === 0 && !row.items.some(item => item.alternate || item.token.kind === "comment")} class:leading-bar={row.leadingBar} class:layered={row.endings.length > 0 && row.items.some(item => item.alternate)} style:--gap={row.gap} style:--note-space={row.items.some(item => item.token.kind === "comment" && !item.token.position) ? "14px" : "0px"}>
      {#each row.endings as ending}
        <span class="ending" title={'Ending ' + ending.label} style:left={(ending.start / 16 * 100) + '%'} style:width={((ending.end - ending.start) / 16 * 100) + '%'}>
          <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path d={(ending.begins ? 'M0 12V1' : 'M0 1') + 'H100' + (ending.closes ? 'V12' : '')} /></svg>
          {#if ending.begins}<span>{ending.label}.</span>{/if}
        </span>
      {/each}
      {#each row.items as item}
        {@const token = item.token}
        {@const musicSymbol = token.kind === 'symbol' && ['Q', 'S', 'f'].includes(token.raw)}
        {@const barRepeat = token.kind === 'symbol' && ['％', '𝄎'].includes(token.text ?? '')}
        {@const active = item.indices.some(index => selected.includes(index))}
        <span class="item" title={musicSymbol ? irealLabel(token.label) : undefined} style:left={`${(barRepeat ? item.repeatColumn ?? item.column : item.column) / 16 * 100}%`} class:alternate={item.alternate} class:section-item={token.kind === 'section'} class:music-symbol={musicSymbol} class:beside-section={musicSymbol && row.items.some(other => other.column === item.column && other.token.kind === 'section')}>
          {#if token.chordIndex !== undefined}
            {@const symbol = symbols[token.chordIndex]}
            {@const parts = irealChordParts(symbol, minorNotation())}
            <button type="button" class="chord" tabindex={item === tabItem ? 0 : -1} data-score-index={item.indices[0]} onkeydown={event => navigate(event, item)} disabled={!onselect} onclick={() => choose(item.indices)} use:fitChord={item.span ?? 1} class:narrow={token.narrow} class:selected={active} aria-label={symbol} title={`Original notation: ${token.raw}`}>
              <span class="main-chord" class:invisible-root={token.raw.startsWith("W")}><span class="root">{parts.root}</span>{#if parts.accidental}<span class="accidental">{parts.accidental}</span>{/if}<span class="quality">{parts.quality}</span></span>{#if parts.bass}<span class="bass">/{parts.bass}</span>{/if}
            </button>
          {:else if token.kind === 'bar'}
            <span class="bar" class:double={['[', ']'].includes(token.raw)} class:final={token.raw === 'Z'} title={irealLabel(token.label)}>
              {#if ['{', '}'].includes(token.raw)}<span class="repeat">{token.text}</span>{/if}
            </span>
          {:else if token.kind === 'section'}
            <span class="section">{token.text}</span>
          {:else if irealLabel(token.label) === 'Time signature'}
            <span class="meter">{#each (token.text ?? '').split('/') as digit}<span>{digit}</span>{/each}</span>
          {:else if token.kind === 'comment'}
            <span class="comment" data-position={token.position} style:--raise={Math.min(74, Math.max(0, token.position ?? 0)) / 74}>{commentText(token.text ?? "")}</span>
          {:else if musicSymbol}
            <svg viewBox="0 0 32 32" role="img" aria-label={irealLabel(token.label)}><title>{irealLabel(token.label)}</title>
              {#if token.raw === 'Q'}
                <circle cx="16" cy="16" r="10" /><path d="M16 1V31M1 16H31" />
              {:else if token.raw === 'S'}
                <path d="M23 6C15 -1 5 8 14 14L19 18C28 24 17 34 9 26M5 28L27 4" /><circle class="dot" cx="6" cy="11" r="2" /><circle class="dot" cx="26" cy="22" r="2" />
              {:else}
                <path d="M2 23C2 3 30 3 30 23" /><circle class="dot" cx="16" cy="23" r="2.5" />
              {/if}
            </svg>
          {:else if token.kind === 'symbol' && /^N\d/.test(token.raw)}
            <!-- Ending labels and brackets are drawn once per row above. -->
          {:else if barRepeat}
            <svg class="bar-repeat" class:selected={active} viewBox="0 0 24 28" role="img" aria-label={irealLabel(token.label)}>
              <path d={token.text === "𝄎" ? "M12 2H16L4 26H0ZM20 2H24L12 26H8Z" : "M15 2H21L9 26H3Z"} fill="currentColor" />
              <circle cx="5" cy="8" r="2.5" fill="currentColor" />
              <circle cx="19" cy="20" r="2.5" fill="currentColor" />
            </svg>
          {:else}
            <span class="symbol" class:selected={active} title={irealLabel(token.label)}>{token.text}</span>
          {/if}
          {#if onselect && item.indices.length && token.chordIndex === undefined}
            <button type="button" class="repeat-pick" tabindex={item === tabItem ? 0 : -1} data-score-index={item.indices[0]} onkeydown={event => navigate(event, item)} class:centered={barRepeat} aria-label={'Practice ' + irealLabel(token.label)} title="Select repeat; press again for the next chord" onclick={() => choose(item.indices)}></button>
          {/if}
        </span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .ireal-sheet { container-type: inline-size; width: 100%; color: var(--on-surface); }
  .highlight-annotations .comment, .highlight-annotations .ending, .highlight-annotations .music-symbol, .highlight-annotations .symbol:not(.selected) { color: var(--text-accent); }
  .highlight-annotations .comment { font-weight: 600; }
  .ireal-row { position: relative; height: clamp(84px, 16cqw, 112px); margin-bottom: calc(var(--gap) * 8px + var(--note-space)); margin-left: 1.1em; margin-right: 0.6em; }
  .ireal-row.compact { height: clamp(68px, 13cqw, 92px); }
  .compact .item:not(.section-item):not(.music-symbol) { top: 30%; height: 62%; }
  .compact.ireal-row.leading-bar::before { top: 30%; height: 59%; }
  .ireal-row.layered { height: clamp(110px, 22cqw, 150px); }
  .layered .item:not(.alternate):not(.section-item):not(.music-symbol) { top: 60%; height: 36%; }
  .layered .item.alternate { top: 35%; }
  .layered.ireal-row::before { top: 60%; height: 34%; }
  .ireal-row.leading-bar::before { content: ''; position: absolute; left: 0; top: 40%; height: 49.4%; border-left: 1.5px solid currentColor; }
  .item { position: absolute; top: 40%; height: 52%; }
  .chord { border: 0; border-radius: 0; background: transparent; color: inherit; padding: 0; text-align: left; cursor: pointer; position: relative; display: inline-grid; white-space: nowrap; padding-left: 0.12em; font-family: 'Arial Narrow', 'Liberation Sans Narrow', sans-serif; font-size: clamp(18px, 4.8cqw, 32px); font-weight: 500; line-height: 1.1; transform-origin: left center; }
  .chord:disabled { cursor: default; }
  .chord:focus-visible, .repeat-pick:focus-visible { outline: 2px solid var(--text-accent); outline-offset: 2px; }
  .repeat-pick { z-index: 1; position: absolute; inset: 0 auto 0 0; width: 32px; border: 0; padding: 0; background: transparent; cursor: pointer; }
  .repeat-pick.centered { transform: translateX(-50%); }
  .main-chord { display: inline-flex; align-items: baseline; }
  .invisible-root { visibility: hidden; }
  .root { letter-spacing: -0.08em; }
  .accidental { font-size: 0.95em; align-self: flex-start; margin-top: -0.12em; margin-left: 0.04em; line-height: 1; }
  .quality { font-size: 0.65em; font-weight: 600; margin-left: 0.06em; transform: translateY(0.08em); }
  .bass { display: block; font-size: 0.65em; margin-left: 0.5em; line-height: 0.95; }
  .narrow { font-stretch: condensed; letter-spacing: -0.055em; }
  .alternate { top: 23%; }
  .alternate .chord { display: inline-flex; align-items: baseline; }
  .alternate .bass { margin-left: 0.1em; }
  .alternate .chord { font-size: clamp(12px, 2.5cqw, 18px); }
  .selected { color: var(--text-accent); background: color-mix(in srgb, var(--text-accent) 15%, transparent); border-radius: 3px; }
  .bar { position: absolute; top: 0; height: 95%; border-left: 1.5px solid currentColor; }
  .bar.double { border-left: 4px double currentColor; }
  .bar.final { border-left: 4px double currentColor; border-right: 2px solid currentColor; width: 2px; }
  .repeat { position: absolute; transform: translateX(-50%); font-size: clamp(20px, 5cqw, 36px); line-height: 1; background: var(--surface); }
  .section { position: absolute; top: 0; background: #cf3c2a; color: white; padding: 0 3px; font: 600 clamp(12px, 3cqw, 18px)/1.1 sans-serif; }
  .meter { position: absolute; right: 0.12em; top: 0; display: flex; flex-direction: column; color: #e15a46; font: 600 clamp(13px, 3cqw, 20px)/1 sans-serif; }
  .comment { white-space: pre; position: absolute; top: calc(100% - var(--raise) * 150%); font: italic clamp(10px, 2cqw, 15px)/1.2 sans-serif; }
  .symbol { font-size: clamp(14px, 3cqw, 22px); white-space: nowrap; }
  .bar-repeat { position: absolute; top: 50%; width: 0.85em; height: 1em; font-size: clamp(18px, 4.8cqw, 32px); transform: translate(-50%, -50%); }
  .ending { position: absolute; top: 22%; height: 12%; font: 600 11px/1 sans-serif; }
  .ending svg { position: absolute; width: 100%; height: 100%; overflow: visible; fill: none; stroke: currentColor; stroke-width: 1; }
  .ending path { vector-effect: non-scaling-stroke; }
  .ending > span { position: absolute; top: 3px; left: 3px; }
  .item.section-item { top: 0; }
  .item.music-symbol { top: 0; height: 20%; }
  .music-symbol svg { width: clamp(16px, 3cqw, 24px); height: 100%; overflow: visible; fill: none; stroke: currentColor; stroke-width: 2.2; }
  .music-symbol .dot { fill: currentColor; stroke: none; }
  .music-symbol.beside-section { margin-left: 24px; }
</style>
