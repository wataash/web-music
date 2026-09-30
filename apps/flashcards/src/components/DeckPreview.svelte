<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount } from "svelte";
  import NoteFontSelect from "./NoteFontSelect.svelte";
  import { noteFontPreference } from "../lib/note-font.svelte";
  import { changedBundledDeckEntries, fetchBundledDeck } from "../lib/bundled-decks";
  import { changedDevDeckEntries, fetchDevDeck } from "../lib/dev-decks";
  import { representativeCards, previewDocument } from "../lib/deck-preview";
  import { deckLabel } from "../lib/deck-labels";
  import { compareDeckNames } from "../lib/deck-visibility";

  let rows = $state<ReturnType<typeof representativeCards>>([]);
  let loading = $state(true);
  let error = $state("");
  let query = $state("");
  let showKeyboard = $state(true);
  let width = $state(390);
  const label = (name: string) => name.split("::").map((_, index, parts) =>
    deckLabel(parts.slice(0, index + 1).join("::"))).join(" / ");
  const filtered = $derived(rows.filter(row => label(row.deckName).toLowerCase().includes(query.toLowerCase())));

  async function load() {
    loading = true;
    error = "";
    try {
      const entries = import.meta.env.DEV
        ? await changedDevDeckEntries(undefined, true)
        : await changedBundledDeckEntries(true);
      const packages = await Promise.all(entries.map(entry =>
        import.meta.env.DEV ? fetchDevDeck(entry) : fetchBundledDeck(entry)));
      rows = packages.flatMap(({ deck }) => representativeCards(deck))
        .sort((a, b) => compareDeckNames(a.deckName, b.deckName));
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  }
  onMount(() => { void load(); });
</script>

<svelte:head><title>Deck preview · Music Flashcards</title></svelte:head>

<main>
  <header>
    <a href="/">← Decks</a>
    <h1>Deck preview</h1>
    <p>One fixed sample per deck, including Experimental decks. Default card layouts; study progress and saved settings are unchanged.</p>
    <div class="controls">
      <NoteFontSelect />
      <label>Filter decks <input type="search" bind:value={query} /></label>
      <label>Card width
        <select bind:value={width}>
          <option value={390}>Mobile · 390px</option>
          <option value={640}>PC · 640px</option>
        </select>
      </label>
      <label class="checkbox"><input type="checkbox" bind:checked={showKeyboard} /> Optional keyboards</label>
    </div>
    <p role="status">{loading ? "Loading decks…" : `${filtered.length} / ${rows.length} decks`}</p>
  </header>
  {#if error}
    <p role="alert">{error} <button onclick={load}>Retry</button></p>
  {:else if !loading && filtered.length === 0}
    <p>No matching decks.</p>
  {/if}
  {#each filtered as row (row.deckName)}
    <section aria-label={label(row.deckName)}>
      <h2>{label(row.deckName)}</h2>
      <p class="sample">{row.template.name} · {row.note.guid}</p>
      <div class="pair-scroll">
        <div class="pair" style:--card-width={`${width}px`}>
          {#each [false, true] as back}
            <div class="side">
              <h3>{back ? "Back" : "Front"}</h3>
              <iframe
                title={`${label(row.deckName)} — ${back ? "Back" : "Front"}`}
                srcdoc={previewDocument(row, back, showKeyboard, noteFontPreference.value)}
                loading="lazy"
                sandbox="allow-scripts"
              ></iframe>
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/each}
</main>

<style>
  main { padding: 1.25rem; max-width: 1440px; margin: auto; }
  header p { max-width: 75ch; }
  a { color: var(--text-accent); }
  h1 { margin-bottom: 0.5rem; }
  h2 { font-size: 1.1rem; overflow-wrap: anywhere; }
  h3 { margin: 0; padding: 0.6rem; font-size: 1rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; }
  label { display: grid; gap: 0.35rem; }
  input, select, button { font: inherit; padding: 0.5rem; }
  .checkbox { display: flex; align-items: center; padding: 0.5rem 0; }
  section { border-top: 1px solid var(--divider); padding: 1rem 0 2rem; }
  .sample { color: var(--on-surface-muted); font-size: 0.8rem; }
  .pair-scroll { overflow-x: auto; }
  .pair { display: grid; grid-template-columns: repeat(2, var(--card-width)); gap: 1rem; width: max-content; }
  .side { background: var(--surface); }
  iframe { display: block; width: var(--card-width); height: 900px; border: 0; background: #111827; }
</style>
