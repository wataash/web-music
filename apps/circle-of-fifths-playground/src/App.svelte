<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import {
    renderCircleOfFifthsSvg,
    renderDarkCircleOfFifthsSvg,
  } from "@circle-of-fifths/svg";

  import Controls from "./components/Controls.svelte";
  import Preview from "./components/Preview.svelte";
  import {
    renderOptionsFor,
    searchFromSettings,
    settingsFromSearch,
    cellAt,
    toggleCell,
    toggleNote,
    visibleNotesFor,
    type PlaygroundSettings,
  } from "./lib/settings";

  let settings = $state<PlaygroundSettings>(
    settingsFromSearch(window.location.search),
  );
  let copyStatus = $state<"idle" | "copied" | "failed">("idle");
  let editing = $state(false);

  function render(settings: PlaygroundSettings): { svg: string; error: string | null } {
    try {
      const render =
        settings.theme === "dark"
          ? renderDarkCircleOfFifthsSvg
          : renderCircleOfFifthsSvg;
      return { svg: render(renderOptionsFor(settings)), error: null };
    } catch (error) {
      return {
        svg: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const result = $derived(render(settings));
  // Editing draws every spelling, so a hidden one can be tapped back.
  const preview = $derived(editing ? render({ ...settings, noteMode: "all" }) : result);
  const shown = $derived.by(() => {
    const visible = visibleNotesFor(settings);
    return visible === undefined ? undefined : new Set(visible);
  });

  function changeSettings(next: PlaygroundSettings): void {
    settings = next;
    syncUrl();
  }

  function syncUrl(): void {
    const search = searchFromSettings(settings);
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }

  function downloadSvg(): void {
    if (result.error) return;
    const blob = new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "circle-of-fifths.svg";
    link.click();
    URL.revokeObjectURL(href);
  }

  async function copyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyStatus = "copied";
    } catch {
      copyStatus = "failed";
    }
    window.setTimeout(() => (copyStatus = "idle"), 1600);
  }
</script>

<!-- What prints is the diagram itself, not the faint spellings of editing. -->
<svelte:window onbeforeprint={() => (editing = false)} />

<header class="app-header">
  <h1>Circle of Fifths</h1>
  <div class="header-actions">
    <button class="bar-button" type="button" onclick={copyUrl}>
      {copyStatus === "copied"
        ? "Copied"
        : copyStatus === "failed"
          ? "Copy failed"
          : "Copy settings URL"}
    </button>
    <button
      class="bar-button"
      type="button"
      disabled={result.error !== null}
      onclick={downloadSvg}
    >Export SVG</button>
  </div>
</header>

<main>
  <div class="workspace">
    <Controls {settings} onchange={changeSettings} bind:editing />
    <section class="canvas" aria-label="Circle of fifths preview">
      <Preview
        svg={preview.svg}
        error={preview.error}
        {editing}
        {shown}
        ontoggle={(note) => changeSettings(toggleNote(settings, note))}
        ontap={(x, y) => {
          const cell = cellAt(settings, x, y);
          if (cell !== null) changeSettings(toggleCell(settings, cell));
        }}
      />
    </section>
  </div>
</main>
