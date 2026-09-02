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
    untrack(() => [...hiddenDeckNames]),
  );
  const hidden = $derived(new Set(draft));
  const defaults = $derived(effectiveHiddenDeckNames(null, decks));
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

  <div class="reset">
    <button disabled={isDefault} onclick={() => (draft = defaults)}>
      RESET TO DEFAULT
    </button>
  </div>

  <ul class="decks">
    {#each decks as deck (deck.name)}
      <li style:padding-inline-start={`${deck.depth * 20}px`}>
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
    A deck turned off leaves the list, taking anything under it with it;
    turning one of those back on brings the decks over it with it, but not its
    siblings. Nothing is deleted, and what a deck asks when it is studied is
    its own settings' business.
  </p>
</SettingsDialog>

<style>
  .table-summary {
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
    font-size: 13px;
    font-weight: 400;
  }

  .decks {
    margin: 0;
    padding: 4px 0 0;
    list-style: none;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    cursor: pointer;
    font-size: 14px;
  }

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--count-new);
  }

  /* Above the list rather than below it: the list is as long as the decks
     are, and a button under it is off the screen just when it is wanted. */
  .reset {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .reset button {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 4px;
    color: var(--count-new);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  .reset button:disabled {
    cursor: default;
    color: var(--on-surface-muted);
    opacity: 0.5;
  }

  .hint {
    margin: 16px 0 0;
    font-size: 13px;
  }
</style>
