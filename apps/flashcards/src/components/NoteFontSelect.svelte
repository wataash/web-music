<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0 -->
<script lang="ts">
  import { NOTE_FONTS, noteFontPreference, setNoteFont } from "../lib/note-font.svelte";

  // `menu` lays the control out as a row of the deck actions sheet.
  let { menu = false }: { menu?: boolean } = $props();
</script>

<label class:menu>{#if menu}<span class="icon" aria-hidden="true">Aa</span>{/if}Note font
  <select aria-label="Note font" value={noteFontPreference.value} onchange={event => setNoteFont(event.currentTarget.value)}>
    {#each NOTE_FONTS as font (font.id)}
      <option value={font.id}>{font.label}</option>
    {/each}
  </select>
</label>

<style>
  label { display: grid; gap: 0.35rem; }
  label.menu { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; min-height: 52px; padding: 6px 20px; font-size: 15px; }
  .icon { width: 20px; text-align: center; font-size: 14px; }
  select { font: inherit; padding: 0.4rem; max-width: 100%; background: var(--surface); color: var(--on-surface); border: 1px solid var(--divider); border-radius: 4px; }
  .menu select { margin-left: auto; }
</style>
