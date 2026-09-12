<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount } from "svelte";
  import { liveQuery } from "dexie";
  import { db, type NoteRow } from "../lib/db";
  import GuitarIntervalMap from "./GuitarIntervalMap.svelte";
  import {
    DEFAULT_FRET_WINDOW,
    clampFretReach,
    fretWindowCellCount,
    MAX_FRET_REACH,
    guitarDifficultyLabel,
    DEFAULT_GUITAR_DIFFICULTY,
    includesGuitarIntervalCard,
    type FretWindow,
    type FretWindowSide,
  } from "../lib/guitar-interval-selection";

  let {
    deckLabel,
    selection,
    difficulty,
    overrides,
    onoverrideschange,
    ondifficultychange,
    onpreview,
    onchange,
  }: {
    deckLabel: string;
    selection: FretWindow;
    difficulty: number;
    overrides: Readonly<Record<string, boolean>>;
    onoverrideschange: (value: Readonly<Record<string, boolean>>) => void;
    ondifficultychange: (difficulty: number) => void;
    // The card on screen behind this dialog, if there is one, is redrawn to a
    // window as it is dragged, so what the setting does is visible on the
    // board itself rather than on a copy of it.
    onpreview?: (selection: FretWindow) => void;
    onchange: (selection: FretWindow) => void;
  } = $props();

  const draft = $derived(selection);
  let notes = $state<readonly NoteRow[]>([]);
  let loaded = $state(false);
  onMount(() => {
    const subscription = liveQuery(() =>
      db.notes.where("pkg").equals(deckLabel).toArray(),
    ).subscribe((rows) => {
      notes = rows;
      loaded = true;
    });
    return () => subscription.unsubscribe();
  });
  const selectedNotes = $derived(notes.filter((note) =>
    includesGuitarIntervalCard(note, draft, difficulty, overrides),
  ));
  const selectedCount = $derived(selectedNotes.length);

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

<section class="threshold">
  <label for="guitar-difficulty">
    Learning range: <strong>{difficulty} / {DEFAULT_GUITAR_DIFFICULTY}</strong>
  </label>
  <input
    id="guitar-difficulty"
    type="range"
    min="1"
    max={DEFAULT_GUITAR_DIFFICULTY}
    step="1"
    value={difficulty}
    aria-valuetext={`${difficulty}: ${guitarDifficultyLabel(difficulty)}`}
    aria-describedby="guitar-difficulty-hint"
    oninput={(event) => ondifficultychange(Number(event.currentTarget.value))}
  />
  <p id="guitar-difficulty-hint">
    {guitarDifficultyLabel(difficulty)}
  </p>
  <p class="selection-count" aria-live="polite">
    {#if loaded}{selectedCount} / {notes.length} cards selected{:else}Loading positions…{/if}
  </p>
  {#if loaded && selectedCount === 0}
    <p class="empty-selection">No cards match. Increase the learning range or widen the fret window.</p>
  {/if}
</section>

<GuitarIntervalMap {notes} {selectedNotes} window={draft} {overrides} {onoverrideschange} />

<div class="table-summary">
  <span>{deckLabel}</span>
  <span>{fretWindowCellCount(draft)} positions per root in window</span>
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
  Frets are relative to root 1. Widen the window to include more positions.
</p>

<style>
  .threshold {
    position: sticky;
    top: -16px;
    z-index: 2;
    background: var(--surface);
    padding: 12px 16px;
    margin: -16px -16px 12px;
    border-bottom: 1px solid var(--divider);
    display: grid;
    gap: 6px;
  }

  .threshold label,
  .threshold p {
    font-size: 13px;
    color: var(--on-surface-muted);
  }

  .threshold p {
    margin: 0;
  }

  .threshold strong,
  .threshold .selection-count {
    color: var(--on-surface);
    font-variant-numeric: tabular-nums;
  }

  .threshold input {
    width: 100%;
    accent-color: var(--count-new);
  }

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

</style>
