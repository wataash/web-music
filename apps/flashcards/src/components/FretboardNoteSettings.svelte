<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import {
    ALL_FRETBOARD_NOTES,
    fretboardNotesForPreset,
    presetForFretboardNotes,
    type FretboardNoteSpelling,
  } from "../lib/fretboard-card";

  let {
    deckLabel,
    selection,
    onchange,
  }: {
    deckLabel: string;
    selection: readonly string[];
    onchange: (notes: readonly string[]) => void;
  } = $props();

  const preset = $derived(presetForFretboardNotes(selection));
  const selectedCount = $derived(
    ALL_FRETBOARD_NOTES.filter(({ note }) => selection.includes(note)).length,
  );

  const SPELLING_LABELS = {
    natural: "Natural",
    sharp: "Sharp",
    flat: "Flat",
    enharmonic: "Both names",
  } as const satisfies Readonly<Record<FretboardNoteSpelling, string>>;

  function choosePreset(value: "naturals" | "all"): void {
    onchange(fretboardNotesForPreset(value));
  }

  function toggleNote(note: string, checked: boolean): void {
    const selected = new Set(selection);
    if (checked) selected.add(note);
    else selected.delete(note);
    onchange(
      ALL_FRETBOARD_NOTES.filter(({ note: candidate }) =>
        selected.has(candidate),
      ).map(({ note: candidate }) => candidate),
    );
  }
</script>

<section class="note-table-section">
  <div class="table-summary">
    <span>{deckLabel}</span>
    <span class="selected-count">
      {selectedCount} / {ALL_FRETBOARD_NOTES.length} selected
    </span>
  </div>
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>Note</th>
          <th>Spelling</th>
        </tr>
      </thead>
      <tbody>
        {#each ALL_FRETBOARD_NOTES as row (row.note)}
          <tr>
            <td>
              <label class="note-choice">
                <input
                  type="checkbox"
                  checked={selection.includes(row.note)}
                  onchange={(event) =>
                    toggleNote(row.note, event.currentTarget.checked)}
                />
                <span>{row.note}</span>
              </label>
            </td>
            <td class="spelling">{SPELLING_LABELS[row.spelling]}</td>
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
      name="fretboard-note-preset"
      checked={preset === "naturals"}
      onchange={() => choosePreset("naturals")}
    />
    <span>Naturals <small>(Default)</small></span>
  </label>
  <label>
    <input
      type="radio"
      name="fretboard-note-preset"
      checked={preset === "all"}
      onchange={() => choosePreset("all")}
    />
    <span>All <small>(Adds ♭, ♯ and both-names notes)</small></span>
  </label>
  <label>
    <input
      type="radio"
      name="fretboard-note-preset"
      checked={preset === "custom"}
      disabled
    />
    <span>Custom</span>
  </label>
</fieldset>

<p class="hint">
  A pitch with two names is asked three ways — under each name on its own, and
  under both at once, as <code>A♯B♭</code>, where one dot carries the two
  spellings. This selection controls which
  <code>{deckLabel}</code> cards are studied.
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

  .table-scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
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

  .note-choice {
    gap: 6px;
    min-height: 32px;
    font-size: 15px;
  }

  .spelling {
    color: var(--on-surface-muted);
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
