<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  // One dialog for every chart that comes in as text: an iReal Pro link or
  // playlist, a ChordWiki chart, or a chord list typed here. The notation is
  // the reader's choice, each with its own help, and whatever is typed is
  // drawn beneath it before it is added. A chart that came in as text can be
  // opened here again to edit it, keeping its id and so its favorite and its
  // place.
  import { irealLabel } from "../lib/ireal-labels";
  import { parseChordImport, type ChordImportFormat, type ImportedSong } from "../lib/chord-import";
  import { chordWikiText } from "../lib/chordwiki-import";
  import { PRACTICE_KEYS } from "../lib/chords";
  import ChordNotationHelp from "./ChordNotationHelp.svelte";
  import SourceScore from "./SourceScore.svelte";

  let { open = $bindable(false), song, onadd }: {
    open?: boolean;
    // The chart on screen, offered for editing when it came in as text.
    song?: ImportedSong;
    onadd: (songs: ImportedSong[], format: ChordImportFormat, edited: boolean) => Promise<void>;
  } = $props();

  const FORMAT_KEY = "chord-import-format";
  const FORMATS: readonly { id: ChordImportFormat; label: string }[] = [
    { id: "ireal", label: "iReal Pro" }, { id: "chordwiki", label: "ChordWiki" }, { id: "list", label: "Custom chart" },
  ];
  function savedFormat(): ChordImportFormat {
    const saved = localStorage.getItem(FORMAT_KEY);
    return FORMATS.some(({ id }) => id === saved) ? saved as ChordImportFormat : "ireal";
  }
  // The last notation chosen is offered first, since a reader tends to add
  // from one source.
  let format = $state<ChordImportFormat>(savedFormat());
  function chooseFormat(value: ChordImportFormat) {
    format = value; message = ""; errors = [];
    try { localStorage.setItem(FORMAT_KEY, value); } catch { /* The choice is optional. */ }
  }
  const CHORDWIKI_PLACEHOLDER = `{title:Song title}
{subtitle:歌：Artist　作詞・作曲：Writer}
{key:C}
[C]Lyrics [G]lyrics [Am]lyrics [F]lyrics
[C]Lyrics [G]lyrics [C]lyrics`;
  const LIST_PLACEHOLDER = `title: Example Blues
key: C

[A] 4/4
|: C7 | F7 | C7 % | C7 |
| F7 | F7 | C7 | C7 |
| G7 | F7 | 1. C7 | G7 :|
| 2. C7 <Fine> | G7 |]`;

  let text = $state("");
  let title = $state("");
  let key = $state("C");
  let editingId = $state<string>();
  let busy = $state(false);
  let message = $state("");
  let errors = $state<string[]>([]);
  let notationHelp = $state<{ show: () => void }>();
  let dialog: HTMLDialogElement;
  $effect(() => { if (open) dialog?.showModal(); else dialog?.close(); });

  // What the chart on screen can be reopened as: its own text, in its notation.
  const editable = $derived.by((): { format: ChordImportFormat; text: string } | null => {
    if (!song) return null;
    if (song.customText !== undefined) return { format: "list", text: song.customText };
    const wiki = chordWikiText(song);
    return wiki === undefined ? null : { format: "chordwiki", text: wiki };
  });

  // Opened from outside: the library adds, the settings sheet edits or
  // copies. Editing keeps the song's id; a copy starts a new chart from the
  // same text, to be added beside the original rather than written over it.
  function start(fields: { id?: string; text?: string; title?: string; key?: string; format?: ChordImportFormat }) {
    editingId = fields.id; text = fields.text ?? ""; title = fields.title ?? ""; key = fields.key ?? "C"; message = ""; errors = [];
    if (fields.format) chooseFormat(fields.format);
    open = true;
  }
  export function startNew() { start({}); }
  export function canEdit(): boolean { return editable !== null; }
  export function startEdit() {
    if (song && editable) start({ ...editable, id: song.id, title: song.title, key: song.originalKey });
  }
  export function startCopy() {
    if (!song || !editable) return;
    if (editable.format === "list") start({ ...editable, title: `${song.title} (copy)`, key: song.originalKey });
    else start({ ...editable, text: editable.text.replace(/^(\{title:[^}]*)(\})/m, "$1 (copy)$2"), key: song.originalKey });
  }

  // What the text would add, drawn as it is typed: the first song's chart
  // and, for a playlist, how many songs come with it. Parsed a moment after
  // the last keystroke rather than on each one, and the last drawing stays up
  // until the new one is ready, so an edit does not blank the chart. Only the
  // latest text is shown, since a parse can finish after a newer one began.
  let preview = $state<{ songs: ImportedSong[]; errors: string[] } | null>(null);
  let previewStale = $state(false);
  $effect(() => {
    const value = text; const notation = format; const options = { title, key, id: editingId };
    if (!value.trim()) { preview = null; previewStale = false; return; }
    previewStale = true;
    let current = true;
    const timer = setTimeout(async () => {
      const parsed = await parseChordImport(value, notation, options).catch(error => ({ songs: [], errors: [irealLabel(error instanceof Error ? error.message : String(error))] }));
      if (current) { preview = parsed; previewStale = false; }
    }, 300);
    return () => { current = false; clearTimeout(timer); };
  });

  async function add(value: string) {
    busy = true;
    message = editingId ? "Saving…" : "Adding…";
    errors = [];
    try {
      const parsed = await parseChordImport(value, format, { title, key, id: editingId });
      errors = parsed.errors;
      if (parsed.songs.length) await onadd(parsed.songs, format, editingId !== undefined);
      message = parsed.songs.length
        ? editingId ? "Saved." : `Added ${parsed.songs.length} ${parsed.songs.length === 1 ? "song" : "songs"}.${parsed.errors.length ? ` ${parsed.errors.length} items could not be added.` : ""}`
        : editingId ? "Could not save the chart." : "Nothing was added.";
      if (parsed.songs.length) { text = ""; editingId = undefined; }
      if (parsed.songs.length && !parsed.errors.length) open = false;
    } catch (error) {
      message = editingId ? "Could not save the chart." : "Nothing was added.";
      errors = [irealLabel(error instanceof Error ? error.message : String(error))];
    } finally { busy = false; }
  }

  async function addFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...input.files ?? []];
    if (!files.length) return;
    try { await add((await Promise.all(files.map(file => file.text()))).join("\n")); }
    catch (error) { message = "Could not read the file."; errors = [String(error)]; }
    input.value = "";
  }
