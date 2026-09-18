<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { irealLabel } from "../lib/ireal-labels";
  import { songScore } from "../lib/chord-metadata";
  import SourceScore from "./SourceScore.svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey, songKey, chartZoom, setChartZoom, highlightAnnotations, setHighlightAnnotations } = chordViewPersistence();
  let { songId, symbols, sublabels, open = $bindable(false), selected = [], onselect, editable = false, originalKey, targetKey }: { songId: string; symbols: string[]; sublabels?: string[]; open?: boolean; selected?: number[]; onselect?: (index: number) => void; editable?: boolean; originalKey?: string; targetKey?: string } = $props();
  const score = $derived(songScore(songId));
  // A ChordWiki chart draws its own title, credits and key, and its text is
  // the chart itself; a chart with an editor shows its text there. What is
  // left to tell is iReal's: fields the drawing has no room for, and the
  // meaning of its symbols.
  const ireal = $derived(score?.format === "ireal");
</script>

{#if score}
  <details bind:open class="song-source" use:remember={songKey("song-open")}>
    <summary>Full chart</summary>
    {#if open}
      <div class="chart-controls">
      <label class="chart-size">Chart size
        <select aria-label="Chart size" value={chartZoom()} onchange={event => setChartZoom(Number(event.currentTarget.value))}>
          <option value={1}>Fit</option><option value={1.25}>125%</option><option value={1.5}>150%</option><option value={2}>200%</option>
        </select>
      </label>
      {#if ireal}<label class="chart-size"><input type="checkbox" checked={highlightAnnotations()} onchange={event => setHighlightAnnotations(event.currentTarget.checked)} />Highlight annotations</label>{/if}
      </div>
      <div class="full-score" use:remember={viewKey("full-scroll")}>
        <SourceScore format={score.format} blocks={score.blocks} {symbols} {sublabels} {selected} {onselect} {originalKey} {targetKey} storageId="full" />
      </div>
      {#if ireal}
      <details class="information"><summary>Song information and notation guide</summary>
      <dl aria-label="Source song information">
        {#each score.fields as field}<div><dt>{irealLabel(field.label)}</dt><dd>{field.value}</dd></div>{/each}
      </dl>
      <p>Chords are shown in the selected key. Notes and song information retain their original values.</p>
      <p>Arrow keys move between chords and rows. Home/End select the row’s first/last chord; Ctrl+Home/End select the chart’s first/last chord.</p>
      <p>𝄆 𝄇: repeat · ⌜1. / ⌜2.: endings · ％: previous bar · 𝄎: previous two bars · /: previous chord · 𝄋: segno · 𝄌: coda · 𝄐: fermata · END: playback end</p>
      <p>Rows follow the original 16-cell grid, including chord widths and note placement. A tempo or chorus count of 0 reflects the source data. Practice expands previous-chord and one-/two-bar repeat signs. Repeat barlines, endings and navigation jumps remain in written order.</p>
      {#if !editable}<details class="original" use:remember={songKey("original-open")}><summary>Original key and notation</summary><pre use:remember={viewKey("original-scroll")}>{score.blocks.flat().map(token => token.raw).join("")}</pre></details>{/if}
      </details>
      {/if}
    {/if}
  </details>
{/if}

<style>
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
