<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { ImportedSong } from '../lib/chord-import';
  import { createCustomChart } from '../lib/custom-chart';
  import { PRACTICE_KEYS } from '../lib/chords';
  import SourceScore from './SourceScore.svelte';
  import ChordNotationHelp from './ChordNotationHelp.svelte';
  let { song, onsave }: { song?: ImportedSong; onsave: (song: ImportedSong) => Promise<void> } = $props();
  let dialog: HTMLDialogElement;
  let title = $state('');
  let key = $state('C');
  let text = $state('');
  let editingId = $state<string>();
  let error = $state('');
  let inputError = $state(false);
  let notationHelp: { show: () => void };
  let busy = $state(false);
  let preview = $state<ImportedSong>();
  function open(edit = false) {
    const source = edit ? song : undefined;
    title = source?.title ?? ''; key = source?.originalKey ?? 'C'; text = source?.customText ?? '';
    editingId = source?.id; error = ''; inputError = false; preview = undefined; dialog.showModal();
  }
  function parse() {
    error = ''; inputError = false; preview = undefined;
    try { return createCustomChart(text, title, key, editingId); }
    catch (cause) { error = cause instanceof Error ? cause.message : String(cause); inputError = true; }
  }
  async function save() {
    const chart = parse();
    if (!chart) return;
    busy = true;
    try { await onsave(chart); dialog.close(); }
    catch { error = 'Could not save the chart. Check your browser storage settings.'; }
    finally { busy = false; }
  }
</script>

<button onclick={() => open()}>New chart</button>
{#if song?.customText !== undefined}<button onclick={() => open(true)}>Edit chart</button>{/if}
<dialog bind:this={dialog} aria-labelledby="custom-chart-title" oncancel={event => { if (busy) event.preventDefault(); }}>
  <div class="heading"><h2 id="custom-chart-title">{editingId ? 'Edit chart' : 'New chart'}</h2><button aria-label="Close chart editor" disabled={busy} onclick={() => dialog.close()}>×</button></div>
  <form onsubmit={event => { event.preventDefault(); void save(); }} oninput={() => { preview = undefined; error = ''; }}>
    <fieldset disabled={busy}>
      <div class="fields"><label>Title (optional)<input bind:value={title} /></label><label>Original key<select aria-label="Original key" bind:value={key}>{#each PRACTICE_KEYS as note}<option>{note}</option>{/each}</select></label></div>
      <label>Chord progression<textarea bind:value={text} rows="7" spellcheck={false} autocapitalize="off" aria-describedby="custom-chart-help" aria-invalid={!!error} placeholder={'A7 D7 A7 A7\nD7 D7 A7 A7\nE7 D7 A7 A7'}></textarea></label>
      <p id="custom-chart-help">Spaces separate bars; line breaks start chart rows. With | in a line, spaces put chords inside the same bar: Dm7 G7 | Cmaj7. Up to 16 chords per line. Blank lines are ignored.</p>
      <ChordNotationHelp bind:this={notationHelp} />
      <p>Saved in this browser. You can edit the text again later.</p>
      {#if error}<p role="alert">{error}</p>{/if}
      {#if error && inputError}<button type="button" onclick={() => notationHelp.show()}>Check chord notation</button>{/if}
      <div class="actions"><button type="button" onclick={() => preview = parse()}>Preview</button><button type="submit">{busy ? 'Saving…' : 'Save and display'}</button></div>
    </fieldset>
  </form>
  {#if preview}<div class="preview" aria-label="Chart preview"><SourceScore blocks={preview.metadata.score.blocks} symbols={[...preview.chords]} storageId="custom-preview" /></div>{/if}
</dialog>

<style>
  dialog { width: min(680px, calc(100vw - 24px)); max-height: 85dvh; box-sizing: border-box; overflow: auto; border: 1px solid var(--divider); border-radius: 12px; padding: 20px; background: var(--surface); color: var(--on-surface); }
  dialog::backdrop { background: #0008; }
  .heading, .fields, .actions { display: flex; align-items: center; gap: 12px; }
  .fields { flex-wrap: wrap; align-items: end; }
  .fields label:first-child { flex: 1; min-width: 140px; }
  h2 { flex: 1; margin: 0; font-size: 20px; }
  fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
  label { display: block; margin-top: 14px; }
  input, select, textarea { display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 8px; background: var(--surface); color: inherit; border: 1px solid var(--divider); border-radius: 6px; font: inherit; }
  textarea { font-family: ui-monospace, monospace; resize: vertical; }
  p { font-size: 13px; color: var(--on-surface-muted); }
  [role="alert"] { color: var(--on-surface); font-weight: bold; }
  button { font: inherit; color: var(--text-accent); background: transparent; border: 1px solid var(--divider); border-radius: 6px; padding: 8px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  .preview { margin-top: 20px; }
</style>
