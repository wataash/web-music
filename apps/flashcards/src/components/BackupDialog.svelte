<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount } from "svelte";

  import SettingsDialog from "./SettingsDialog.svelte";
  import {
    backupFilename,
    createBackup,
    parseBackupDocument,
    restoreBackup,
    type BackupDocument,
    type RestoreSummary,
  } from "../lib/backup";
  import { db } from "../lib/db";
  import { counted } from "../lib/format";

  let { onclose }: { onclose: () => void } = $props();

  let studied = $state<number | null>(null);
  let reviews = $state<number | null>(null);
  // Raw: a deep reactive proxy of the parsed file cannot be structured-cloned,
  // and IndexedDB clones everything it is given.
  let chosen = $state.raw<{ name: string; backup: BackupDocument } | null>(
    null,
  );
  let restored = $state<RestoreSummary | null>(null);
  let busy = $state(false);
  let error = $state<string | null>(null);

  async function countWhatIsHere(): Promise<void> {
    try {
      studied = await db.states.count();
      reviews = await db.revlog.count();
    } catch (e) {
      error = message(e);
    }
  }

  onMount(() => {
    void countWhatIsHere();
  });

  function message(reason: unknown): string {
    return reason instanceof Error ? reason.message : String(reason);
  }

  async function exportBackup(): Promise<void> {
    busy = true;
    error = null;
    try {
      const backup = await createBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = backupFilename(backup.exportedAt);
      link.click();
      // The click starts the download asynchronously, so the URL has to
      // outlive this turn of the event loop.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      error = message(e);
    } finally {
      busy = false;
    }
  }

  async function chooseFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared so that picking the same file again is still a change event.
    input.value = "";
    if (file === undefined) return;
    busy = true;
    error = null;
    chosen = null;
    try {
      const backup = parseBackupDocument(JSON.parse(await file.text()));
      chosen = { name: file.name, backup };
    } catch (e) {
      error = message(e);
    } finally {
      busy = false;
    }
  }

  async function applyRestore(): Promise<void> {
    if (chosen === null) return;
    busy = true;
    error = null;
    try {
      restored = await restoreBackup(chosen.backup);
      chosen = null;
      await countWhatIsHere();
    } catch (e) {
      error = message(e);
    } finally {
      busy = false;
    }
  }

  // The deck list and its settings were read out of storage when the app
  // started, so what is on screen is the state from before the restore.
  function reload(): void {
    location.reload();
  }

  function apply(): void {
    if (restored !== null) reload();
    else if (chosen !== null) void applyRestore();
    else void exportBackup();
  }

  const applyLabel = $derived(
    restored !== null ? "RELOAD" : chosen !== null ? "RESTORE" : "EXPORT",
  );
</script>

<SettingsDialog
  title="Backup"
  titleId="backup-title"
  {applyLabel}
  applyDisabled={busy}
  onapply={apply}
  oncancel={restored === null ? onclose : reload}
>
  <p class="lead">
    A backup holds the study schedule, the answers behind it, and the deck
    settings — everything that would otherwise stay in this browser. The decks
    themselves are downloaded again, so they are left out.
  </p>

  <dl class="counts">
    <div>
      <dt>Cards studied</dt>
      <dd>{studied === null ? "…" : studied}</dd>
    </div>
    <div>
      <dt>Answers recorded</dt>
      <dd>{reviews === null ? "…" : reviews}</dd>
    </div>
  </dl>

  {#if restored !== null}
    <p class="note">
      Restored {counted(restored.statesWritten, "card")}, {counted(
        restored.reviewsAdded,
        "answer",
      )}, and {counted(restored.settingsWritten, "setting")}.
      {#if restored.statesKept > 0}
        {counted(restored.statesKept, "card")} in the file were older than what
        is here and were left alone.
      {/if}
    </p>
  {:else}
    <div class="restore">
      <label class="file">
        <input
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onchange={(event) => void chooseFile(event)}
        />
        <span>CHOOSE BACKUP FILE…</span>
      </label>
      {#if chosen !== null}
        <p class="chosen">
          {chosen.name} — {counted(chosen.backup.states.length, "card")}, {counted(
            chosen.backup.revlog.length,
            "answer",
          )}{chosen.backup.exportedAt === ""
            ? ""
            : `, from ${chosen.backup.exportedAt.slice(0, 10)}`}
        </p>
        <p class="note">
          A card is restored only where the file is the newer of the two, so
          studying done here since the backup is kept. Deck settings are taken
          from the file.
        </p>
      {/if}
    </div>
  {/if}

  {#if error !== null}
    <p class="error" role="alert">{error}</p>
  {/if}
</SettingsDialog>

<style>
  .lead,
  .note,
  .chosen,
  .error {
    margin: 0;
    font-size: 13px;
  }

  .lead,
  .note {
    color: var(--on-surface-muted);
  }

  .counts {
    margin: 16px 0 0;
    padding: 16px;
    border: 1px solid var(--divider);
    border-radius: 8px;
  }

  .counts div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }

  .counts div + div {
    margin-top: 8px;
  }

  dt {
    color: var(--on-surface);
  }

  dd {
    margin: 0;
    color: var(--on-surface-muted);
    font-variant-numeric: tabular-nums;
  }

  .restore {
    margin-top: 16px;
    display: grid;
    gap: 8px;
    justify-items: start;
  }

  .file input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .file span {
    display: inline-block;
    min-height: 42px;
    padding: 12px 18px;
    border: 1px solid var(--divider);
    border-radius: 4px;
    color: var(--on-surface);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
    cursor: pointer;
  }

  .file input:focus-visible + span {
    outline: 2px solid var(--count-new);
  }

  .chosen {
    overflow-wrap: anywhere;
  }

  .error {
    margin-top: 16px;
    color: var(--ease-again);
  }
</style>
