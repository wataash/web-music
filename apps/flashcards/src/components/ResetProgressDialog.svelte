<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import SettingsDialog from "./SettingsDialog.svelte";
  import type { ResetPreview } from "../lib/study";

  let {
    deckName,
    preview,
    loading = false,
    onconfirm,
    oncancel,
  }: {
    deckName: string;
    preview: ResetPreview;
    loading?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  const nothingToReset = $derived(!loading && preview.studiedCount === 0);
</script>

<SettingsDialog
  title="Reset study progress"
  titleId="reset-progress-title"
  applyLabel={preview.studiedCount === 0
    ? "RESET"
    : `RESET ${preview.studiedCount} CARDS`}
  applyDisabled={loading || nothingToReset}
  applyTone="danger"
  onapply={onconfirm}
  {oncancel}
>
  <p class="scope-name">{deckName}</p>

  <dl class="counts">
    <div>
      <dt>Studied</dt>
      <dd>
        {loading ? "…" : `${preview.studiedCount} / ${preview.totalCount} cards`}
      </dd>
    </div>
    <div>
      <dt>Answers recorded</dt>
      <dd>{loading ? "…" : `${preview.reviewCount} reviews`}</dd>
    </div>
  </dl>

  {#if nothingToReset}
    <p class="note">Nothing has been studied in this deck yet.</p>
  {:else}
    <p class="warning">
      Every card in this deck{preview.subdeckCount > 0
        ? " and its subdecks"
        : ""}
      becomes new again, in its original order. This cannot be undone.
    </p>
  {/if}
</SettingsDialog>

<style>
  .scope-name {
    margin: 0;
    color: var(--on-surface-muted);
    text-align: center;
    overflow-wrap: anywhere;
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

  .warning,
  .note {
    margin: 16px 0 0;
    font-size: 13px;
  }

  .warning {
    color: var(--ease-again);
  }

  .note {
    color: var(--on-surface-muted);
  }
</style>
