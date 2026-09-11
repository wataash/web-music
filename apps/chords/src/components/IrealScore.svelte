<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { irealLabel } from "../lib/ireal-labels";
  import type { ScoreToken } from '../lib/chord-metadata';
  import { layoutIreal, irealChordParts } from '../lib/ireal-layout';
  let { blocks, symbols, selected = [], contextIndex }: { blocks: ScoreToken[][]; symbols: string[]; selected?: number[]; contextIndex?: number } = $props();
  const rows = $derived(layoutIreal(blocks).filter(row => contextIndex === undefined || row.items.some(item => item.token.chordIndex === contextIndex)));
  function fitChord(node: HTMLElement, span: number) {
    const row = node.closest<HTMLElement>('.ireal-row')!;
    function fit() {
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

<div class="ireal-sheet">
  {#each rows as row}
    <div class="ireal-row" style:--gap={row.gap}>
      {#each row.items as item}
        {@const token = item.token}
        <span class="item" style:left={`${item.column / 16 * 100}%`} class:alternate={item.alternate}>
          {#if token.chordIndex !== undefined}
            {@const symbol = symbols[token.chordIndex]}
            {@const parts = irealChordParts(symbol)}
            <span class="chord" use:fitChord={item.span ?? 1} class:narrow={token.narrow} class:selected={selected.includes(token.chordIndex)} aria-label={symbol} title={`Original notation: ${token.raw}`}>
              <span class="root">{parts.root}</span><span class="accidental">{parts.accidental}</span><span class="quality">{parts.quality}</span>{#if parts.bass}<span class="bass">/{parts.bass}</span>{/if}
            </span>
          {:else if token.kind === 'bar'}
            <span class="bar" class:double={['[', ']'].includes(token.raw)} class:final={token.raw === 'Z'} title={irealLabel(token.label)}>
              {#if ['{', '}'].includes(token.raw)}<span class="repeat">{token.text}</span>{/if}
            </span>
          {:else if token.kind === 'section'}
            <span class="section">{token.text}</span>
          {:else if irealLabel(token.label) === 'Time signature'}
            <span class="meter">{#each (token.text ?? '').split('/') as digit}<span>{digit}</span>{/each}</span>
          {:else if token.kind === 'comment'}
            <span class="comment" data-position={token.position} style:--raise={Math.min(74, Math.max(0, token.position ?? 0)) / 74}>{token.text}</span>
          {:else}
            <span class="symbol" class:ending={token.raw.startsWith('N')} title={irealLabel(token.label)}>{token.text}</span>
          {/if}
        </span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .ireal-sheet { container-type: inline-size; width: 100%; color: var(--on-surface); }
  .ireal-row { position: relative; height: clamp(60px, 13cqw, 90px); margin-bottom: calc(var(--gap) * 8px); margin-left: 1.1em; margin-right: 0.6em; }
  .ireal-row::before { content: ''; position: absolute; left: 0; top: 30%; height: 49.4%; border-left: 1.5px solid currentColor; }
  .item { position: absolute; top: 30%; height: 52%; }
  .chord { position: relative; display: inline-flex; align-items: baseline; white-space: nowrap; padding-left: 0.12em; font-family: 'Arial Narrow', 'Liberation Sans Narrow', sans-serif; font-size: clamp(18px, 4.8cqw, 32px); font-weight: 500; line-height: 1.1; transform-origin: left center; }
  .root { letter-spacing: -0.08em; }
  .accidental { font-size: 0.65em; align-self: flex-start; margin-top: -0.1em; }
  .quality { font-size: 0.48em; margin-left: 0.05em; }
  .bass { font-size: 0.45em; }
  .narrow { font-stretch: condensed; letter-spacing: -0.055em; }
  .alternate { top: 8%; }
  .alternate .chord { font-size: clamp(12px, 2.5cqw, 18px); }
  .selected { color: var(--text-accent); background: color-mix(in srgb, var(--text-accent) 15%, transparent); border-radius: 3px; }
  .bar { position: absolute; top: 0; height: 95%; border-left: 1.5px solid currentColor; }
  .bar.double { border-left: 4px double currentColor; }
  .bar.final { border-left: 4px double currentColor; border-right: 2px solid currentColor; width: 2px; }
  .repeat { position: absolute; transform: translateX(-50%); font-size: clamp(20px, 5cqw, 36px); line-height: 1; background: var(--surface); }
  .section { position: absolute; bottom: calc(100% + 3px); background: #cf3c2a; color: white; padding: 0 3px; font: 600 clamp(12px, 3cqw, 18px)/1.1 sans-serif; }
  .meter { position: absolute; right: 0.12em; top: 0; display: flex; flex-direction: column; color: #e15a46; font: 600 clamp(13px, 3cqw, 20px)/1 sans-serif; }
  .comment { position: absolute; top: calc(100% - var(--raise) * 150%); font: italic clamp(10px, 2cqw, 15px)/1.2 sans-serif; white-space: nowrap; }
  .symbol { font-size: clamp(14px, 3cqw, 22px); white-space: nowrap; }
  .ending { position: absolute; bottom: 100%; font-size: clamp(12px, 2.5cqw, 16px); }
</style>
