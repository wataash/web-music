<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { ChordSong } from '../lib/chord-songs';
  let { songs, selected, onselect }: { songs: readonly ChordSong[]; selected: ChordSong; onselect: (song: ChordSong) => void } = $props();
  const tabId = $derived(songs.some(song => song.id === selected.id) ? selected.id : songs[0]?.id);
  function navigate(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const rows = [...(event.currentTarget as HTMLElement).closest('.song-picker')!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = rows.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault(); event.stopPropagation();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1);
    rows[Math.max(0, Math.min(rows.length - 1, next))]?.focus();
  }
</script>

<div class="song-picker" role="group" aria-label="Song" data-selected={selected.id}>
  {#if !songs.some(song => song.id === selected.id)}
    <button class="song-row" value={selected.id} disabled aria-pressed="true"><span class="row-text"><span class="row-title">{selected.title}</span><span class="row-artist">Current song · outside filters</span></span></button>
  {/if}
  {#each songs as song (song.id)}
    <button class="song-row" value={song.id} aria-label={`${song.title} · ${song.artist}`} aria-pressed={song.id === selected.id} tabindex={song.id === tabId ? 0 : -1} onkeydown={navigate} onclick={() => onselect(song)}>
      <span class="row-text"><span class="row-title">{song.title}</span><span class="row-artist">{song.artist}</span></span>
      <svg class:chosen={song.id === selected.id} aria-hidden="true" viewBox="0 0 20 20"><path d="m4 10 4 4 8-9" /></svg>
    </button>
  {/each}
</div>

<style>
  .song-picker { height: min(320px, 35dvh); overflow-y: auto; border: 1px solid var(--divider); border-radius: 8px; padding: 4px; }
  .song-row { display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; padding: 10px; border: 0; border-radius: 6px; background: transparent; color: var(--on-surface); text-align: left; font: inherit; cursor: pointer; }
  .song-row:hover, .song-row[aria-pressed="true"] { background: color-mix(in srgb, var(--text-accent) 9%, transparent); }
  .song-row:focus-visible { outline: 2px solid var(--text-accent); outline-offset: -2px; }
  .song-row:disabled { opacity: .6; cursor: default; }
  .row-text { flex: 1; min-width: 0; }
  .row-title, .row-artist { display: block; overflow-wrap: anywhere; }
  .row-title { font-size: 15px; font-weight: 600; line-height: 1.4; }
  .row-artist { margin-top: 3px; font-size: 12px; color: var(--on-surface-muted); line-height: 1.4; }
  svg { flex: none; width: 20px; height: 20px; visibility: hidden; fill: none; stroke: var(--text-accent); stroke-width: 2; }
  svg.chosen { visibility: visible; }
</style>
