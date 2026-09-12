<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { practiceAnnotation, songScore } from "../lib/chord-metadata";
  import ChordMetadata from "./ChordMetadata.svelte";
  import SourceScore from "./SourceScore.svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey } = chordViewPersistence();
  let { songId, indices, symbols, onselect }: { songId: string; indices: number[]; symbols: string[]; onselect?: (index: number) => void } = $props();
  const score = $derived(songScore(songId));
  let open = $state(false);
</script>

{#snippet occurrence(index: number, additional = false)}
  <div class="occurrence" aria-label={`Source chord ${index + 1}`}>
    {#if indices.length > 1}<div class="number">Source #{index + 1}</div>{/if}
    {#if additional}<ChordMetadata annotation={practiceAnnotation(songId, index)} />{/if}
    <SourceScore blocks={score!.blocks} {symbols} selected={indices} contextIndex={index} {onselect} storageId={`context:${indices[0]}:${index}`} />
  </div>
{/snippet}

{#if score && indices.length}
  <div class="chord-source">
    {@render occurrence(indices[0])}
    {#if indices.length > 1}
      <details bind:open use:remember={viewKey(`occurrences:${indices[0]}`)}>
        <summary>Charts and notes for {indices.length - 1} more occurrences</summary>
        {#if open}{#each indices.slice(1) as index}{@render occurrence(index, true)}{/each}{/if}
      </details>
    {/if}
  </div>
{/if}

<style>
  .chord-source { min-width: 0; max-width: 100%; margin: 6px 0 12px; text-align: left; }
  .occurrence { padding: 5px 0; }
  .number { font-size: 11px; color: var(--on-surface-muted); }
  summary { cursor: pointer; color: var(--text-accent); font-size: 12px; padding: 8px 0; }
</style>
