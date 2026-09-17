<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount } from 'svelte';
  let { deckLabel, sizes, switches, choices = [], actions = [], onreset, onedit, oncopy, onexport, ondelete, onclose }: {
    deckLabel: string;
    sizes: { label: string; value: string; onstep: (step: 1 | -1) => void }[];
    switches: { label: string; on: boolean; ontoggle: () => void }[];
    // One of a few, shown side by side.
    choices?: { label: string; value: string; options: { id: string; label: string }[]; onchoose: (id: string) => void }[];
    // Settings with dialogs of their own, opened from here.
    actions?: { label: string; icon?: string; onopen: () => void }[];
    onreset: () => void;
    // What can be done to the current chart: opened as its own text, removed.
    onedit?: () => void;
    oncopy?: () => void;
    onexport?: () => void;
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
  {#each choices as choice}
    <div class="setting" role="group" aria-label={choice.label}>
      <span>{choice.label}</span>
      <div class="segments">{#each choice.options as option}<button aria-pressed={choice.value === option.id} onclick={() => choice.onchoose(option.id)}>{option.label}</button>{/each}</div>
    </div>
  {/each}
  <div role="menu" aria-label="Display settings">
    {#each switches as option}
      <button class="switch" role="menuitemcheckbox" aria-checked={option.on} onclick={option.ontoggle}><span>{option.label}</span><span aria-hidden="true">{option.on ? '✓' : '—'}</span></button>
    {/each}
  </div>
  {#each actions as action}<button class="action" onclick={action.onopen}>{#if action.icon}<span class="icon" aria-hidden="true">{action.icon}</span>{/if}{action.label}</button>{/each}
  <footer>
    {#if onedit}<button class="action" onclick={onedit}><span class="icon" aria-hidden="true">✎</span>Edit current chart</button>{/if}
    {#if oncopy}<button class="action" onclick={oncopy}><span class="icon" aria-hidden="true">⧉</span>Copy current chart</button>{/if}
    {#if onexport}<button class="action" onclick={onexport}><span class="icon" aria-hidden="true">⤓</span>Export current chart</button>{/if}
    <button class="action" onclick={onreset}><span class="icon" aria-hidden="true">↺</span>Reset settings and position</button>
    {#if ondelete}<button class="action danger" onclick={ondelete}><span class="icon" aria-hidden="true">🗑</span>Delete current imported chart</button>{/if}
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
  /* Each choice is its own bordered button, joined edge to edge, and the
     chosen one is filled: the boundaries between them are drawn, not implied. */
  .segments { display: flex; }
  .segments button { min-height: 34px; padding: 6px 10px; white-space: nowrap; color: var(--on-surface-muted); border-radius: 0; margin-left: -1px; }
  .segments button:first-child { border-radius: 6px 0 0 6px; margin-left: 0; }
  .segments button:last-child { border-radius: 0 6px 6px 0; }
  .segments button[aria-pressed="true"] { position: relative; color: var(--text-accent); border-color: var(--text-accent); background: color-mix(in srgb, var(--text-accent) 12%, transparent); }
  output { min-width: 36px; text-align: center; }
  .switch { width: 100%; border: 0; text-align: left; }
  .switch[aria-checked="true"] { color: var(--text-accent); }
  [role="menu"] { margin-block: 16px; }
  .action { width: 100%; text-align: left; margin-top: 8px; }
  /* A glyph before the label, the same width on every row so the labels line up. */
  .icon { display: inline-block; width: 1.6em; text-align: center; margin-right: 6px; }
  footer { border-top: 1px solid var(--divider); margin-top: 16px; padding-top: 8px; }
  .danger { color: var(--error, #bd3636); }
</style>
