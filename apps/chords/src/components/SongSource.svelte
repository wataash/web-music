<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { irealLabel } from "../lib/ireal-labels";
  import { songScore } from "../lib/chord-metadata";
  import SourceScore from "./SourceScore.svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey, chartZoom, setChartZoom, minorNotation, setMinorNotation, highlightAnnotations, setHighlightAnnotations } = chordViewPersistence();
  let { songId, symbols, open = $bindable(false), selected = [], onselect }: { songId: string; symbols: string[]; open?: boolean; selected?: number[]; onselect?: (index: number) => void } = $props();
  const score = $derived(songScore(songId));
</script>

{#if score}
  <details bind:open class="song-source" use:remember={viewKey("song-open")}>
    <summary>Full chart</summary>
    {#if open}
      <div class="chart-controls">
      <button class="print-chart" onclick={() => window.print()}>Print / PDF</button>
      <label class="chart-size">Chart size
        <select aria-label="Chart size" value={chartZoom()} onchange={event => setChartZoom(Number(event.currentTarget.value))}>
          <option value={1}>Fit</option><option value={1.25}>125%</option><option value={1.5}>150%</option><option value={2}>200%</option>
        </select>
      </label>
      <label class="chart-size">Minor chords
        <select aria-label="Minor chords" value={minorNotation()} onchange={event => setMinorNotation(event.currentTarget.value as '-' | 'm')}>
          <option value="-">C−7</option><option value="m">Cm7</option>
        </select>
      </label>
      <label class="chart-size"><input type="checkbox" checked={highlightAnnotations()} onchange={event => setHighlightAnnotations(event.currentTarget.checked)} />Highlight annotations</label>
      </div>
      <div class="full-score" use:remember={viewKey("full-scroll")}>
        <SourceScore blocks={score.blocks} {symbols} {selected} {onselect} storageId="full" />
      </div>
      <details class="information"><summary>Song information and notation guide</summary>
      <dl aria-label="Source song information">
        {#each score.fields as field}<div><dt>{irealLabel(field.label)}</dt><dd>{field.value}</dd></div>{/each}
      </dl>
      <p>Arrow keys move between chords and rows. Home/End select the row’s first/last chord; Ctrl+Home/End select the chart’s first/last chord.</p>
      <p>Chords are shown in the selected key. Notes and song information retain their original values.</p>
      <p>𝄆 𝄇: repeat · ⌜1. / ⌜2.: endings · ％: previous bar · 𝄎: previous two bars · /: previous chord · 𝄋: segno · 𝄌: coda · 𝄐: fermata · END: playback end</p>
      <p>Rows follow the original 16-cell grid, including chord widths and note placement. A tempo or chorus count of 0 reflects the source data. Practice expands previous-chord and one-/two-bar repeat signs. Repeat barlines, endings and navigation jumps remain in written order.</p>
      <details class="original" use:remember={viewKey("original-open")}><summary>Original key and notation</summary><pre use:remember={viewKey("original-scroll")}>{score.blocks.flat().map(token => token.raw).join("")}</pre></details>
      </details>
    {/if}
  </details>
{/if}

<style>
  .print-chart { border: 1px solid var(--divider); border-radius: 6px; padding: 6px; background: var(--surface); color: var(--text-accent); cursor: pointer; }
  .chart-controls { display: flex; flex-wrap: wrap; gap: 0 16px; align-items: center; }
  .chart-size { display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 12px; color: var(--on-surface-muted); }
  select { padding: 6px; border: 1px solid var(--divider); border-radius: 6px; background: var(--surface); color: var(--on-surface); }
  .song-source { margin: 16px 0; font-size: 14px; text-align: left; max-width: 100%; }
  summary { cursor: pointer; padding: 8px 0; color: var(--text-accent); }
  dl { margin: 8px 0; display: flex; flex-wrap: wrap; gap: 8px 20px; }
  dl div { min-width: 80px; }
  dt, p { color: var(--on-surface-muted); font-size: 12px; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .full-score { overflow: auto; padding: 20px 4px 12px; }
  .information { margin-top: 8px; color: var(--on-surface-muted); }
  .information > summary { font-size: 12px; color: inherit; }
  pre { max-height: 40vh; overflow: auto; font-size: 12px; }
</style>
