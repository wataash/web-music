<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { omittedChordIntervals, type ChordDescription } from "../lib/chords";
  import { chordScale, outsideScale, scaleTones } from "../lib/chord-scales";

  let { chord, scaleId = "" }: { chord: ChordDescription; scaleId?: string } = $props();
  const omitted = $derived(omittedChordIntervals(chord));
  const overlay = $derived(chordScale(scaleId));
  const extraTones = $derived(overlay ? scaleTones(chord, overlay) : []);
  const outside = $derived(overlay ? outsideScale(chord, overlay) : new Set<string>());
</script>

{#if chord.unsupported}<p>Chord tones are not supported for this chord. The original symbol is shown.</p>{/if}
<dl class="tones">
  {#each chord.tones as tone}
    <div class:root-tone={tone.interval === "R"} class:bass-tone={tone.pitchClass === chord.bass?.pitchClass}
      class:omitted={omitted.has(tone.interval) || outside.has(tone.interval)}
      title={outside.has(tone.interval) ? `Not in the ${overlay?.name} scale` : omitted.has(tone.interval) ? "Optional tone" : undefined}>
      <dt>{tone.interval}</dt>
      <dd>{tone.note}</dd>
    </div>
  {/each}
  {#if chord.bass}
    <div class="bass-tone">
      <dt>Bass</dt>
      <dd>{chord.bass.note}</dd>
    </div>
  {/if}
  {#each extraTones as tone}
    <div class="scale-tone" title={`${overlay?.name} scale`}>
      <dt>{tone.interval}</dt>
      <dd>{tone.note}</dd>
    </div>
  {/each}
</dl>

<style>
  .omitted { opacity: 0.35; }

  .tones {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0;
  }

  .tones div {
    display: grid;
    grid-template-columns: auto auto;
    overflow: hidden;
    border: 1px solid var(--divider);
    border-radius: 999px;
    background: var(--surface);
  }

  .tones dt,
  .tones dd {
    margin: 0;
    padding: 0.44em 0.63em;
  }

  .tones dt {
    background: #fde68a;
    color: #4a3100;
    font-weight: 700;
  }

  .tones .root-tone dt {
    background: #64b5f6;
    color: #0d2c40;
  }

  .tones .bass-tone dt {
    background: #fca5a5;
    color: #4c1010;
  }

  .tones .scale-tone { opacity: 0.6; }

  .tones .scale-tone dt {
    background: color-mix(in srgb, var(--on-surface) 10%, var(--surface));
    color: var(--on-surface);
  }

  .tones dd {
    min-width: 40px;
    color: var(--on-surface);
    font-weight: 600;
    text-align: center;
  }
</style>
