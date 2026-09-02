<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script module lang="ts">
  export type ExtraStudyKind = "new" | "forgotten" | "ahead";
  export type ExtraStudySelection = Readonly<Record<ExtraStudyKind, number>>;
</script>

<script lang="ts">
  import SettingsDialog from "./SettingsDialog.svelte";
  import type { ExtraStudyAvailability } from "../lib/study";

  let {
    deckLabel,
    availability,
    loading = false,
    onstart,
    oncancel,
  }: {
    deckLabel: string;
    availability: ExtraStudyAvailability;
    // Counting what is available scans the deck, so the dialog opens before
    // the numbers are known rather than making the tap feel unresponsive.
    loading?: boolean;
    onstart: (selection: ExtraStudySelection) => void;
    oncancel: () => void;
  } = $props();

  // Wording follows Anki's Custom Study dialog (ftl/core/custom-study.ftl).
  // Anki asks for a number of days for the two review sources and lets you
  // pick only one source at a time; here every source is a card count and they
  // combine, because this dialog exists to top up a session already running.
  const SECTIONS = {
    new: {
      title: "Increase today's new card limit",
      note: "Available new cards",
      tone: "new",
    },
    forgotten: {
      title: "Review forgotten cards",
      note: "Forgotten today",
      tone: "due",
    },
    ahead: {
      title: "Review ahead",
      note: "Due on a later day",
      tone: "due",
    },
  } as const;

  const KINDS = Object.keys(SECTIONS) as readonly ExtraStudyKind[];

  let selected = $state<Record<ExtraStudyKind, number>>({
    new: 0,
    forgotten: 0,
    ahead: 0,
  });

  const available = $derived<Record<ExtraStudyKind, number>>({
    new: availability.newRemaining,
    forgotten: availability.forgottenTodayKeys.length,
    ahead: availability.aheadKeys.length,
  });
  const total = $derived(KINDS.reduce((sum, kind) => sum + selected[kind], 0));

  function add(kind: ExtraStudyKind, amount: number): void {
    selected[kind] = Math.min(available[kind], selected[kind] + amount);
  }

  function start(): void {
    if (total === 0) return;
    onstart({ ...selected });
  }
</script>

<SettingsDialog
  title="Study more today"
  titleId="extra-study-title"
  applyLabel={total === 0 ? "ADD" : `ADD ${total}`}
  applyDisabled={total === 0}
  onapply={start}
  {oncancel}
>
  <p class="scope-name">{deckLabel}</p>

  {#each KINDS as kind (kind)}
    {@const section = SECTIONS[kind]}
    <section class="extra-section">
      <div class="extra-heading">
        <span>{section.title}</span>
        <span class="availability"
          >{section.note}: {loading ? "…" : available[kind]}</span
        >
      </div>
      <div class="quick-choices" aria-label={section.title}>
        {#each [5, 10, 20] as amount (amount)}
          <button
            class="choice {section.tone}"
            disabled={selected[kind] >= available[kind]}
            onclick={() => add(kind, amount)}>+{amount}</button
          >
        {/each}
        <button
          class="choice {section.tone}"
          disabled={selected[kind] >= available[kind]}
          onclick={() => (selected[kind] = available[kind])}>ALL</button
        >
      </div>
      <p class="selected">Selected: {selected[kind]}</p>
    </section>
  {/each}
</SettingsDialog>

<style>
  .scope-name {
    margin: 0;
    color: var(--on-surface-muted);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .extra-section {
    margin-top: 16px;
    padding: 16px;
    border: 1px solid var(--divider);
    border-radius: 8px;
  }

  .extra-heading {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 16px;
    color: var(--on-surface);
    font-weight: 500;
  }

  .availability,
  .selected {
    color: var(--on-surface-muted);
    font-size: 13px;
    font-weight: 400;
  }

  .quick-choices {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 16px;
  }

  .choice {
    min-height: 40px;
    border: 1px solid var(--divider);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
  }

  .choice.new {
    color: var(--count-new);
  }

  .choice.due {
    color: var(--count-due);
  }

  .choice:active:not(:disabled) {
    background: var(--bg);
  }

  .choice:disabled {
    cursor: default;
    opacity: 0.4;
  }

  .selected {
    margin: 12px 0 0;
    text-align: right;
  }
</style>
