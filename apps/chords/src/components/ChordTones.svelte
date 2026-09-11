<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { omittedChordIntervals, type ChordDescription } from "../lib/chords";

  let { chord }: { chord: ChordDescription } = $props();
  const omitted = $derived(omittedChordIntervals(chord));
</script>

{#if chord.unsupported}<p>Chord tones are not supported for this chord. The original symbol is shown.</p>{/if}
<dl class="tones">
  {#each chord.tones as tone}
    <div class:root-tone={tone.interval === "R"} class:bass-tone={tone.pitchClass === chord.bass?.pitchClass}
      class:omitted={omitted.has(tone.interval)} title={omitted.has(tone.interval) ? "Optional tone" : undefined}>
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

  .tones dd {
    min-width: 40px;
    color: var(--on-surface);
    font-weight: 600;
    text-align: center;
  }
</style>
