<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { ImportedSong } from '../lib/chord-import';
  import { exportIrealHtml, exportIrealLink } from '../lib/chord-export';
  let { song, songs }: { song?: ImportedSong; songs: ImportedSong[] } = $props();
  let dialog: HTMLDialogElement;
  let error = $state('');
  let copied = $state(false);
  async function copyLink() {
    if (!song) return;
    error = ''; copied = false;
    try { await navigator.clipboard.writeText(exportIrealLink([song], song.playlist)); copied = true; }
    catch { error = 'Could not copy the link. Export an HTML file instead.'; }
  }
  const playlistSongs = $derived(song ? songs.filter(candidate => candidate.playlist === song.playlist) : []);
  function download(playlist: boolean) {
    if (!song) return;
    try {
      const title = playlist ? song.playlist || 'Unlisted imports' : song.title;
      const html = exportIrealHtml(playlist ? playlistSongs : [song], song.playlist);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = (title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 120) || 'chords') + '.html';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      dialog.close();
    } catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  }
</script>

<button disabled={!song} onclick={() => { error = ''; copied = false; dialog.showModal(); }}>Export</button>
<dialog bind:this={dialog} aria-labelledby="export-title">
  <h2 id="export-title">Export iReal charts</h2>
  <p>Save an HTML file to import on another device. Original keys and notation are preserved.</p>
  {#if song}
    <button onclick={copyLink}>Copy song link</button>
    {#if copied}<p role="status">Song link copied.</p>{/if}
    <button onclick={() => download(false)}>Export song: {song.title}</button>
    <button onclick={() => download(true)}>Export playlist: {song.playlist || 'Unlisted imports'} ({playlistSongs.length})</button>
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
