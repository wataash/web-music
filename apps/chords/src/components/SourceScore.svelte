<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount } from "svelte";
  import IrealScore from "./IrealScore.svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey, chartZoom } = chordViewPersistence();
  import type { ScoreToken } from "../lib/chord-metadata";
  let { blocks, symbols, selected = [], storageId = "score", contextIndex, onselect }: {
    blocks: ScoreToken[][]; symbols: string[]; selected?: number[]; storageId?: string; contextIndex?: number; onselect?: (index: number) => void;
  } = $props();
  let viewport: HTMLDivElement;
  let width = $state(0);
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => width = entry.contentRect.width);
    observer.observe(viewport);
    return () => observer.disconnect();
  });
</script>

<div class="score ireal" aria-label="Source chart" bind:this={viewport} use:remember={viewKey(storageId)}>
  <div style:width={width ? width + "px" : "100%"} style:zoom={chartZoom()}>
  <IrealScore {blocks} {symbols} {selected} {contextIndex} {onselect} />
  </div>
</div>

<style>
  .score { font: 14px/1.9 ui-monospace, monospace; overflow-x: auto; max-width: 100%; text-align: left; color: var(--on-surface); }
</style>
