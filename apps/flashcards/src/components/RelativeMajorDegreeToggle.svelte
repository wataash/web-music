<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0 -->
<script lang="ts">
  import SettingChange from "./SettingChange.svelte";
  import { CHORD_FONT_CSS } from "@web-music/music-notation/chord-font";
  import { chordSymbolsHtml, CHORD_SYMBOL_CSS } from "@web-music/music-notation/chord-symbols";
  let { checked, defaultChecked, onchange }: { checked: boolean; defaultChecked: boolean; onchange: (value: boolean) => void } = $props();
</script>
{@html `<style>${CHORD_FONT_CSS}${CHORD_SYMBOL_CSS}</style>`}
<SettingChange modified={checked !== defaultChecked} settingName="Relative-major degree" onreset={() => onchange(defaultChecked)}>
{#snippet heading()}
<fieldset class="relative-major">
  <legend><label><input type="checkbox" {checked} onchange={event => onchange(event.currentTarget.checked)} />Relative-major degree</label></legend>
  <div class="example" aria-label="Relative-major degree hint preview">G minor · {@html chordSymbolsHtml(checked ? "V7 (III7 in B♭ major)" : "V7")}</div>
</fieldset>
{/snippet}
</SettingChange>
<style>
  .relative-major { width:100%; min-width:0; margin:12px 0 0; padding:8px 12px 12px; border:1px solid var(--divider); border-radius:6px; }
  legend { padding:0 4px; }
  label { display:flex; align-items:center; gap:12px; font-size: var(--ui-font-size-label); }
  input { flex-shrink:0; width:20px; height:20px; }
  .example { font-size:18px; line-height:1.4; color:var(--on-surface); }
  .example :global(.reading) { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
</style>
