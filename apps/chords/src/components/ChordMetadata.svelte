<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { ChordAnnotation } from "../lib/chord-metadata";
  let { annotation, label = "Chord information" }: { annotation?: ChordAnnotation; label?: string } = $props();
</script>

{#if annotation && (annotation.section || annotation.comments.length)}
  <div class="metadata" aria-label={label}>
    {#if annotation.section}<span class="section">Section {annotation.section}</span>{/if}
    {#each annotation.comments as comment}<span>{comment}</span>{/each}
  </div>
{/if}

<style>
  .metadata { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 8px 0; color: var(--on-surface-muted); font-size: 14px; overflow-wrap: anywhere; }
  .section { padding: 3px 8px; border: 1px solid var(--text-accent); border-radius: 4px; color: var(--on-surface); font-weight: 600; }
</style>
