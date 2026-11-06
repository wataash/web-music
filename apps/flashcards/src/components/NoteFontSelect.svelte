<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0 -->
<script lang="ts">
  import SettingChange from "./SettingChange.svelte";
  import { NOTE_FONTS, noteFontPreference, setNoteFont, parseNoteFont } from "../lib/note-font.svelte";

  let { value = noteFontPreference.value, onchange = setNoteFont }: { value?: string; onchange?: (value: string) => void } = $props();
</script>

<div class="font-setting">
<SettingChange modified={value !== parseNoteFont(undefined)} settingName="Note font" onreset={() => onchange(parseNoteFont(undefined))}>
{#snippet heading()}
<label>Note font
  <select aria-label="Note font" {value} onchange={event => onchange(event.currentTarget.value)}>
    {#each NOTE_FONTS as font (font.id)}
      <option value={font.id}>{font.label}</option>
    {/each}
  </select>
</label>
{/snippet}
</SettingChange>
</div>

<style>
  label { width:100%; display: grid; gap: 0.35rem; }
  select { font: inherit; padding: 0.4rem; max-width: 100%; background: var(--surface); color: var(--on-surface); border: 1px solid var(--divider); border-radius: 4px; }
</style>
