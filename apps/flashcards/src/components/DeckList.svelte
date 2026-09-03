<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onDestroy, tick } from "svelte";

  import BackupDialog from "./BackupDialog.svelte";
  import DeckActionsSheet from "./DeckActionsSheet.svelte";
  import DeckVisibilitySettings from "./DeckVisibilitySettings.svelte";
  import type { FretWindow } from "../lib/guitar-interval-selection";
  import NoteSettingsDialog from "./NoteSettingsDialog.svelte";
  import type {
    CircleNoteSelection,
    CircleNoteSettingsScope,
  } from "../lib/circle-note-selection";
  import {
    deckNamesWithChildren,
    filterCollapsedDecks,
  } from "../lib/deck-collapse";
  import {
    historyStateForBackup,
    historyStateForDeckActions,
    historyStateForDeckChooser,
    historyStateForSettingsDeck,
    backupFromHistoryState,
    deckActionsFromHistoryState,
    deckChooserFromHistoryState,
    settingsDeckFromHistoryState,
  } from "../lib/navigation";
  import {
    deckSettingsTarget,
    type DeckSettingsTarget,
    type NoteSelections,
  } from "../lib/note-selection";
  import type { StaffNoteSelection } from "../lib/staff-note-selection";
  import {
    effectiveHiddenDeckNames,
    filterHiddenDecks,
  } from "../lib/deck-hiding";
  import type { DeckInfo } from "../lib/study";

  const DECK_ROW_HEIGHT = 48;

  let {
    decks,
    collapsedDeckNames,
    hiddenDeckNames,
    initialScrollTop,
    noteSelections,
    busy,
    error,
    notice,
    onstudy,
    undo,
    redo,
    onresetdeck,
    oncollapseddecknameschange,
    onhiddendecknameschange,
    oncirclenoteselectionchange,
    onfretwindowchange,
    onintervalpairselectionchange,
    onstaffnoteselectionchange,
    ondismisserror,
    ondismissnotice,
  }: {
    decks: readonly DeckInfo[];
    collapsedDeckNames: readonly string[];
    hiddenDeckNames: readonly string[] | null;
    initialScrollTop: number;
    noteSelections: NoteSelections;
    busy: boolean;
    error: string | null;
    // Something that went right and is worth saying once, such as progress
    // carried over from the domain the app used to be served from.
    notice: string | null;
    onstudy: (name: string, scrollTop: number) => void;
    // The last operation and the one that would put it back, named — the
    // same queue the reviewer offers, since a reset done here is undone here.
    undo?: Readonly<{ label: string; onchoose: () => void }>;
    redo?: Readonly<{ label: string; onchoose: () => void }>;
    onresetdeck: (name: string) => void;
    oncollapseddecknameschange: (names: readonly string[]) => void;
    onhiddendecknameschange: (names: readonly string[] | null) => void;
    oncirclenoteselectionchange: (
      scope: CircleNoteSettingsScope,
      selection: CircleNoteSelection,
    ) => void;
    onfretwindowchange: (selection: FretWindow) => void;
    onintervalpairselectionchange: (selection: readonly string[]) => void;
    onstaffnoteselectionchange: (selection: StaffNoteSelection) => void;
    ondismisserror: () => void;
    ondismissnotice: () => void;
  } = $props();

  let deckListElement: HTMLElement;
  let scrollRestored = false;
  let collapseSpacerReleaseTimer: number | null = null;
  let collapseSpacers = $state<ReadonlyMap<string, number>>(new Map());
  const hiddenNames = $derived(
    effectiveHiddenDeckNames(hiddenDeckNames, decks),
  );
  const shownDecks = $derived(filterHiddenDecks(decks, hiddenNames));
  const parentDeckNames = $derived(deckNamesWithChildren(shownDecks));
  const visibleDecks = $derived(
    filterCollapsedDecks(shownDecks, collapsedDeckNames),
  );
  let choosingDecks = $state(false);
  let backingUp = $state(false);
  const collapseSpacerHeight = $derived(
    [...collapseSpacers.values()].reduce((sum, height) => sum + height, 0),
  );

  onDestroy(() => {
    if (collapseSpacerReleaseTimer !== null) {
      window.clearTimeout(collapseSpacerReleaseTimer);
    }
    cancelLongPress();
  });

  $effect(() => {
    if (scrollRestored || decks.length === 0) return;
    deckListElement.scrollTop = initialScrollTop;
    scrollRestored = true;
  });

  function settingsTargetFromHistoryState(
    state: unknown,
  ): DeckSettingsTarget | null {
    const deckName = settingsDeckFromHistoryState(state);
    return deckName === null ? null : deckSettingsTarget(deckName);
  }

  let settingsTarget = $state<DeckSettingsTarget | null>(
    settingsTargetFromHistoryState(history.state),
  );

  // A long press — or a right click — opens the deck's actions, the way
  // AnkiDroid's deck list does. Nothing is added to the row itself, which has
  // no width to spare.
  const LONG_PRESS_MS = 500;
  let actionsDeckName = $state<string | null>(null);
  let longPressTimer: number | null = null;

  function cancelLongPress(): void {
    if (longPressTimer === null) return;
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  // The sheet's deck has to be read before the sheet is closed: `{@const}` is
  // reactive, so a handler that clears actionsDeckName first would then pass
  // null on to the action.
  function runDeckAction(action: (deckName: string) => void): void {
    const deckName = actionsDeckName;
    if (deckName === null) return;
    leaveDeckActions();
    action(deckName);
  }

  // Every dialog and sheet is a history entry, so the back button closes the
  // one on screen rather than leaving the app.
  function openDeckActions(deckName: string): void {
    history.pushState(historyStateForDeckActions(history.state, deckName), "");
    actionsDeckName = deckName;
  }

  // Closed first, then the entry dropped: the sheet listens for Escape itself
  // as well, and two calls must not walk two entries back.
  function closeDeckActions(): void {
    if (actionsDeckName === null) return;
    actionsDeckName = null;
    if (deckActionsFromHistoryState(history.state) !== null) history.back();
  }

  // Handing the sheet over to another screen, rather than closing it: the
  // entry it is on becomes the one behind that screen, so the back button
  // goes straight there instead of stepping through the sheet again — and so
  // that going back does not race the entry the screen is about to push.
  function leaveDeckActions(): void {
    history.replaceState(historyStateForDeckActions(history.state, null), "");
    actionsDeckName = null;
  }

  function openDeckChooser(): void {
    history.pushState(historyStateForDeckChooser(history.state, true), "");
    choosingDecks = true;
  }

  function closeDeckChooser(): void {
    if (!choosingDecks) return;
    choosingDecks = false;
    if (deckChooserFromHistoryState(history.state)) history.back();
  }

  function openBackup(): void {
    history.pushState(historyStateForBackup(history.state, true), "");
    backingUp = true;
  }

  function closeBackup(): void {
    if (!backingUp) return;
    backingUp = false;
    if (backupFromHistoryState(history.state)) history.back();
  }

  function startLongPress(deckName: string): void {
    cancelLongPress();
    longPressTimer = window.setTimeout(() => {
      longPressTimer = null;
      // A selection that began before the press was recognised would stay
      // highlighted behind the sheet.
      window.getSelection()?.removeAllRanges();
      openDeckActions(deckName);
    }, LONG_PRESS_MS);
  }

  function openNoteSettings(deckName: string): void {
    const target = deckSettingsTarget(deckName);
    if (target === null) return;
    history.pushState(historyStateForSettingsDeck(history.state, deckName), "");
    settingsTarget = target;
  }

  async function toggleDeck(deckName: string): Promise<void> {
    const list = deckListElement;
    const scrollTop = list.scrollTop;
    const collapsed = collapsedDeckNames.includes(deckName);
    const nextSpacers = new Map(collapseSpacers);
    if (collapsed) {
      nextSpacers.delete(deckName);
    } else {
      const prefix = `${deckName}::`;
      const descendantCount = visibleDecks.filter(({ name }) =>
        name.startsWith(prefix),
      ).length;
      nextSpacers.set(deckName, descendantCount * DECK_ROW_HEIGHT);
    }
    collapseSpacers = nextSpacers;
    oncollapseddecknameschange(
      collapsed
        ? collapsedDeckNames.filter((name) => name !== deckName)
        : [...collapsedDeckNames, deckName],
    );
    await tick();
    list.scrollTop = scrollTop;
  }

  function scheduleCollapseSpacerRelease(): void {
    if (collapseSpacers.size === 0) return;
    if (collapseSpacerReleaseTimer !== null) {
      window.clearTimeout(collapseSpacerReleaseTimer);
    }
    collapseSpacerReleaseTimer = window.setTimeout(() => {
      collapseSpacerReleaseTimer = null;
      const naturalMaximum = Math.max(
        0,
        deckListElement.scrollHeight -
          deckListElement.clientHeight -
          collapseSpacerHeight,
      );
      if (deckListElement.scrollTop <= naturalMaximum + 1) {
        collapseSpacers = new Map();
      }
    }, 0);
  }

  function closeNoteSettings(): void {
    if (settingsDeckFromHistoryState(history.state) !== null) {
      history.back();
    } else {
      settingsTarget = null;
    }
  }

  // The keyboard walks the list the way a file tree does: the arrows move and
  // open, and the row itself is a button, so Enter studies it and the focus
  // ring says where you are. Touch has the same list without any of this.
  function studyButtonOf(deckName: string): HTMLButtonElement | null {
    return (
      deckListElement?.querySelector<HTMLButtonElement>(
        `[data-deck="${CSS.escape(deckName)}"] .deck-study`,
      ) ?? null
    );
  }

  function focusedDeckName(): string | null {
    const row = (document.activeElement as HTMLElement | null)?.closest<
      HTMLElement
    >(".deck-row");
    return row?.dataset.deck ?? null;
  }

  function moveSelection(steps: 1 | -1): void {
    const names = visibleDecks.map(({ name }) => name);
    if (names.length === 0) return;
    const current = names.indexOf(focusedDeckName() ?? "");
    // Nothing focused yet: either end of the list is where a first press
    // should land, whichever way it was pressed.
    const next =
      current < 0
        ? steps === 1
          ? 0
          : names.length - 1
        : Math.min(names.length - 1, Math.max(0, current + steps));
    studyButtonOf(names[next])?.focus();
  }

  function setExpanded(expanded: boolean): void {
    const name = focusedDeckName();
    if (name === null || !parentDeckNames.has(name)) return;
    if (collapsedDeckNames.includes(name) === expanded) void toggleDeck(name);
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      if (settingsTarget !== null) closeNoteSettings();
      else if (choosingDecks) closeDeckChooser();
      else if (backingUp) closeBackup();
      else if (actionsDeckName !== null) closeDeckActions();
      else return;
      return;
    }
    if (
      settingsTarget !== null ||
      choosingDecks ||
      backingUp ||
      actionsDeckName !== null
    ) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      target?.isContentEditable === true ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName ?? "")
    ) {
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        moveSelection(1);
        break;
      case "ArrowUp":
        moveSelection(-1);
        break;
      case "ArrowRight":
        setExpanded(true);
        break;
      case "ArrowLeft":
        setExpanded(false);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  function handlePopState(event: PopStateEvent): void {
    settingsTarget = settingsTargetFromHistoryState(event.state);
    actionsDeckName = deckActionsFromHistoryState(event.state);
    choosingDecks = deckChooserFromHistoryState(event.state);
    backingUp = backupFromHistoryState(event.state);
  }
</script>

<svelte:window onkeydown={handleKey} onpopstate={handlePopState} />

<div class="screen">
  <header class="appbar">
    <h1>Music Flashcards</h1>
  </header>

  {#if error}
    <div class="banner error" role="alert">
      <span>{error}</span>
      <button onclick={ondismisserror}>✕</button>
    </div>
  {/if}

  {#if notice}
    <div class="banner notice" role="status">
      <span>{notice}</span>
      <button onclick={ondismissnotice}>✕</button>
    </div>
  {/if}

  <main
    class="deck-list"
    bind:this={deckListElement}
    onscroll={scheduleCollapseSpacerRelease}
  >
    <div class="list-toggles">
      <button class="list-action" onclick={openBackup}>BACKUP</button>
      <button class="list-action" onclick={openDeckChooser}>
        CHOOSE DECKS
      </button>
    </div>
    {#if decks.length === 0}
      <p class="empty">
        {#if busy}
          Preparing music theory decks…
        {:else}
          The bundled decks could not be loaded.
        {/if}
      </p>
    {:else}
      <div class="column-header">
        <span class="col-new">New</span>
        <span class="col-learn">Learning</span>
        <span class="col-due">Due</span>
      </div>
      {#each visibleDecks as deck (deck.name)}
        {@const deckSettings = deckSettingsTarget(deck.name)}
        {@const hasChildren = parentDeckNames.has(deck.name)}
        {@const collapsed = collapsedDeckNames.includes(deck.name)}
        <div
          class="deck-row"
          data-deck={deck.name}
          style:padding-left={`${deck.depth * 20}px`}
          role="group"
          oncontextmenu={(event) => {
            event.preventDefault();
            cancelLongPress();
            openDeckActions(deck.name);
          }}
          onpointerdown={(event) => {
            if (event.pointerType !== "mouse") startLongPress(deck.name);
          }}
          onpointerup={cancelLongPress}
          onpointermove={cancelLongPress}
          onpointercancel={cancelLongPress}
        >
          {#if hasChildren}
            <button
              class="deck-expander"
              title={collapsed ? "Expand" : "Collapse"}
              aria-label={`${collapsed ? "Expand" : "Collapse"} ${deck.baseName}`}
              aria-expanded={!collapsed}
              onclick={() => toggleDeck(deck.name)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                {#if collapsed}
                  <path d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z" />
                {:else}
                  <path d="m6 10 1.4-1.4 4.6 4.6 4.6-4.6L18 10l-6 6z" />
                {/if}
              </svg>
            </button>
          {:else}
            <span class="deck-expander-placeholder" aria-hidden="true"></span>
          {/if}
          <button
            class="deck-study"
            onclick={() => onstudy(deck.name, deckListElement.scrollTop)}
          >
            <span class="deck-name">{deck.baseName}</span>
            <span class="settings-slot" aria-hidden="true"></span>
            <span class="count new" class:zero={deck.newCount === 0}>
              {deck.newCount}
            </span>
            <span class="count learn" class:zero={deck.learnCount === 0}>
              {deck.learnCount}
            </span>
            <span class="count due" class:zero={deck.dueCount === 0}>
              {deck.dueCount}
            </span>
          </button>
          {#if deckSettings !== null}
            <button
              class="deck-settings"
              title="Note settings"
              aria-label={`${deck.baseName} note settings`}
              onclick={() => openNoteSettings(deck.name)}
              ><span aria-hidden="true">⚙</span></button
            >
          {/if}
        </div>
      {/each}
    {/if}
    {#if busy && decks.length > 0}
      <p class="preparing">Preparing more decks…</p>
    {/if}
    {#if collapseSpacerHeight > 0}
      <!-- Keep the toggled parent at the same viewport position until the
           spacer can be removed without changing the scroll position. -->
      <div
        class="deck-collapse-spacer"
        style:height={`${collapseSpacerHeight}px`}
        aria-hidden="true"
      ></div>
    {/if}
  </main>

  <footer class="legal">
    <p>
      Music Flashcards independently reimplements the interface and study
      workflow of
      <a href="https://apps.ankiweb.net/" target="_blank" rel="noreferrer"
        >Anki</a
      > and AnkiDroid. It is not affiliated with or endorsed by Ankitects or
      the AnkiDroid project.
    </p>
    <p>
      Anki is a trademark of Ankitects Pty Ltd.
      <span aria-hidden="true"> · </span>
      <a
        href="https://spdx.org/licenses/Apache-2.0.html"
        target="_blank"
        rel="noreferrer">Apache-2.0</a
      >
    </p>
  </footer>
</div>

{#if backingUp}
  <BackupDialog onclose={closeBackup} />
{:else if choosingDecks}
  <DeckVisibilitySettings
    {decks}
    hiddenDeckNames={hiddenNames}
    oncancel={closeDeckChooser}
    onapply={(names) => {
      onhiddendecknameschange(names);
      closeDeckChooser();
    }}
  />
{:else if settingsTarget !== null}
  <NoteSettingsDialog
    targets={[settingsTarget]}
    {noteSelections}
    {oncirclenoteselectionchange}
    {onfretwindowchange}
    {onintervalpairselectionchange}
    {onstaffnoteselectionchange}
    onclose={closeNoteSettings}
  />
{/if}

{#if actionsDeckName !== null}
  <DeckActionsSheet
    deckLabel={actionsDeckName}
    undo={undo === undefined
      ? undefined
      : {
          label: undo.label,
          // Nothing is handed over: the sheet closes and the list behind it
          // is what changes.
          onchoose: () => {
            closeDeckActions();
            undo.onchoose();
          },
        }}
    redo={redo === undefined
      ? undefined
      : {
          label: redo.label,
          onchoose: () => {
            closeDeckActions();
            redo.onchoose();
          },
        }}
    onnotesettings={deckSettingsTarget(actionsDeckName) === null
      ? undefined
      : () => runDeckAction(openNoteSettings)}
    onreset={() => runDeckAction(onresetdeck)}
    onclose={closeDeckActions}
  />
{/if}

<style>
  .screen {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .appbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px 0 16px;
    height: 56px;
    background: var(--primary);
    color: var(--on-primary);
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.25);
    flex: none;
  }

  .appbar h1 {
    flex: 1;
    margin: 0;
    font-size: 20px;
    font-weight: 500;
  }

  .banner {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px;
    padding: 8px 12px;
    border-radius: 4px;
  }

  .banner span {
    flex: 1;
    overflow-wrap: anywhere;
  }

  .error {
    background: #ffebee;
    color: #b71c1c;
  }

  .notice {
    background: #e3f2fd;
    color: #0d47a1;
  }

  .deck-list {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 24px;
  }

  .preparing {
    margin: 0;
    padding: 12px 16px;
    color: var(--on-surface-muted);
    font-size: 13px;
  }

  .empty {
    margin: 48px 16px;
    text-align: center;
    color: var(--on-surface-muted);
    line-height: 1.8;
  }

  .list-toggles {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    min-height: 48px;
    padding: 0 8px;
    border-bottom: 1px solid var(--divider);
  }

  .list-action {
    min-height: 36px;
    padding: 0 12px;
    border-radius: 4px;
    color: var(--count-new);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  .column-header {
    display: flex;
    justify-content: flex-end;
    gap: 0;
    padding: 8px 16px 4px;
    font-size: 12px;
    color: var(--on-surface-muted);
  }

  .column-header span,
  .count {
    width: 40px;
    flex: none;
    text-align: right;
  }

  .column-header .col-learn,
  .count.learn {
    width: 56px;
  }

  .deck-row {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 48px;
    background: var(--surface);
    border-bottom: 1px solid var(--divider);
    /* A long press opens the deck's actions, so it must not also start a text
       selection or the iOS press-and-hold callout. The rows are buttons; there
       is nothing here worth selecting. */
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .deck-study {
    display: flex;
    flex: 1;
    align-items: center;
    min-width: 0;
    min-height: 48px;
    padding: 0 16px 0 0;
    text-align: left;
    font-size: 16px;
  }

  .deck-study:active,
  .deck-expander:active {
    filter: brightness(0.95);
  }

  .deck-expander,
  .deck-expander-placeholder {
    width: 48px;
    height: 48px;
    flex: none;
  }

  .deck-expander {
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--on-surface-muted);
  }

  /* Walking the list with the arrows moves the focus, so the row the focus is
     in is the selection. Marked on the row rather than the button, which
     starts after the chevron and would put the edge marker in the middle. */
  .deck-row:has(.deck-study:focus-visible) {
    background: var(--divider);
    box-shadow: inset 3px 0 0 var(--count-new);
  }

  .deck-study:focus-visible {
    outline: none;
  }

  .deck-expander:hover,
  .deck-expander:focus-visible {
    background: rgb(0 0 0 / 0.06);
  }

  .deck-expander svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }

  .deck-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .count {
    font-variant-numeric: tabular-nums;
  }

  .settings-slot {
    width: 40px;
    flex: none;
  }

  .deck-settings {
    position: absolute;
    z-index: 1;
    top: 50%;
    right: 152px;
    width: 40px;
    height: 40px;
    transform: translateY(-50%);
    border-radius: 50%;
    color: var(--on-surface-muted);
    font-size: 18px;
  }

  .deck-settings:hover,
  .deck-settings:focus-visible {
    background: rgb(0 0 0 / 0.06);
  }

  .count.new {
    color: var(--count-new);
  }

  .count.learn {
    color: var(--count-learn);
  }

  .count.due {
    color: var(--count-due);
  }

  .count.zero {
    color: var(--count-zero);
  }

  .legal {
    flex: none;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--divider);
    background: var(--surface);
    color: var(--on-surface-muted);
    font-size: 11px;
    line-height: 1.5;
    text-align: center;
  }

  .legal p {
    margin: 0;
  }

  .legal a {
    color: var(--count-new);
    text-decoration: none;
  }

  .legal a:hover,
  .legal a:focus-visible {
    text-decoration: underline;
  }
</style>
