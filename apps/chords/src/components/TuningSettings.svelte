<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { MIN_STRINGS, MAX_STRINGS, NOTE_NAMES, TUNING_PRESETS, matchingPreset, defaultBassStrings } from '../lib/tuning';
  let { tuning = $bindable<number[]>([]), tuningPreset = $bindable(''), onpreset }: { tuning?: number[]; tuningPreset?: string; onpreset: (strings: number[]) => void } = $props();
  const selectedPreset = $derived(matchingPreset(tuning, tuningPreset));
  function choose(event: Event) {
    const selected = TUNING_PRESETS.find(p => p.id === (event.currentTarget as HTMLSelectElement).value);
    if (selected) { tuning = [...selected.pitches]; tuningPreset = selected.id; onpreset(selected.bassStrings ?? defaultBassStrings(tuning)); }
  }
  function resize(count: number) {
    tuning = Array.from({ length: count }, (_, i) => tuning[i] ?? Math.max(0, tuning[tuning.length - 1] - 5 * (i - tuning.length + 1)));
    tuningPreset = '';
    onpreset(defaultBassStrings(tuning));
  }
  function pitch(index: number, note: number, octave: number) {
    const midi = (octave + 1) * 12 + note;
    if (midi >= 0 && midi <= 127) tuning = tuning.map((value, i) => i === index ? midi : value);
  }
</script>
<section class="tuning-editor" aria-label="Tuning">
  <label>Preset<select aria-label="Instrument preset" value={selectedPreset?.id ?? 'custom'} onchange={choose}><option value="custom" disabled>Custom tuning</option>{#each TUNING_PRESETS as p}<option value={p.id}>{p.label}</option>{/each}</select></label>
  <label>Strings<select aria-label="String count" value={tuning.length} onchange={event => resize(Number(event.currentTarget.value))}>{#each Array.from({ length: MAX_STRINGS - MIN_STRINGS + 1 }, (_, i) => i + MIN_STRINGS) as count}<option value={count}>{count}</option>{/each}</select></label>
  {#if selectedPreset?.note}<p>{selectedPreset.note}</p>{/if}
  <p>String 1 is the top string on the diagram. Pitches include octaves (middle C = C4).</p>
  <div class="tunings">
    {#each tuning as midi, index}
      {@const currentOctave = Math.floor(midi / 12) - 1}
      <div class="string">
        <span>String {index + 1}</span>
        <select aria-label={`String ${index + 1} note`} value={midi % 12} onchange={event => pitch(index, Number(event.currentTarget.value), currentOctave)}>
          {#each NOTE_NAMES as note, value}<option {value} disabled={(currentOctave + 1) * 12 + value > 127}>{note}</option>{/each}
        </select>
        <select aria-label={`String ${index + 1} octave`} value={currentOctave} onchange={event => pitch(index, midi % 12, Number(event.currentTarget.value))}>
          {#each Array.from({ length: 11 }, (_, i) => i - 1) as octave}<option value={octave} disabled={(octave + 1) * 12 + midi % 12 > 127}>{octave}</option>{/each}
        </select>
      </div>
    {/each}
  </div>
</section>
<style>
  .tuning-editor { margin-bottom: 16px; min-width: 0; }
  label { display: grid; gap: 6px; margin-bottom: 8px; }
  p { font-size: 12px; color: var(--on-surface-muted); }
  .tunings { display: grid; gap: 8px; }
  .string { display: grid; grid-template-columns: 1fr minmax(70px, 1.3fr) 52px; align-items: center; gap: 6px; font-size: 13px; }
  select { min-width: 0; width: 100%; min-height: 36px; padding: 4px; color: inherit; background: var(--surface); border: 1px solid var(--divider); border-radius: 4px; }
</style>
