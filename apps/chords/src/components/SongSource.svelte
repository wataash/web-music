<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { irealLabel } from "../lib/ireal-labels";
  import { songScore } from "../lib/chord-metadata";
  import SourceScore from "./SourceScore.svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey } = chordViewPersistence();
  let { songId, symbols }: { songId: string; symbols: string[] } = $props();
  const score = $derived(songScore(songId));
  let open = $state(false);
</script>

{#if score}
  <details bind:open class="song-source" use:remember={viewKey("song-open")}>
    <summary>Full chart and song information</summary>
    {#if open}
      <dl aria-label="Source song information">
        {#each score.fields as field}<div><dt>{irealLabel(field.label)}</dt><dd>{field.value}</dd></div>{/each}
      </dl>
      <p>Chords are shown in the selected key. Notes and song information retain their original values.</p>
      <p>𝄆 𝄇: repeat · ⌜1. / ⌜2.: endings · ％: previous bar · 𝄎: previous two bars · /: previous chord · 𝄋: segno · 𝄌: coda · 𝄐: fermata · END: playback end</p>
      <p>Rows follow the original 16-cell grid, including chord widths and note placement. A tempo or chorus count of 0 reflects the source data. Repeats and jumps are displayed; practice follows the written order.</p>
      <div class="full-score" use:remember={viewKey("full-scroll")}>
        <div class="score-heading">
          <h3>{score.fields.find(field => irealLabel(field.label) === "Title")?.value}</h3>
          <div><span>({score.fields.find(field => irealLabel(field.label) === "Style")?.value})</span><span>{score.fields.find(field => irealLabel(field.label) === "Composer / artist")?.value}</span></div>
        </div>
        <SourceScore blocks={score.blocks} {symbols} storageId="full" />
      </div>
      <details class="original" use:remember={viewKey("original-open")}><summary>Original key and notation</summary><pre use:remember={viewKey("original-scroll")}>{score.blocks.flat().map(token => token.raw).join("")}</pre></details>
    {/if}
  </details>
{/if}

<style>
  .song-source { margin: 8px 0; font-size: 14px; text-align: left; max-width: 100%; }
  summary { cursor: pointer; padding: 8px 0; color: var(--text-accent); }
  dl { margin: 8px 0; display: flex; flex-wrap: wrap; gap: 8px 20px; }
  dl div { min-width: 80px; }
  dt, p { color: var(--on-surface-muted); font-size: 12px; }
  dd { margin: 0; overflow-wrap: anywhere; }
  .full-score { overflow: auto; padding: 8px; border: 1px solid var(--divider); border-radius: 6px; }
  .score-heading { color: var(--on-surface); font-family: 'Arial Narrow', sans-serif; }
  .score-heading h3 { margin: 0; text-align: center; font-size: clamp(18px, 2.5vw, 24px); }
  .score-heading > div { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
  pre { max-height: 40vh; overflow: auto; font-size: 12px; }
</style>
