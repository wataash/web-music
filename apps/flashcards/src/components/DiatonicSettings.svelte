<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import SettingChange from "./SettingChange.svelte";
  import type { MinorDegreeNotation, ChordNotation } from "../lib/diatonic-selection";
  import { diatonicDegreeLabel } from "../lib/diatonic-selection";
  import MovableDoKeySettings from "./MovableDoKeySettings.svelte";
  import { DIATONIC_VARIANTS, defaultDiatonicSelection, type DiatonicDirection, type DiatonicSelections } from "../lib/diatonic-selection";
  const modes = ["major", "minor"] as const;
  const defaults = defaultDiatonicSelection();
  let { directions, selection, onchange, minorNotation, chordNotation }: {
    minorNotation: MinorDegreeNotation;
    chordNotation: ChordNotation;
    directions: readonly DiatonicDirection[];
    selection: DiatonicSelections;
    onchange: (value: DiatonicSelections) => void;
  } = $props();
  const direction = $derived(directions[0]);
  const current = $derived(selection[direction]);
  function update(patch: Partial<typeof current>) { onchange({ ...selection, [direction]: { ...current, ...patch } }); }
  function setChord(id: string, selected: boolean) {
    const ids = current.minorChords;
    update({ minorChords: selected ? [...new Set([...ids,id])] : ids.filter(v => v !== id) });
  }
  const variants = DIATONIC_VARIANTS.filter(v => v.mode === "minor").toSorted((a,b) => a.degree - b.degree || a.offset - b.offset);
  const origins = { major: "Major", natural: "Natural", harmonic: "Harmonic", melodic: "Melodic" };
</script>
<section aria-label="Diatonic chord range">
  {#each modes as mode}
    {@const keyField = mode === "major" ? "majorKeys" : "minorKeys"}
    <section class="tonality" aria-label={mode === "major" ? "Major" : "Minor"}>
      <MovableDoKeySettings {mode} selection={current[keyField]} defaultSelection={defaults[keyField]} showReference={false} onchange={keys => update({ [keyField]: keys })}>
      </MovableDoKeySettings>
    </section>
  {/each}
  <section class="tonality" aria-label="Minor chords">
    <h3>Minor chords to study</h3>
    <div class="variants">
      {#each variants as variant (variant.id)}
        {@const required = variant.scales.includes("natural")}
        <SettingChange modified={!required && current.minorChords.includes(variant.id) !== variant.defaultOn} settingName={diatonicDegreeLabel(variant, minorNotation, chordNotation)} onreset={() => setChord(variant.id, variant.defaultOn)}>
        {#snippet heading()}
        <label class="variant">
          <input type="checkbox" checked={required || current.minorChords.includes(variant.id)} disabled={required} onchange={event => setChord(variant.id, event.currentTarget.checked)} />
          <span class="symbol">{diatonicDegreeLabel(variant, minorNotation, chordNotation)}</span>
          <span class="details">
            <small>{variant.scales.map(s => origins[s]).join(" / ")}</small>
          </span>
        </label>
        {/snippet}
        </SettingChange>
      {/each}
    </div>
  </section>
  <details class="help"><summary>Help</summary><p class="hint">Select the keys and optional minor chords to study.</p><p class="hint">Melodic means ascending / jazz melodic minor. Degrees use the parallel major scale as their reference.</p></details>
</section>
<style>
  .help { margin-top:24px; }
  summary { cursor:pointer; padding:8px 0; }
  .hint { color:var(--on-surface-muted); font-size: var(--ui-font-size-secondary); line-height:1.6; }
  .tonality + .tonality { margin-top:28px; padding-top:24px; border-top:1px solid var(--divider); }
  .variants { display:grid; gap:4px; }
  .variants :global(.setting-change) { border-bottom:1px solid var(--divider); }
  .variant { display:flex; align-items:center; gap:12px; min-height:48px; width:100%; }
  .symbol { min-width:80px; font-size:19px; }
  .details { min-width:0; padding:8px 0; }
  small { display:block; line-height:1.4; color:var(--on-surface-muted); font-size: var(--ui-font-size-secondary); }
  input { width:20px; height:20px; flex-shrink:0; }
</style>
