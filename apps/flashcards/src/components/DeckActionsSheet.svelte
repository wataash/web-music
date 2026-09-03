<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  // What a deck row offers on a long press, and what the reviewer's ⋮ opens.
  // A sheet rather than a row of buttons: it costs no width in the deck list,
  // where the counts already take most of it.

  let {
    deckLabel,
    undo,
    redo,
    onaddnew,
    onstudymore,
    onnotesettings,
    rotate,
    answerPlacement,
    switches = [],
    sizes = [],
    onreset,
    onclose,
  }: {
    deckLabel: string;
    // The last operation, named, and the one undoing it would put back —
    // offered only while there is one, since a row that does nothing is worse
    // than no row at all.
    undo?: Readonly<{ label: string; onchoose: () => void }>;
    redo?: Readonly<{ label: string; onchoose: () => void }>;
    // The one press that covers most of what the study-more dialog is opened
    // for, offered only while today's new cards are done and the deck still
    // has some.
    onaddnew?: () => void;
    // Only the reviewer offers this: the deck list has nothing on screen to
    // add cards to.
    onstudymore?: () => void;
    onnotesettings?: () => void;
    // A quarter turn each way, and the card's present one between them. Kept
    // open when pressed, like the sizes: turning the card is something to do
    // two or three times in a row.
    rotate?: Readonly<{ label: string; onstep: (steps: 1 | -1) => void }>;
    // Where the answer buttons are. Beside the turn, since a card is turned
    // and then answered from wherever that leaves the hand — but pointed at
    // on a screen of its own rather than stepped through here: there are
    // eleven places and no room to say which is which in a row.
    answerPlacement?: Readonly<{ label: string; onopen: () => void }>;
    // What the card draws or leaves out, each a row that stays where it is
    // when pressed: the card behind the sheet is the answer to it.
    switches?: readonly Readonly<{
      label: string;
      on: boolean;
      ontoggle: () => void;
    }>[];
    // Sizes to step up and down, shown as their own rows: what a card draws
    // large enough to read is the reader's call, and the answer to it is on
    // the screen behind this sheet.
    sizes?: readonly Readonly<{
      label: string;
      value: string;
      onstep: (steps: 1 | -1) => void;
      // A size that is not a multiple of anything, offered beside the stepper
      // rather than hidden past one end of it.
      option?: Readonly<{ label: string; active: boolean; onselect: () => void }>;
    }>[];
    onreset: () => void;
    onclose: () => void;
  } = $props();

  function handleKey(event: KeyboardEvent): void {
    if (event.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

<!-- Closing on a scrim click is decided by the target, so the sheet itself
     needs no click handler of its own. -->
<div
  class="scrim"
  role="presentation"
  onclick={(event) => {
    if (event.target === event.currentTarget) onclose();
  }}
>
  <div class="sheet" role="menu" tabindex="-1" aria-label={`${deckLabel} actions`}>
    <p class="deck-label">{deckLabel}</p>
    {#if undo}
      <button class="action" role="menuitem" onclick={undo.onchoose}>
        <span class="icon" aria-hidden="true">↶</span>{undo.label}
      </button>
    {/if}
    {#if redo}
      <button class="action" role="menuitem" onclick={redo.onchoose}>
        <span class="icon" aria-hidden="true">↷</span>{redo.label}
      </button>
    {/if}
    {#if onaddnew}
      <button class="action" role="menuitem" onclick={onaddnew}>
        <span class="icon" aria-hidden="true">＋</span>10 more new cards today
      </button>
    {/if}
    {#if onstudymore}
      <button class="action" role="menuitem" onclick={onstudymore}>
        <span class="icon" aria-hidden="true">⊕</span>Study more today
      </button>
    {/if}
    {#if onnotesettings}
      <button class="action" role="menuitem" onclick={onnotesettings}>
        <span class="icon" aria-hidden="true">⚙</span>Note settings
      </button>
    {/if}
    {#if rotate}
      <div class="action size" role="group" aria-label="Rotate card">
        <span class="icon" aria-hidden="true">⟳</span>Rotate card
        <span class="stepper">
          <button
            aria-label="Rotate anticlockwise"
            onclick={() => rotate.onstep(-1)}>🔄</button
          >
          <span class="value">{rotate.label}</span>
          <button
            aria-label="Rotate clockwise"
            onclick={() => rotate.onstep(1)}>🔃</button
          >
        </span>
      </div>
    {/if}
    {#if answerPlacement}
      <button class="action" role="menuitem" onclick={answerPlacement.onopen}>
        <span class="icon" aria-hidden="true">◱</span>Answer buttons
        <span class="value">{answerPlacement.label}</span>
      </button>
    {/if}
    {#each sizes as size (size.label)}
      <div class="action size" role="group" aria-label={size.label}>
        <span class="icon" aria-hidden="true">⤢</span>{size.label}
        <span class="stepper">
          {#if size.option}
            <button
              class="option"
              class:active={size.option.active}
              aria-pressed={size.option.active}
              onclick={size.option.onselect}>{size.option.label}</button
            >
          {/if}
          <button
            aria-label={`${size.label} smaller`}
            onclick={() => size.onstep(-1)}>−</button
          >
          <span class="value">{size.value}</span>
          <button
            aria-label={`${size.label} larger`}
            onclick={() => size.onstep(1)}>+</button
          >
        </span>
      </div>
    {/each}
    {#each switches as option (option.label)}
      <button
        class="action"
        role="menuitemcheckbox"
        aria-checked={option.on}
        onclick={option.ontoggle}
      >
        <span class="icon" aria-hidden="true">{option.on ? "☑" : "☐"}</span
        >{option.label}
      </button>
    {/each}
    <button class="action danger" role="menuitem" onclick={onreset}>
      <span class="icon" aria-hidden="true">↺</span>Reset study progress
    </button>
  </div>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgb(0 0 0 / 0.55);
  }

  .sheet {
    width: min(100%, 520px);
    /* A phone on its side has room for three or four of these rows, and a
       sheet taller than the screen would otherwise run off the top of it with
       no way to reach what is up there. */
    max-height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 8px 0 env(safe-area-inset-bottom, 8px);
    border-radius: 12px 12px 0 0;
    background: var(--surface);
    color: var(--on-surface);
    box-shadow: 0 -8px 24px rgb(0 0 0 / 0.4);
  }

  .deck-label {
    margin: 0;
    padding: 12px 20px;
    border-bottom: 1px solid var(--divider);
    color: var(--on-surface-muted);
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .action {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 52px;
    padding: 0 20px;
    text-align: left;
    font-size: 15px;
  }

  .action:active {
    background: var(--bg);
  }

  .action.danger {
    color: var(--ease-again);
  }

  .icon {
    width: 20px;
    text-align: center;
    font-size: 17px;
  }

  .value {
    margin-left: auto;
    color: var(--on-surface-muted);
    font-size: 13px;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .stepper button {
    width: 40px;
    height: 40px;
    border: 1px solid var(--divider);
    border-radius: 50%;
    color: var(--on-surface);
    font-size: 18px;
  }

  .stepper button:active {
    background: var(--bg);
  }

  .stepper .option {
    width: auto;
    height: 32px;
    padding: 0 10px;
    border-radius: 16px;
    color: var(--on-surface-muted);
    font-size: 12px;
    font-weight: 500;
  }

  .stepper .option.active {
    border-color: var(--count-new);
    color: var(--count-new);
  }

  .stepper .value {
    min-width: 5em;
    margin-left: 0;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
</style>
