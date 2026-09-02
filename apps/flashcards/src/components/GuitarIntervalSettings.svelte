<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import {
    DEFAULT_FRET_WINDOW,
    clampFretReach,
    fretWindowCellCount,
    MAX_FRET_REACH,
    type FretWindow,
    type FretWindowSide,
  } from "../lib/guitar-interval-selection";

  let {
    deckLabel,
    selection,
    onpreview,
    onchange,
  }: {
    deckLabel: string;
    selection: FretWindow;
    // The card on screen behind this dialog, if there is one, is redrawn to a
    // window as it is dragged, so what the setting does is visible on the
    // board itself rather than on a copy of it.
    onpreview?: (selection: FretWindow) => void;
    onchange: (selection: FretWindow) => void;
  } = $props();

  const draft = $derived(selection);

  function setSide(side: FretWindowSide, value: number): void {
    const next = { ...draft, [side]: clampFretReach(value) };
    onchange(next);
    onpreview?.(next);
  }

  function reset(): void {
    onchange({ ...DEFAULT_FRET_WINDOW });
    onpreview?.({ ...DEFAULT_FRET_WINDOW });
  }

  const isDefault = $derived(
    draft.left === DEFAULT_FRET_WINDOW.left &&
      draft.right === DEFAULT_FRET_WINDOW.right,
  );

  const sides: readonly Readonly<{
    side: FretWindowSide;
    label: string;
    // The board grows outwards from the root, so the slider below it runs
    // outwards too: dragging away from the middle is always more frets.
    mirrored: boolean;
  }>[] = [
    { side: "left", label: "Frets below the root", mirrored: true },
    { side: "right", label: "Frets above the root", mirrored: false },
  ];
</script>

<div class="table-summary">
  <span>{deckLabel}</span>
  <span>{fretWindowCellCount(draft)} positions asked</span>
</div>

<div class="reaches">
  {#each sides as { side, label, mirrored }}
    <section class="reach">
      <label for="fret-reach-{side}">
        {label}: <strong>{draft[side]}</strong>
      </label>
      <input
        id="fret-reach-{side}"
        type="range"
        class:mirrored
        min="0"
        max={MAX_FRET_REACH}
        step="1"
        value={draft[side]}
        oninput={(event) => setSide(side, Number(event.currentTarget.value))}
      />
    </section>
  {/each}
</div>

<div class="reset">
  <button disabled={isDefault} onclick={reset}>
    RESET TO {DEFAULT_FRET_WINDOW.left} AND {DEFAULT_FRET_WINDOW.right}
  </button>
</div>

<p class="hint">
  <code>{deckLabel}</code> draws the neck around the root instead of at a
  fret number, so this is how far the board reaches either way — and with it,
  which positions the deck asks about.
</p>

<style>
  .table-summary {
    display: flex;
    justify-content: space-between;
    padding: 0 0 14px;
    border-bottom: 1px solid var(--divider);
    font-weight: 500;
  }

  .table-summary span:last-child,
  .hint,
  .reach label {
    color: var(--on-surface-muted);
  }

  .table-summary span:last-child {
    font-size: 13px;
    font-weight: 400;
  }

  /* Side by side, in the order the board reads. */
  .reaches {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 16px;
  }

  .reach {
    display: grid;
    align-content: start;
    gap: 8px;
  }

  .reach label {
    font-size: 13px;
  }

  .reach strong {
    color: var(--on-surface);
    font-variant-numeric: tabular-nums;
  }

  .reach input {
    width: 100%;
    accent-color: var(--count-new);
  }

  /* Right to left, so zero sits against the root in the middle and the arrow
     keys follow the same direction the thumb does. */
  .reach input.mirrored {
    direction: rtl;
  }

  .reset {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .reset button {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 4px;
    color: var(--count-new);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  .reset button:disabled {
    cursor: default;
    color: var(--on-surface-muted);
    opacity: 0.5;
  }

  .hint {
    margin: 16px 0 0;
    font-size: 13px;
  }

  .hint code {
    padding: 2px 5px;
    border-radius: 4px;
    background: var(--divider);
    color: var(--on-surface);
    font-family: inherit;
  }
</style>
