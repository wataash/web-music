<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { DEFAULT_TUNING } from "../lib/tuning";
  import { onMount, tick } from "svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey, hasView, minorNotation } = chordViewPersistence();
  import { CHORD_BOARD_NUT_X, CHORD_BOARD_FRET_WIDTH, chordBoardHeight } from "../lib/chord-fretboard";
  import type { ChordDescription } from "../lib/chords";
  import { chordLyric, type AnnotatedChord } from "../lib/chord-metadata";
  import { headingChord } from "../lib/ireal-layout";
  import ChordMetadata from "./ChordMetadata.svelte";
  import SongSource from "./SongSource.svelte";
  import ChordSource from "./ChordSource.svelte";
  import { SCREEN_WIDTH, type CardScale } from "@web-music/practice-ui/card-scale";
  import ChordFretboard from "./ChordFretboard.svelte";
  import ChordTones from "./ChordTones.svelte";

  let {
    chords,
    songId = "",
    sourceSymbols = [],
    sourceIndex = $bindable(0),
    fretCount,
    tuning = DEFAULT_TUNING,
    bassStrings = $bindable<number[]>([]),
    soundEnabled,
    shortcutsEnabled = true,
    uniqueBySection = false,
    editable = false,
    heading = (symbol: string) => headingChord(symbol, minorNotation()),
    subheading = () => undefined,
    sublabels,
    onplay,
    onplayfret,
  }: {
    chords: AnnotatedChord[];
    songId?: string;
    sourceSymbols?: string[];
    sourceIndex?: number;
    fretCount: number;
    bassStrings: number[];
    tuning?: readonly number[];
    soundEnabled: boolean;
    shortcutsEnabled?: boolean;
    uniqueBySection?: boolean;
    editable?: boolean;
    // What a card calls its chord: its name, or its degree in the key.
    heading?: (symbol: string) => string;
    subheading?: (symbol: string) => string | undefined;
    sublabels?: string[];
    onplay: (chord: ChordDescription) => void;
    onplayfret: (string: number, fret: number) => void;
  } = $props();

  const currentIndex = $derived(Math.max(0, chords.findIndex((chord, index) =>
    chord.sourceIndices ? chord.sourceIndices.includes(sourceIndex) : index === sourceIndex)));
  let fullChartOpen = $state(false);
  let boardScale = $state<CardScale>(SCREEN_WIDTH);
  const entries: HTMLLIElement[] = [];
  let scrollElement: HTMLElement;
  let loaded = $state<Set<number>>(new Set());
  onMount(() => {
    const observer = new IntersectionObserver((changes) => {
      const next = new Set(loaded);
      for (const entry of changes) {
        if (!entry.isIntersecting) continue;
        next.add(Number((entry.target as HTMLElement).dataset.listBoard));
        observer.unobserve(entry.target);
      }
      loaded = next;
    }, { root: scrollElement, rootMargin: "600px 0px" });
    scrollElement.querySelectorAll("[data-list-board]").forEach((board) => observer.observe(board));
    if (currentIndex > 0 && !hasView(viewKey("list-scroll"))) entries[currentIndex]?.scrollIntoView({ block: "start", behavior: "instant" });
    return () => observer.disconnect();
  });

  function selectChord(index: number): void {
    sourceIndex = chords[index].sourceIndices?.[0] ?? index;
    entries[index]?.scrollIntoView({ block: "start", behavior: "instant" });
    if (soundEnabled && !chords[index].noChord) onplay(chords[index]);
  }

  // A chord chosen on a chart is brought into view: the chart is above the
  // list, and the card it names may be anywhere down it.
  async function jumpToSource(value: number): Promise<void> {
    sourceIndex = value;
    await tick();
    entries[currentIndex]?.scrollIntoView({ block: "start", behavior: "instant" });
  }

  function move(step: number): void {
    const next = currentIndex + step;
    if (next >= 0 && next < chords.length) selectChord(next);
  }

  function handleKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!shortcutsEnabled || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      target?.closest('dialog') || target?.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName ?? "")) return;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    move(event.key === "ArrowUp" ? -1 : 1);
  }
</script>

<svelte:window onkeydown={handleKey} />

