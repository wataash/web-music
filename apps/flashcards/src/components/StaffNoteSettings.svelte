<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { renderStaffRowSvg, type Clef } from "@web-music/music-staff-core";
  import {
    ALL_STAFF_NOTES,
    presetForClefSelection,
    selectionForPreset,
    type StaffNoteDifficulty,
    type StaffNoteSelection,
  } from "../lib/staff-note-selection";

  let {
    clef,
    deckLabel,
    selection,
    onchange,
  }: {
    clef: Clef;
    deckLabel: string;
    // The whole selection, of which this section owns one clef: the dialog
    // holds it, so several clefs can be set before anything is applied.
    selection: StaffNoteSelection;
    onchange: (pitches: readonly string[]) => void;
  } = $props();

  const draft = $derived(selection);
  const preset = $derived(presetForClefSelection(draft, clef));
  const pitches = $derived(ALL_STAFF_NOTES[clef]);
  const selectedCount = $derived(draft[clef].length);
  // The clef's own notes on one staff, low to high, each in a column that
  // says its name and answers a tap. Reading them off the staff is the skill
  // the deck teaches, so it is what the choosing is done on too.
  const staffRow = $derived(
    renderStaffRowSvg({ clef, pitches, selected: draft[clef] }),
  );

  let rowElement = $state<HTMLDivElement>();
  // Where the row is scrolled to, kept across redraws: the whole staff is
  // drawn again when a note is tapped, and the reader is still looking at the
  // part they tapped.
  let scrollLeft: number | null = null;

  $effect(() => {
    void staffRow;
    const element = rowElement;
    if (element === undefined) return;
    // The chosen notes are what the reader came for, so the row opens on them
    // rather than on the ledger lines at its ends.
    scrollLeft ??= centreOfChosen(element);
    element.scrollLeft = scrollLeft;
  });

  function centreOfChosen(element: HTMLDivElement): number {
    const chosen = element.querySelectorAll('[data-selected="true"]');
    const first = chosen[0]?.getBoundingClientRect();
    const last = chosen[chosen.length - 1]?.getBoundingClientRect();
    if (first === undefined || last === undefined) return 0;
    const centre =
      (first.left + last.right) / 2 -
      element.getBoundingClientRect().left +
      element.scrollLeft;
    return centre - element.clientWidth / 2;
  }

  function choosePreset(value: StaffNoteDifficulty): void {
    onchange(selectionForPreset(value)[clef]);
  }

  function togglePitch(pitch: string): void {
    const selected = new Set(draft[clef]);
    if (selected.has(pitch)) selected.delete(pitch);
    else selected.add(pitch);
    onchange(pitches.filter((candidate) => selected.has(candidate)));
  }

  // The notes are drawn, not listed, so the tap lands on whatever part of a
  // column it hits and the column says which note that is.
  function pitchFrom(target: EventTarget | null): string | null {
    return target instanceof Element
      ? (target.closest("[data-pitch]")?.getAttribute("data-pitch") ?? null)
      : null;
  }

  function handleClick(event: MouseEvent): void {
    const pitch = pitchFrom(event.target);
    if (pitch !== null) togglePitch(pitch);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== " " && event.key !== "Enter") return;
    const pitch = pitchFrom(event.target);
    if (pitch === null) return;
    event.preventDefault();
    togglePitch(pitch);
  }
</script>

<section class="note-table-section">
  <div class="table-summary">
    <span>{deckLabel}</span>
    <span class="selected-count">
      {selectedCount} / {pitches.length} selected
    </span>
  </div>
  <!-- The staff is wider than the dialog, as a clef's whole range is wider
       than a phone: it scrolls sideways rather than shrinking to illegible. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="staff-scroll"
    bind:this={rowElement}
    onscroll={() => (scrollLeft = rowElement?.scrollLeft ?? null)}
    onclick={handleClick}
    onkeydown={handleKeyDown}
  >
    <!-- Drawn by the same renderer as the cards, from a fixed list of
         pitches, never user input. -->
    {@html staffRow}
  </div>
</section>

<fieldset class="presets">
  <legend>Note Preset</legend>
  <label>
    <input
      type="radio"
      name={`staff-note-preset-${clef}`}
      checked={preset === "basic"}
      onchange={() => choosePreset("basic")}
    />
    <span>Basic <small>(Up to 2 Ledger Lines, Default)</small></span>
  </label>
  <label>
    <input
      type="radio"
      name={`staff-note-preset-${clef}`}
      checked={preset === "advanced"}
      onchange={() => choosePreset("advanced")}
    />
    <span>Up to Advanced <small>(Up to 4 Ledger Lines)</small></span>
  </label>
  <label>
    <input
      type="radio"
      name={`staff-note-preset-${clef}`}
      checked={preset === "esoteric"}
      onchange={() => choosePreset("esoteric")}
    />
    <span>All <small>(Includes Esoteric, 6 Ledger Lines)</small></span>
  </label>
  <label>
    <input
      type="radio"
      name={`staff-note-preset-${clef}`}
      checked={preset === "custom"}
      disabled
    />
    <span>Custom</span>
  </label>
</fieldset>

<p class="hint">
  This selection controls which <code>{deckLabel}</code> notes are studied,
  in both <code>Staff → Note</code> and <code>Note → Staff</code>.
</p>

<style>
  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    margin-bottom: 8px;
    color: var(--on-surface-muted);
    font-size: 13px;
  }

  .presets {
    display: grid;
    gap: 4px;
    margin-top: 16px;
  }

  .presets label {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 40px;
    cursor: pointer;
  }

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--count-new);
  }

  small,
  .selected-count,
  .hint {
    color: var(--on-surface-muted);
  }

  .note-table-section {
    border: 1px solid var(--divider);
    border-radius: 8px;
    overflow: hidden;
  }

  .table-summary {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    border-bottom: 1px solid var(--divider);
    font-weight: 500;
  }

  .selected-count {
    font-size: 13px;
    font-weight: 400;
  }

  .staff-scroll {
    overflow-x: auto;
    padding: 12px 0;
    color: var(--on-surface);
  }

  .staff-scroll :global(svg) {
    display: block;
    height: 200px;
    width: auto;
    /* Room to scroll past the last note, so the highest is as easy to reach
       as the rest. */
    margin-inline: 12px;
  }

  /* A tapped column lights up rather than moving, so a run of notes can be
     turned on without the row shifting under the finger. */
  .staff-scroll :global(.staff__note:focus-visible .staff__column) {
    opacity: 0.25;
  }

  .staff-scroll :global(.staff__note) {
    outline: none;
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
    font-size: 0.95em;
    font-weight: 500;
    white-space: nowrap;
  }
</style>
