<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { ChordSong } from '../lib/chord-songs';
  let { songs, favoriteIds, selected, onselect }: { songs: readonly ChordSong[]; favoriteIds: readonly string[]; selected: ChordSong; onselect: (song: ChordSong) => void } = $props();
  // Favorites are listed first for quick reach and again in their place
  // among every song, so the full list keeps its order. Each group has its
  // own count; the favorites group is left out while there are none.
  const favorites = $derived(songs.filter(song => favoriteIds.includes(song.id)));
  const groups = $derived([
    ...favorites.length ? [{ id: 'favorites', label: '★ Favorites', songs: favorites }] : [],
    { id: 'all', label: 'All songs', songs },
  ]);
  const listed = $derived(songs.some(song => song.id === selected.id));
  // One Tab stop: the first row of the current song, or else the first row.
  const tabKey = $derived.by(() => {
    for (const group of groups) for (const song of group.songs) if (!listed || song.id === selected.id) return `${group.id}:${song.id}`;
  });
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
  {#if !listed}
    <button class="song-row" value={selected.id} disabled aria-pressed="true"><span class="row-text"><span class="row-title">{selected.title}</span><span class="row-artist">Current song · outside filters</span></span></button>
  {/if}
  {#each groups as group (group.id)}
    <h3 class="group-heading">{group.label} ({group.songs.length})</h3>
    {#each group.songs as song (song.id)}
      <button class="song-row" value={song.id} aria-label={`${song.title} · ${song.artist}`} aria-pressed={song.id === selected.id} tabindex={`${group.id}:${song.id}` === tabKey ? 0 : -1} onkeydown={navigate} onclick={() => onselect(song)}>
        <span class="row-text"><span class="row-title">{song.title}</span><span class="row-artist">{song.artist}</span></span>
        {#if favoriteIds.includes(song.id)}<span class="row-star" aria-hidden="true">★</span>{/if}
        <svg class:chosen={song.id === selected.id} aria-hidden="true" viewBox="0 0 20 20"><path d="m4 10 4 4 8-9" /></svg>
      </button>
    {/each}
  {/each}
</div>

<style>
  .song-picker { height: min(320px, 35dvh); overflow-y: auto; border: 1px solid var(--divider); border-radius: 8px; padding: 4px; }
  .group-heading { position: sticky; top: -4px; z-index: 1; margin: 0; padding: 8px 10px 4px; font-size: 12px; font-weight: 600; color: var(--on-surface-muted); background: var(--surface); }
  .row-star { flex: none; font-size: 16px; color: #d79513; }
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
