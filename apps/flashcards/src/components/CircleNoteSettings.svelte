<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import {
    ALL_CIRCLE_NOTES,
    circleNoteTableRows,
    presetForRingSelection,
    selectionForPreset,
    type CircleNoteSelection,
    type CircleNoteTableKind,
    type CircleRing,
  } from "../lib/circle-note-selection";

  let {
    ring,
    tableKind,
    selection,
    onchange,
  }: {
    ring: CircleRing;
    deckLabel: string;
    tableKind: CircleNoteTableKind;
    // Both rings, of which this section owns one: the dialog holds them, so
    // the major and minor decks can be set together.
    selection: CircleNoteSelection;
    onchange: (notes: readonly string[]) => void;
  } = $props();

  const draft = $derived(selection);
  const preset = $derived(presetForRingSelection(draft, ring));
  const ringLabel = $derived(ring === "outer" ? "Major" : "Minor");
  const tableRows = $derived(circleNoteTableRows(ring, tableKind));
  const selectedRowCount = $derived(
    tableRows.filter(({ note }) => draft[ring].includes(note)).length,
  );

  function choosePreset(value: "basic" | "advanced" | "all"): void {
    onchange(selectionForPreset(value)[ring]);
  }

  function toggleNote(ring: CircleRing, note: string, checked: boolean): void {
    const selected = new Set(draft[ring]);
    if (checked) selected.add(note);
    else selected.delete(note);
    onchange(
      ALL_CIRCLE_NOTES[ring].filter((candidate) => selected.has(candidate)),
    );
  }
</script>

<section class="note-table-section">
  <div class="table-summary">
    <span>{ring === "outer" ? "Outer (Major)" : "Inner (Minor)"}</span>
    <span class="selected-count">
      {selectedRowCount} / {tableRows.length} selected
    </span>
  </div>
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>Note</th>
          <th class="fifths-column">
            Fifths from {ring === "outer" ? "C" : "A"}
          </th>
          <th>Difficulty</th>
        </tr>
      </thead>
      <tbody>
        {#each tableRows as row}
          <tr>
            <td>
              <label class="note-choice">
                <input
                  type="checkbox"
                  checked={draft[ring].includes(row.note)}
                  onchange={(event) =>
                    toggleNote(ring, row.note, event.currentTarget.checked)}
                />
                <span>{row.noteLabel}</span>
              </label>
            </td>
            <td class="fifths-column">{row.fifthsFromTonic}</td>
            <td class="difficulty">{row.difficulty}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<fieldset class="presets">
  <legend>Note Preset</legend>
  <label>
    <input
      type="radio"
      name={`circle-note-preset-${ring}`}
      checked={preset === "basic"}
      onchange={() => choosePreset("basic")}
    />
    <span>Basic</span>
  </label>
  <label>
    <input
      type="radio"
      name={`circle-note-preset-${ring}`}
      checked={preset === "advanced"}
      onchange={() => choosePreset("advanced")}
    />
    <span>Advanced</span>
  </label>
  <label>
    <input
      type="radio"
      name={`circle-note-preset-${ring}`}
      checked={preset === "all"}
      onchange={() => choosePreset("all")}
    />
    <span>All</span>
  </label>
  <label>
    <input
      type="radio"
      name={`circle-note-preset-${ring}`}
      checked={preset === "custom"}
      disabled
    />
    <span>Custom</span>
  </label>
</fieldset>

<details class="help">
  <summary>Help</summary>
  <p>Fifths from {ring === "outer" ? "C" : "A"} also gives the key signature: positive for sharps, negative for flats.</p>
</details>

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

  .presets label,
  .note-choice {
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

  .selected-count {
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

  .table-scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 480px;
    border-collapse: collapse;
    font-size: 14px;
  }

  th,
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--divider);
    text-align: left;
  }

  th {
    background: rgb(0 0 0 / 0.035);
    color: var(--on-surface-muted);
    font-size: 12px;
    font-weight: 500;
    vertical-align: bottom;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  .fifths-column {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .difficulty {
    text-transform: capitalize;
  }

  .note-choice {
    gap: 6px;
    min-height: 32px;
    font-size: 15px;
  }

  .help {
    margin-top: 16px;
    color: var(--on-surface-muted);
    font-size: 13px;
  }

  .help summary {
    cursor: pointer;
  }
</style>
