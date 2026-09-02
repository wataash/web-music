<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { DiagramRing, HighlightedCell } from "@circle-of-fifths/svg";

  import type {
    NoteMode,
    PlaygroundSettings,
    Theme,
  } from "../lib/settings";

  let {
    settings,
    onchange,
  }: {
    settings: PlaygroundSettings;
    onchange: (settings: PlaygroundSettings) => void;
  } = $props();

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
  const rings = [
    { value: "outer", label: "Major" },
    { value: "inner", label: "Minor" },
  ] as const;
  const noteModes = [
    { value: "all", label: "All" },
    { value: "basic", label: "Basic" },
    { value: "one-per-cell", label: "One/cell" },
    { value: "none", label: "None" },
    { value: "custom", label: "Custom" },
  ] as const satisfies readonly { value: NoteMode; label: string }[];

  function update(patch: Partial<PlaygroundSettings>): void {
    onchange({ ...settings, ...patch });
  }

  function toggleCell(ring: DiagramRing, hour: number): void {
    const selected = hasCell(ring, hour);
    const highlightedCells = selected
      ? settings.highlightedCells.filter(
          (cell) => cell.ring !== ring || cell.hour !== hour,
        )
      : [...settings.highlightedCells, { ring, hour } satisfies HighlightedCell];
    update({ highlightedCells });
  }

  function hasCell(ring: DiagramRing, hour: number): boolean {
    return settings.highlightedCells.some(
      (cell) => cell.ring === ring && cell.hour === hour,
    );
  }

  function changeLabelLayout(labelLayout: "standard" | "single-note"): void {
    update({
      labelLayout,
      ...(labelLayout === "single-note" &&
      (settings.noteMode === "all" || settings.noteMode === "basic")
        ? { noteMode: "one-per-cell" as const }
        : {}),
    });
  }
</script>

<aside class="controls" aria-label="Diagram controls">
  <section>
    <h2>Appearance</h2>
    <div class="field-row">
      <span class="field-label">Theme</span>
      <div class="segmented">
        {#each ["light", "dark"] as theme}
          <button
            class:active={settings.theme === theme}
            type="button"
            aria-pressed={settings.theme === theme}
            onclick={() => update({ theme: theme as Theme })}
          >
            {theme === "light" ? "Light" : "Dark"}
          </button>
        {/each}
      </div>
    </div>

    <label class="field-row">
      <span class="field-label">Label layout</span>
      <select
        value={settings.labelLayout}
        onchange={(event) =>
          changeLabelLayout(
            event.currentTarget.value as "standard" | "single-note",
          )}
      >
        <option value="standard">Standard</option>
        <option value="single-note">Single note</option>
      </select>
    </label>

    <label class="check-row">
      <input
        type="checkbox"
        checked={settings.showKeySignatures}
        onchange={(event) =>
          update({ showKeySignatures: event.currentTarget.checked })}
      />
      <span>Show key signatures</span>
    </label>
  </section>

  <section>
    <h2>Visible notes</h2>
    <div class="note-modes" role="group" aria-label="Visible note preset">
      {#each noteModes as mode}
        <button
          class:active={settings.noteMode === mode.value}
          type="button"
          aria-pressed={settings.noteMode === mode.value}
          disabled={settings.labelLayout === "single-note" &&
            (mode.value === "all" || mode.value === "basic")}
          onclick={() => update({ noteMode: mode.value })}
        >
          {mode.label}
        </button>
      {/each}
    </div>
    {#if settings.labelLayout === "single-note"}
      <p class="field-hint">Single note requires at most one note per cell.</p>
    {/if}
    {#if settings.noteMode === "custom"}
      <label class="stacked-field">
        <span>Notes <small>separated by spaces or commas</small></span>
        <textarea
          rows="4"
          value={settings.customNotes}
          spellcheck="false"
          oninput={(event) => update({ customNotes: event.currentTarget.value })}
        ></textarea>
      </label>
    {/if}
  </section>

  <section>
    <div class="section-title-row">
      <h2>Highlight cells</h2>
      {#if settings.highlightedCells.length > 0}
        <button
          class="text-button"
          type="button"
          onclick={() => update({ highlightedCells: [] })}
        >Clear</button>
      {/if}
    </div>
    <div class="cell-grid">
      <span></span>
      {#each hours as hour}<span class="hour-label">{hour}</span>{/each}
      {#each rings as ring}
        <span class="ring-label">{ring.label}</span>
        {#each hours as hour}
          <button
            class:active={hasCell(ring.value, hour)}
            type="button"
            aria-label={`${ring.label}, ${hour} o'clock`}
            aria-pressed={hasCell(ring.value, hour)}
            onclick={() => toggleCell(ring.value, hour)}
          ></button>
        {/each}
      {/each}
    </div>
  </section>

  <details>
    <summary>Accessible text</summary>
    <label class="stacked-field">
      <span>Title</span>
      <input
        type="text"
        value={settings.title}
        oninput={(event) => update({ title: event.currentTarget.value })}
      />
    </label>
    <label class="stacked-field">
      <span>Description</span>
      <textarea
        rows="3"
        value={settings.description}
        oninput={(event) => update({ description: event.currentTarget.value })}
      ></textarea>
    </label>
  </details>
</aside>
