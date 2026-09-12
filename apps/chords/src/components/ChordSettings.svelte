<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount } from 'svelte';
  let { deckLabel, sizes, switches, arrange, onreset, ondelete, onclose }: {
    deckLabel: string;
    sizes: { label: string; value: string; onstep: (step: 1 | -1) => void }[];
    switches: { label: string; on: boolean; ontoggle: () => void }[];
    arrange?: { onopen: () => void };
    onreset: () => void;
    ondelete?: () => void;
    onclose: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => dialog.showModal());
</script>

<dialog bind:this={dialog} aria-labelledby="settings-title" oncancel={onclose}>
  <header><h2 id="settings-title">Settings</h2><button aria-label="Close settings" onclick={onclose}>×</button></header>
  <p class="song">{deckLabel}</p>
  {#each sizes as size}
    <div class="setting" role="group" aria-label={size.label}>
      <span>{size.label}</span>
      <div class="stepper"><button aria-label={`${size.label} smaller`} onclick={() => size.onstep(-1)}>−</button><output>{size.value}</output><button aria-label={`${size.label} larger`} onclick={() => size.onstep(1)}>+</button></div>
    </div>
  {/each}
  <div role="menu" aria-label="Display settings">
    {#each switches as option}
      <button class="switch" role="menuitemcheckbox" aria-checked={option.on} onclick={option.ontoggle}><span>{option.label}</span><span aria-hidden="true">{option.on ? '✓' : '—'}</span></button>
    {/each}
  </div>
  {#if arrange}<button class="action" onclick={arrange.onopen}>Arrange card</button>{/if}
  <footer>
    <button class="action" onclick={onreset}>Reset settings and position</button>
    {#if ondelete}<button class="action danger" onclick={ondelete}>Delete selected imported chart</button>{/if}
  </footer>
</dialog>

<style>
  dialog { box-sizing: border-box; width: min(480px, calc(100vw - 32px)); max-height: 85dvh; padding: 20px; border: 1px solid var(--divider); border-radius: 12px; color: var(--on-surface); background: var(--surface); }
  dialog::backdrop { background: #0008; }
  header, .setting, .switch, .stepper { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  h2 { margin: 0; font-size: 20px; }
  .song { margin: 4px 0 20px; color: var(--on-surface-muted); font-size: 13px; }
  button { min-height: 40px; padding: 8px 12px; border: 1px solid var(--divider); border-radius: 6px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
  button:hover { background: color-mix(in srgb, var(--on-surface) 6%, transparent); }
  header button { border: 0; font-size: 24px; }
  .setting { margin-top: 12px; }
  .stepper { gap: 6px; }
  output { min-width: 36px; text-align: center; }
  .switch { width: 100%; border: 0; text-align: left; }
  .switch[aria-checked="true"] { color: var(--text-accent); }
  [role="menu"] { margin-block: 16px; }
  .action { width: 100%; text-align: left; margin-top: 8px; }
  footer { border-top: 1px solid var(--divider); margin-top: 16px; padding-top: 8px; }
  .danger { color: var(--error, #bd3636); }
</style>
