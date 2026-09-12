<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import TuningSettings from './TuningSettings.svelte';
  import BassStringPicker from './BassStringPicker.svelte';
  let { tuning = $bindable<number[]>([]), tuningPreset = $bindable(''), bassStrings = $bindable<number[]>([]), onclose }: {
    tuning?: number[]; tuningPreset?: string; bassStrings?: number[]; onclose: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => dialog.showModal());
  function close() { dialog.close(); onclose(); }
</script>
<dialog bind:this={dialog} aria-labelledby="instrument-title" oncancel={event => { event.preventDefault(); close(); }}>
  <header><h2 id="instrument-title">Instrument and tuning</h2><button aria-label="Close instrument settings" onclick={close}>×</button></header>
  <TuningSettings bind:tuning bind:tuningPreset onpreset={strings => bassStrings = strings} />
  <BassStringPicker bind:value={bassStrings} stringCount={tuning.length} />
</dialog>
<style>
  dialog { box-sizing: border-box; width: min(480px, calc(100vw - 32px)); max-height: 85dvh; padding: 20px; border: 1px solid var(--divider); border-radius: 12px; color: var(--on-surface); background: var(--surface); }
  dialog::backdrop { background: #0008; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
  h2 { margin: 0; font-size: 20px; }
  button { min-width: 40px; min-height: 40px; border: 0; border-radius: 6px; background: transparent; color: inherit; font-size: 24px; cursor: pointer; }
</style>
