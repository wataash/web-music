<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import {
    CLEFS,
    CLEF_LABELS,
    MAJOR_KEYS_BY_SIGNATURE,
    renderStaffRowSvg,
    type Clef,
  } from "@web-music/music-staff-core";
  import { ALL_STAFF_NOTES } from "../lib/staff-note-selection";

  let keyFifths = $state(0);
  let clef = $state<Clef>("treble");

  const staffRow = $derived(
    renderStaffRowSvg({
      clef,
      pitches: ALL_STAFF_NOTES[clef],
      keyFifths,
      showSolfege: true,
      interactive: false,
      columnWidth: 44,
      nameHeight: 40,
    }),
  );
</script>

<details class="scale-reference">
  <summary>Scale reference</summary>
  <div class="controls">
    <select aria-label="Reference key" bind:value={keyFifths}>
      {#each MAJOR_KEYS_BY_SIGNATURE as key (key.fifths)}
        <option value={key.fifths}>{key.tonic} major</option>
      {/each}
    </select>
    <select aria-label="Reference clef" bind:value={clef}>
      {#each CLEFS as candidate (candidate)}
        <option value={candidate}>{CLEF_LABELS[candidate]} clef</option>
      {/each}
    </select>
  </div>
  <div class="staff-scroll">
    {@html staffRow}
  </div>
</details>

<style>
  .scale-reference {
    margin-top: 16px;
    border: 1px solid var(--divider);
    border-radius: 8px;
  }

  summary {
    padding: 14px;
    cursor: pointer;
    font-weight: 500;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 0 14px 14px;
    border-bottom: 1px solid var(--divider);
  }

  select {
    min-height: 36px;
    border: 1px solid var(--divider);
    border-radius: 6px;
    background: var(--surface);
    color: var(--on-surface);
    font: inherit;
  }

  .staff-scroll {
    overflow-x: auto;
    padding: 12px 0;
    color: var(--on-surface);
  }

  .staff-scroll :global(svg) {
    display: block;
    width: auto;
    height: 220px;
    margin-inline: 12px;
  }
</style>
