<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import {
    DEFAULT_SETTINGS,
    FONTS,
    RANGES,
    type Font,
    type NoteMode,
    type Outside,
    type PlaygroundSettings,
    type Theme,
  } from "../lib/settings";

  let {
    settings,
    onchange,
    editing = $bindable(false),
  }: {
    settings: PlaygroundSettings;
    onchange: (settings: PlaygroundSettings) => void;
    editing?: boolean;
  } = $props();

  const noteModes = [
    { value: "basic", label: "Basic" },
    { value: "single", label: "♯/♭" },
    { value: "all", label: "All" },
  ] as const satisfies readonly { value: NoteMode; label: string }[];

  function update(patch: Partial<PlaygroundSettings>): void {
    onchange({ ...settings, ...patch });
  }
</script>

{#snippet slider(key: keyof typeof RANGES, label: string, unit: string, step = 1)}
  <label class="field-row">
    <span class="field-label">{label}</span>
    <span class="size-field">
      <input
        type="range"
        min={RANGES[key].min}
        max={RANGES[key].max}
        {step}
        value={settings[key]}
        oninput={(event) => update({ [key]: event.currentTarget.valueAsNumber })}
      />
      <output>{settings[key]}{unit}</output>
    </span>
  </label>
{/snippet}

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
      <span class="field-label">Font</span>
      <select
        value={settings.font}
        onchange={(event) => update({ font: event.currentTarget.value as Font })}
      >
        {#each FONTS as font (font.id)}
          <option value={font.id}>{font.label}</option>
        {/each}
      </select>
    </label>

    {@render slider("labelSize", "Font size", "px")}

    {@render slider("ringWidth", "Ring width", "%")}

    <div class="field-row">
      <span class="field-label">Outermost</span>
      <div class="segmented">
        {#each ["sharps", "flats"] as outside}
          <button
            class:active={settings.outside === outside}
            type="button"
            aria-pressed={settings.outside === outside}
            onclick={() => update({ outside: outside as Outside })}
          >
            {outside === "sharps" ? "Sharps" : "Flats"}
          </button>
        {/each}
      </div>
    </div>

    {@render slider("spiral", "Spiral", "%", 10)}

    <label class="check-row">
      <input
        type="checkbox"
        checked={settings.showKeySignatures}
        onchange={(event) =>
          update({ showKeySignatures: event.currentTarget.checked })}
      />
      <span>Show key signatures</span>
    </label>
    {#if settings.showKeySignatures}
      {@render slider("signatureSize", "Key signature size", "%", 10)}
    {/if}
  </section>

  <section>
    <h2>Notes and cells</h2>
    <div class="note-modes" role="group" aria-label="Visible note preset">
      {#each noteModes as mode}
        <button
          class:active={settings.noteMode === mode.value}
          type="button"
          aria-pressed={settings.noteMode === mode.value}
          onclick={() => update({ noteMode: mode.value })}
        >
          {mode.label}
        </button>
      {/each}
    </div>
    <div class="edit-row">
      <button
        class="secondary-button"
        class:active={editing}
        type="button"
        aria-pressed={editing}
        onclick={() => (editing = !editing)}
      >{editing ? "Done" : "Edit"}</button>
      {#if editing && settings.highlightedCells.length > 0}
        <button class="text-button" type="button" onclick={() => update({ highlightedCells: [] })}>Clear highlights</button>
      {/if}
    </div>
    <p class="field-hint">
      {#if editing}
        Tap a note to show or hide it, or elsewhere in a cell to highlight it.
      {:else if settings.noteMode === "custom"}
        {settings.customNotes.length} notes picked by hand
      {/if}
    </p>
  </section>

  <section>
    <button
      class="text-button"
      type="button"
      onclick={() => {
        editing = false;
        onchange(DEFAULT_SETTINGS);
      }}
    >Reset all settings</button>
  </section>
</aside>