<!-- The scroll container needs keyboard focus for Page Up/Down and arrow scrolling. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<main class="chord-list" aria-label="Chord list" tabindex="0" bind:this={scrollElement} use:remember={viewKey("list-scroll")}>
  <div class="list-content">
    <SongSource {songId} symbols={sourceSymbols} {sublabels} bind:open={fullChartOpen} onselect={(value) => void jumpToSource(value)} selected={[sourceIndex]} {editable} />
    <p class="count">{chords.length} chords · {uniqueBySection ? "Unique chords in first-appearance order within each section" : "Unique chords in first-appearance order"}</p>
    <ol>
      {#each chords as chord, index}
        {@const lyric = chordLyric(songId, chord.sourceIndices?.[0] ?? index)}
        <li bind:this={entries[index]} aria-current={currentIndex === index ? "true" : undefined}>
          <ChordMetadata annotation={chord.annotation} />
          {#if !fullChartOpen}<ChordSource {songId} onselect={(value) => void jumpToSource(value)} indices={chord.sourceIndices ?? []} symbols={sourceSymbols} {sublabels} />{/if}
          <div class="heading">
            <span class="number">{index + 1} / {chords.length}</span>
            <h2>{heading(chord.symbol)}{#if subheading(chord.symbol)}<span class="chord-name">{subheading(chord.symbol)}</span>{/if}</h2>
            {#if lyric}<p class="lyric" aria-label="Lyrics">{lyric}</p>{/if}
            {#if !chord.noChord}
              <button disabled={!soundEnabled} aria-label={`${index + 1}: Play ${chord.symbol}`} onclick={() => selectChord(index)}>Play chord</button>
            {/if}
          </div>
          <div data-list-board={index} class="list-board" class:loaded={loaded.has(index)} style:aspect-ratio={loaded.has(index) ? undefined : `${CHORD_BOARD_NUT_X + fretCount * CHORD_BOARD_FRET_WIDTH} / ${chordBoardHeight(tuning.length)}`}>
            {#if loaded.has(index)}
              <ChordFretboard {tuning} {chord} {fretCount} {bassStrings} bind:scale={boardScale} onplay={onplayfret} />
            {/if}
          </div>
          {#if chord.noChord}
            <p>No chord tones</p>
          {:else}
            <div class="chord-tones"><ChordTones {chord} /></div>
          {/if}
        </li>
      {/each}
    </ol>
  </div>
</main>

<nav class="list-navigation" aria-label="Chord list navigation">
  <button aria-label="Previous chord" disabled={currentIndex === 0} onclick={() => move(-1)}>↑</button>
  <span aria-live="polite">{currentIndex + 1} / {chords.length} · {chords[currentIndex].symbol}</span>
  <button aria-label="Next chord" disabled={currentIndex === chords.length - 1} onclick={() => move(1)}>↓</button>
</nav>

<style>
  .list-navigation { flex: none; display: flex; align-items: center; gap: 12px; padding: 8px 16px max(8px, env(safe-area-inset-bottom)); background: var(--surface); border-top: 1px solid var(--divider); }
  .list-navigation span { flex: 1; text-align: center; font-variant-numeric: tabular-nums; }
  .list-navigation button { min-width: 64px; min-height: 48px; font-size: 28px; }
  .chord-list { flex: 1; min-height: 0; overflow-y: auto; }
  .list-content { max-width: 1280px; margin: 0 auto; padding: 12px 16px 28px; }
  .count, .number { color: var(--on-surface-muted); font-size: 12px; }
  ol { list-style: none; margin: 0; padding: 0; }
  li { padding: 16px 0; border-top: 1px solid var(--divider); }
  .list-board.loaded { background: transparent; }
  .list-board { background: #111827; border-radius: 8px; }
  li[aria-current="true"] { box-shadow: inset 3px 0 var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--bg)); }
  .heading { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; }
  h2 { margin: 0; font-size: 28px; }
  .chord-name { margin-left: 0.5em; font-size: 14px; color: var(--on-surface-muted); }
  .lyric { flex-basis: 100%; margin: 0; font-size: 16px; line-height: 1.4; overflow-wrap: anywhere; }
  button { padding: 8px 12px; color: var(--on-surface); background: var(--surface); border: 1px solid var(--divider); border-radius: 6px; }
  button:hover { background: color-mix(in srgb, var(--on-surface) 6%, var(--surface)); }
  button:focus-visible { outline: 2px solid var(--text-accent); outline-offset: 2px; }
  .chord-tones { margin-top: 12px; }
</style>
