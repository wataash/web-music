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
    DEFAULT_SETTINGS,
    renderOptionsFor,
    searchFromSettings,
    settingsFromSearch,
    splitNotes,
    type PlaygroundSettings,
  } from "./lib/settings";

  let settings = $state<PlaygroundSettings>(
    settingsFromSearch(window.location.search),
  );
  let copyStatus = $state<"idle" | "copied" | "failed">("idle");

  const result = $derived.by(() => {
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
  });

  const summary = $derived(
    settings.noteMode === "all"
      ? "All notes"
      : settings.noteMode === "one-per-cell"
        ? "One note per cell"
      : settings.noteMode === "custom"
        ? `${splitNotes(settings.customNotes).length} notes`
        : `${settings.noteMode[0].toUpperCase()}${settings.noteMode.slice(1)}`,
  );

  function changeSettings(next: PlaygroundSettings): void {
    settings = next;
    syncUrl();
  }

  function reset(): void {
    changeSettings({ ...DEFAULT_SETTINGS, highlightedCells: [] });
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

<svelte:head>
  <title>{settings.title} — Playground</title>
  <meta name="description" content={settings.description} />
</svelte:head>

<main>
  <header class="app-header">
    <div>
      <p class="eyebrow">Music theory laboratory</p>
      <h1>Circle of Fifths</h1>
    </div>
    <div class="header-actions">
      <button class="secondary-button" type="button" onclick={copyUrl}>
        {copyStatus === "copied"
          ? "Copied"
          : copyStatus === "failed"
            ? "Copy failed"
            : "Copy settings URL"}
      </button>
      <button
        class="primary-button"
        type="button"
        disabled={result.error !== null}
        onclick={downloadSvg}
      >Export SVG</button>
    </div>
  </header>

  <div class="workspace">
    <Controls {settings} onchange={changeSettings} />
    <section class="canvas" aria-label="Circle of fifths preview">
      <div class="canvas-header">
        <div>
          <span class="status-dot" class:error-dot={result.error !== null}></span>
          <span>{result.error ? "Invalid settings" : summary}</span>
        </div>
        <button class="reset-button" type="button" onclick={reset}>Reset</button>
      </div>
      <Preview svg={result.svg} error={result.error} />
    </section>
  </div>
</main>
