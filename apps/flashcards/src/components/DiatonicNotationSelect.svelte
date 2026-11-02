<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0 -->
<script lang="ts">
  import SettingChange from "./SettingChange.svelte";
  import { MINOR_DEGREE_NOTATIONS, CHORD_NOTATION_OPTIONS, DEFAULT_CHORD_NOTATION, parseMinorDegreeNotation, parseChordNotation, type MinorDegreeNotation, type ChordNotation } from "../lib/diatonic-selection";
  import { CHORD_FONT_CSS } from "@web-music/music-notation/chord-font";
  import { chordSymbolsHtml, CHORD_SYMBOL_CSS } from "@web-music/music-notation/chord-symbols";

  let { minorNotation = $bindable(), chordNotation = $bindable(), showDegrees = true, triads = false }: {
    minorNotation: MinorDegreeNotation;
    chordNotation: ChordNotation;
    showDegrees?:boolean;
    triads?:boolean;
  } = $props();
</script>
{@html `<style>${CHORD_FONT_CSS}${CHORD_SYMBOL_CSS}</style>`}
<section class="notation-settings" aria-label="Notation settings">
  <h3>Notation</h3>
  {#each CHORD_NOTATION_OPTIONS.filter(option => !triads || option.key === "minor") as option}
    <div class="notation-item">
      <SettingChange modified={chordNotation[option.key] !== DEFAULT_CHORD_NOTATION[option.key]} settingName={option.label} onreset={() => chordNotation = parseChordNotation({ ...chordNotation, [option.key]:DEFAULT_CHORD_NOTATION[option.key] })}>
      {#snippet heading()}<div class="setting-label">{option.label}</div>{/snippet}
      <div class="choices" role="radiogroup" aria-label={option.label}>
        {#each option.values as value}
          <label class="choice">
            <input type="radio" name={`notation-${option.key}`} aria-label={triads ? value.replace(/7$/, "") : value} checked={chordNotation[option.key] === value} onchange={() => chordNotation = parseChordNotation({ ...chordNotation, [option.key]:value })} />
            <span class="choice-preview" aria-hidden="true">{@html chordSymbolsHtml((option.key === "halfDiminished" ? "B" : option.key === "majorSeventh" ? "C" : "A") + (triads ? value.replace(/7$/, "") : value), triads)}</span>
          </label>
        {/each}
      </div>
      </SettingChange>
    </div>
  {/each}
  {#if showDegrees}
  <div class="notation-item">
    <SettingChange modified={minorNotation !== parseMinorDegreeNotation(undefined)} settingName="Minor degree" onreset={() => minorNotation = parseMinorDegreeNotation(undefined)}>
    {#snippet heading()}<div class="setting-label">Minor degree</div>{/snippet}
    <div class="choices degree-choices" role="radiogroup" aria-label="Minor degree">
      {#each MINOR_DEGREE_NOTATIONS as notation}
        <label class="choice">
          <input type="radio" name="minor-degree-notation" aria-label={notation} checked={minorNotation === notation} onchange={() => minorNotation = parseMinorDegreeNotation(notation)} />
          <span class="choice-preview" aria-hidden="true">{@html chordSymbolsHtml(notation)}</span>
        </label>
      {/each}
    </div>
    </SettingChange>
  </div>
  {/if}
</section>
<style>
  h3 { margin:0 0 8px; }
  .notation-item { padding:12px 0; border-bottom:1px solid var(--divider); }
  .setting-label { font-size: var(--ui-font-size-label); margin:0; }
  .choices { display:flex; flex-wrap:wrap; gap:8px; }
  .choice { flex:1 1 80px; position:relative; cursor:pointer; }
  .degree-choices .choice { flex-basis:56px; }
  .choice input { position:absolute; inset:0; width:100%; height:100%; margin:0; opacity:0; z-index:1; cursor:pointer; }
  .choice-preview { position:relative; box-sizing:border-box; display:flex; align-items:center; justify-content:center; min-height:60px; padding:10px 4px; border:1px solid var(--divider); border-radius:6px; color:var(--on-surface); font-size:26px; }
  .choice input:checked + .choice-preview { border-color:var(--count-new); background:color-mix(in srgb,var(--count-new) 15%,transparent); box-shadow:inset 0 0 0 1px var(--count-new); }
  .choice input:focus-visible + .choice-preview { outline:2px solid var(--count-new); outline-offset:3px; }
  .notation-settings :global(.reading) { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
  .notation-settings { margin:20px 0 28px; }
</style>
