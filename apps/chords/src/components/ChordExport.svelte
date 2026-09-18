<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { ImportedSong } from '../lib/chord-import';
  import { exportIrealHtml, exportIrealLink } from '../lib/chord-export';
  import { chordWikiText } from '../lib/chordwiki-import';
  let { song, songs }: { song?: ImportedSong; songs: ImportedSong[] } = $props();
  let dialog: HTMLDialogElement;
  let error = $state('');
  let copied = $state(false);
  // Opened from the settings sheet, which names the current song.
  export function show() { error = ''; copied = false; dialog.showModal(); }
  async function copyLink() {
    if (!song) return;
    error = ''; copied = false;
    try { await navigator.clipboard.writeText(exportIrealLink([song], song.playlist)); copied = true; }
    catch { error = 'Could not copy the link. Export an HTML file instead.'; }
  }
  // A chart that came in as text goes out as text: the editor's own, or the
  // ChordWiki source the score preserved.
  const textOf = (song: ImportedSong) => song.customText ?? chordWikiText(song);
  const text = $derived(song && textOf(song));
  const playlistSongs = $derived(song ? songs.filter(candidate => candidate.playlist === song.playlist && chordWikiText(candidate) === undefined) : []);
  // The text a chart came in as, or iReal's HTML of the song or its playlist.
  function download(kind: 'text' | 'song' | 'playlist') {
    if (!song) return;
    try {
      const custom = kind === 'text';
      const title = kind === 'playlist' ? song.playlist || 'Unlisted imports' : song.title;
      const content = custom ? text! : exportIrealHtml(kind === 'playlist' ? playlistSongs : [song], song.playlist);
      const url = URL.createObjectURL(new Blob([content], { type: custom ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = (title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 120) || 'chords') + (custom ? '.txt' : '.html');
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      dialog.close();
    } catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  }
</script>

<dialog bind:this={dialog} aria-labelledby="export-title">
  <h2 id="export-title">{text !== undefined ? 'Export chart text' : 'Export iReal charts'}</h2>
  {#if song && song.customText !== undefined}
    <p>Save your chart text. Paste it under Custom chart in Add chart to recreate it. Set the original key to {song.originalKey}. The chart can also go to iReal Pro as a link or an HTML file.</p>
    <button onclick={() => download('text')}>Download chord text</button>
    <button onclick={copyLink}>Copy song link</button>
    {#if copied}<p role="status">Song link copied.</p>{/if}
    <button onclick={() => download('song')}>Export song for iReal Pro: {song.title}</button>
  {:else if song && text !== undefined}
    <p>Save the ChordWiki text as it was added. Paste it under ChordWiki in Add chart to recreate the chart.</p>
    <button onclick={() => download('text')}>Download ChordWiki text</button>
  {:else if song}
    <p>Save an HTML file to import on another device. Original keys and notation are preserved.</p>
    <button onclick={copyLink}>Copy song link</button>
    {#if copied}<p role="status">Song link copied.</p>{/if}
    <button onclick={() => download('song')}>Export song: {song.title}</button>
    <button onclick={() => download('playlist')}>Export playlist: {song.playlist || 'Unlisted imports'} ({playlistSongs.length})</button>
  {/if}
  {#if error}<p role="alert">{error}</p>{/if}
  <button onclick={() => dialog.close()}>Cancel</button>
</dialog>
<style>
  dialog { max-width: min(440px, calc(100vw - 48px)); border: 1px solid var(--divider); border-radius: 12px; padding: 20px; background: var(--surface); color: var(--on-surface); }
  dialog::backdrop { background: #0008; }
  h2 { margin: 0 0 12px; font-size: 20px; }
  p { font-size: 14px; }
  button { color: var(--text-accent); background: transparent; border: 0; cursor: pointer; padding: 8px; }
  button:disabled { opacity: .5; cursor: default; }
  dialog button { display: block; text-align: left; overflow-wrap: anywhere; max-width: 100%; margin-top: 8px; }
</style>
