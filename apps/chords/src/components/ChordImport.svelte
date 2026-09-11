<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { irealLabel } from "../lib/ireal-labels";
  import { parseChordImport, type ImportedSong } from "../lib/chord-import";
  let { onimport }: { onimport: (songs: ImportedSong[]) => Promise<void> } = $props();
  let text = $state("");
  let busy = $state(false);
  let message = $state("");
  let errors = $state<string[]>([]);
  let open = $state(false);

  async function importText(value: string) {
    busy = true;
    message = "Importing…";
    errors = [];
    try {
      const parsed = await parseChordImport(value);
      errors = parsed.errors;
      if (parsed.songs.length) await onimport(parsed.songs);
      message = parsed.songs.length
        ? `Imported ${parsed.songs.length} ${parsed.songs.length === 1 ? "song" : "songs"}.${parsed.errors.length ? ` ${parsed.errors.length} items could not be imported.` : ""}`
        : "Import failed.";
      if (parsed.songs.length) text = "";
      if (parsed.songs.length && !parsed.errors.length) open = false;
    } catch (error) {
      message = "Import failed.";
      errors = [irealLabel(error instanceof Error ? error.message : String(error))];
    } finally { busy = false; }
  }

  async function importFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...input.files ?? []];
    if (!files.length) return;
    try { await importText((await Promise.all(files.map(file => file.text()))).join("\n")); }
    catch (error) { message = "Could not read the file."; errors = [String(error)]; }
    input.value = "";
  }
</script>

<div class="import">
<details bind:open>
  <summary>Import iReal Pro charts</summary>
  <p>Import songs or playlists from iReal Pro. Charts are saved in this browser.</p>
  <p id="ireal-paste-help">Right-click an iReal link on a computer, or touch and hold it on a phone or tablet, and copy the link address. Paste it below, then choose Import.</p>
  <label>Shared link / HTML<textarea bind:value={text} rows="3" disabled={busy} aria-describedby="ireal-paste-help" autocapitalize="off" spellcheck={false} placeholder="irealb://… or irealbook://…"></textarea></label>
  <button disabled={busy || !text.trim()} onclick={() => importText(text)}>Import</button>
  <label>HTML file<input type="file" accept=".html,.htm,.txt,text/html,text/plain" multiple disabled={busy} onchange={importFiles} /></label>
  {#if errors.length}<details open><summary>Songs that could not be imported</summary><ul>{#each errors as error}<li>{error}</li>{/each}</ul></details>{/if}
</details>
<p role="status">{message}</p>
</div>

<style>
  .import { margin: 8px 16px; font-size: 14px; max-height: 45vh; overflow: auto; flex: none; }
  p:empty { display: none; }
  summary { cursor: pointer; color: var(--text-accent); padding: 8px 0; }
  p { color: var(--on-surface-muted); }
  label { display: block; margin: 12px 0; }
  input, textarea { display: block; width: 100%; margin-top: 6px; box-sizing: border-box; }
  textarea { color: inherit; background: var(--surface); padding: 8px; }
  ul { max-height: 180px; overflow: auto; overflow-wrap: anywhere; }
</style>
