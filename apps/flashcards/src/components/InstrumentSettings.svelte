<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  // The instrument the guitar decks are drawn for: one setting for both of
  // them, offered from either deck's gear. The decks are generated again for
  // it when it is applied, and each instrument keeps its own progress.
  import { untrack } from "svelte";

  import TuningSettings from "@web-music/practice-ui/TuningSettings.svelte";
  import { describeTuning } from "@web-music/practice-ui/tuning";

  import { sameTuning, type Tuning } from "../lib/guitar-tuning";

  let { tuning, applied, onchange }: {
    tuning: Tuning;
    // What the decks are drawn for now, so the section can say that applying
    // will redraw them.
    applied: Tuning;
    onchange: (tuning: Tuning) => void;
  } = $props();
  // The editor binds an array of its own; a copy keeps the draft the dialog's.
  let draft = $state<number[]>(untrack(() => [...tuning]));
  $effect(() => {
    if (!sameTuning(draft, tuning)) draft = [...tuning];
  });
</script>

<section class="instrument" aria-labelledby="instrument-heading">
  <div class="table-summary">
    <span id="instrument-heading">Instrument</span>
    <span class="current">{describeTuning(draft)}</span>
  </div>
  <TuningSettings bind:tuning={draft} onchange={(value) => onchange([...value])} />
  <p class="hint">
    Guitar Intervals and Guitar Fretboard are both drawn for this instrument.
    Each instrument and tuning keeps its own progress: a position is a
    different question on different strings.
    {#if !sameTuning(draft, applied)}
      APPLY redraws both decks for {describeTuning(draft)}.
    {/if}
  </p>
</section>

<style>
  .instrument {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--divider);
  }

  .table-summary {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 0 0 14px;
    font-weight: 500;
  }

  .current,
  .hint {
    color: var(--on-surface-muted);
    font-size: 13px;
    font-weight: 400;
  }

  .hint {
    margin: 8px 0 0;
  }
</style>