</script>

<div class="chart-editor">
<dialog bind:this={dialog} onclose={() => open = false} aria-labelledby="chart-editor-title">
  <div class="dialog-heading"><h2 id="chart-editor-title">{editingId ? "Edit chart" : "Add chart"}</h2><button aria-label="Close chart editor" onclick={() => open = false}>×</button></div>
  <p>Charts are saved in this browser.</p>
  <fieldset class="format" disabled={busy || editingId !== undefined}><legend>Notation</legend>
    {#each FORMATS as candidate}<label><input type="radio" name="chord-import-format" value={candidate.id} checked={format === candidate.id} onchange={() => chooseFormat(candidate.id)} />{candidate.label}</label>{/each}
  </fieldset>
  {#if format === "ireal"}
    <p id="ireal-paste-help">Songs or playlists from iReal Pro. Right-click an iReal link on a computer, or touch and hold it on a phone or tablet, and copy the link address. Paste it below, then choose Add.</p>
    <label>Shared link / HTML<textarea bind:value={text} rows="3" disabled={busy} aria-describedby="ireal-paste-help" autocapitalize="off" spellcheck={false} placeholder="irealb://… or irealbook://…"></textarea></label>
  {:else if format === "chordwiki"}
    <p id="chordwiki-paste-help">One chart in ChordWiki notation: its {"{title:…}"} and {"{key:…}"} lines, then the lyrics with each chord in brackets before the syllable it falls on. Paste the whole chart below, then choose Add.</p>
    <label>ChordWiki text<textarea bind:value={text} rows="7" disabled={busy} aria-describedby="chordwiki-paste-help" autocapitalize="off" spellcheck={false} placeholder={CHORDWIKI_PLACEHOLDER}></textarea></label>
  {:else}
    <div class="fields"><label>Title (optional)<input bind:value={title} disabled={busy} /></label><label>Original key<select aria-label="Original key" bind:value={key} disabled={busy}>{#each PRACTICE_KEYS as note}<option>{note}</option>{/each}</select></label></div>
    <label>Chord progression<textarea bind:value={text} rows="7" disabled={busy} spellcheck={false} autocapitalize="off" aria-describedby="chord-list-help" placeholder={LIST_PLACEHOLDER}></textarea></label>
    <p id="chord-list-help">A chart the way a lead sheet writes it: | between bars, |: and :| for repeats, 1. and 2. for endings, [A] for a section, % for the previous bar, &lt;text&gt; for a note. A line without | puts each chord in its own bar; each line is one row. Title and key can also be written as title: and key: lines.</p>
    <ChordNotationHelp bind:this={notationHelp} />
  {/if}
  {#if preview}
    <div class="preview" class:stale={previewStale} aria-label="Chart preview" aria-busy={previewStale}>
      {#if preview.songs.length}
        {@const first = preview.songs[0]}
        <p class="preview-heading"><strong>{first.title}</strong>{#if first.artist}{" · "}{first.artist}{/if} · Key {first.originalKey} · {first.chords.length} chords{#if preview.songs.length > 1} · {preview.songs.length} songs in the playlist; the first is shown{/if}</p>
        <SourceScore format={first.metadata.score.format} blocks={first.metadata.score.blocks} symbols={[...first.chords]} storageId="chart-preview" />
      {/if}
      {#each preview.errors as error}<p class="preview-error" role="alert">{error}</p>{/each}
      {#if preview.errors.length && format === "list"}<button type="button" onclick={() => notationHelp?.show()}>Check chord notation</button>{/if}
    </div>
  {/if}
  <button class="primary" disabled={busy || !text.trim()} onclick={() => add(text)}>{editingId ? "Save" : "Add"}</button>
  {#if format === "ireal"}
    <label>HTML file<input type="file" accept=".html,.htm,.txt,text/html,text/plain" multiple disabled={busy} onchange={addFiles} /></label>
  {:else if format === "chordwiki"}
    <label>ChordWiki text file<input type="file" accept=".wiki,.txt,.md,.cho,text/plain" multiple disabled={busy} onchange={addFiles} /></label>
  {/if}
  {#if errors.length}<details open><summary>Songs that could not be added</summary><ul>{#each errors as error}<li>{error}</li>{/each}</ul></details>{/if}
</dialog>
<p role="status">{message}</p>
</div>

<style>
  .chart-editor { display: contents; font-size: 14px; }
  dialog { width: min(680px, calc(100vw - 24px)); max-height: 85dvh; box-sizing: border-box; overflow: auto; padding: 24px; border: 1px solid var(--divider); border-radius: 12px; color: var(--on-surface); background: var(--surface); box-shadow: 0 16px 64px #0005; }
  dialog::backdrop { background: #0008; }
  .dialog-heading { display: flex; align-items: center; gap: 16px; }
  h2 { font-size: 20px; margin: 0; flex: 1; }
  dialog button { color: var(--on-surface); background: var(--surface); border: 1px solid var(--divider); border-radius: 6px; padding: 8px 14px; cursor: pointer; }
  dialog button.primary { color: var(--text-accent); font-weight: 600; }
  .dialog-heading button { border: 0; font-size: 24px; }
  .chart-editor > p { margin: 0; font-size: 12px; }
  p:empty { display: none; }
  summary { cursor: pointer; color: var(--text-accent); padding: 8px 0; }
  p { color: var(--on-surface-muted); }
  label { display: block; margin: 12px 0; }
  .fields { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; }
  .fields label { flex: 1; min-width: 140px; }
  .fields label:last-child { flex: 0 0 auto; min-width: 0; }
  .format { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0; padding: 0; border: 0; }
  .format legend { padding: 0; margin-bottom: 6px; }
  .format label { display: inline-flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; white-space: nowrap; }
  input, select, textarea { display: block; width: 100%; margin-top: 6px; box-sizing: border-box; }
  input:not([type]), select, textarea { color: inherit; background: var(--surface); padding: 8px; border: 1px solid var(--divider); border-radius: 6px; font: inherit; }
  textarea { font-family: ui-monospace, monospace; resize: vertical; }
  ul { max-height: 180px; overflow: auto; overflow-wrap: anywhere; }
  .preview { margin: 12px 0; padding: 8px 12px; border: 1px solid var(--divider); border-radius: 8px; max-height: 40dvh; overflow: auto; }
  .preview.stale { opacity: 0.6; transition: opacity 0.2s 0.3s; }
  .preview-heading { margin: 0 0 6px; font-size: 13px; }
  .preview-error { margin: 4px 0; color: var(--on-surface); font-weight: bold; }
</style>
