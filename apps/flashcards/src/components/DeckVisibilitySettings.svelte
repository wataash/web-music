<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { untrack } from "svelte";

  import SettingsDialog from "./SettingsDialog.svelte";
  import {
    effectiveHiddenDeckNames,
    hideDeck,
    showDeck,
  } from "../lib/deck-hiding";
  import type { DeckInfo } from "../lib/study";

  let {
    decks,
    hiddenDeckNames,
    onapply,
    oncancel,
  }: {
    // Every deck the app holds, at every depth, whether or not it is on: this
    // is where one that has been turned off is found again.
    decks: readonly DeckInfo[];
    hiddenDeckNames: readonly string[];
    // null when the reader has gone back to the decks the packages ship on,
    // so a deck that ships off later still starts off.
    onapply: (hiddenDeckNames: readonly string[] | null) => void;
    oncancel: () => void;
  } = $props();

  let draft = $state<readonly string[]>(
    untrack(() => hiddenDeckNames.filter(name => decks.some(deck => deck.name === name))),
  );
  const hidden = $derived(new Set(draft));
  const defaults = $derived(effectiveHiddenDeckNames(null, decks));
  const defaultHidden = $derived(new Set(defaults));
  const isDefault = $derived(
    defaults.length === draft.length &&
      defaults.every((name) => hidden.has(name)),
  );

  function toggle(name: string, on: boolean): void {
    draft = on ? showDeck(name, draft, decks) : hideDeck(name, draft, decks);
  }

  const shownCount = $derived(decks.length - draft.length);
</script>

<SettingsDialog
  title="Decks"
  titleId="deck-visibility-settings-title"
  onapply={() => onapply(isDefault ? null : draft)}
  {oncancel}
>
  <div class="table-summary">
    <span>Decks shown</span>
    <span>{shownCount} / {decks.length}</span>
  </div>

  <ul class="decks">
    {#each decks as deck (deck.name)}
      <li class:modified={hidden.has(deck.name) !== defaultHidden.has(deck.name)} style:margin-inline-start={`${deck.depth * 20}px`}>
        <label>
          <input
            type="checkbox"
            checked={!hidden.has(deck.name)}
            onchange={(event) => toggle(deck.name, event.currentTarget.checked)}
          />
          <span>{deck.baseName}</span>
        </label>
      </li>
    {/each}
  </ul>

  <p class="hint">
    Hidden decks keep their progress.
  </p>
</SettingsDialog>

<style>
  .table-summary {
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 0 14px;
    border-bottom: 1px solid var(--divider);
    font-weight: 500;
  }

  .table-summary span:last-child,
  .hint {
    color: var(--on-surface-muted);
  }

  .table-summary span:last-child {
    font-size: var(--ui-font-size-secondary);
    font-weight: 400;
  }

  .decks {
    margin: 0;
    padding: 4px 0 0;
    list-style: none;
  }

  li { position: relative; padding-inline-start: 12px; }
  li.modified::before { content: ""; position: absolute; inset-inline-start: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: var(--count-new); }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    cursor: pointer;
    font-size: var(--ui-font-size-label);
  }

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--count-new);
  }


  .hint {
    margin: 16px 0 0;
    font-size: var(--ui-font-size-secondary);
  }
</style>
