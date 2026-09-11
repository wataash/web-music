<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import IrealScore from "./IrealScore.svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey } = chordViewPersistence();
  import type { ScoreToken } from "../lib/chord-metadata";
  let { blocks, symbols, selected = [], storageId = "score", contextIndex }: {
    blocks: ScoreToken[][]; symbols: string[]; selected?: number[]; storageId?: string; contextIndex?: number;
  } = $props();
</script>

<div class="score ireal" aria-label="Source chart" use:remember={viewKey(storageId)}>
  <IrealScore {blocks} {symbols} {selected} {contextIndex} />
</div>

<style>
  .score { font: 14px/1.9 ui-monospace, monospace; overflow-x: auto; max-width: 100%; text-align: left; color: var(--on-surface); }
</style>
