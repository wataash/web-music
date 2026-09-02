<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount } from "svelte";

  import DeckList from "./components/DeckList.svelte";
  import ResetProgressDialog from "./components/ResetProgressDialog.svelte";
  import { watchForServiceWorkerUpdate } from "./lib/app-update";
  import Reviewer from "./components/Reviewer.svelte";
  import {
    changedBundledDeckEntries,
    fetchBundledDeck,
    rememberImportedBundledDecks,
  } from "./lib/bundled-decks";
  import {
    changedDevDeckEntries,
    fetchDevDeck,
    listenForDevDeckUpdates,
    rememberImportedDevDecks,
  } from "./lib/dev-decks";
  import type { DeckData } from "./lib/deck-data";
  import { parseCollapsedDeckNames } from "./lib/deck-collapse";
  import { parseHiddenDeckNames } from "./lib/deck-hiding";
  import { db, importDeckData } from "./lib/db";
  import { restoreBackup } from "./lib/backup";
  import { counted } from "./lib/format";
  import { decodeHandoff, handoffFromHash } from "./lib/handoff";
  import {
    DEFAULT_CIRCLE_NOTE_SELECTION,
    parseCircleNoteSelection,
    type CircleNoteSelection,
    type CircleNoteSelections,
    type CircleNoteSettingsScope,
  } from "./lib/circle-note-selection";
  import {
    includesSelectedNote,
    type NoteSelections,
  } from "./lib/note-selection";
  import {
    DEFAULT_INTERVAL_PAIR_SELECTION,
    parseIntervalPairs,
  } from "./lib/interval-pair-selection";
  import {
    DEFAULT_FRET_WINDOW,
    parseFretWindow,
    type FretWindow,
  } from "./lib/guitar-interval-selection";
  import {
    DEFAULT_STAFF_NOTE_SELECTION,
    parseStaffNoteSelection,
    type StaffNoteSelection,
  } from "./lib/staff-note-selection";
  import {
    deckListScrollTopFromHistoryState,
    deckFromHistoryState,
    historyStateForDeck,
    historyStateForDeckListScrollTop,
    historyStateForResetDeck,
    resetDeckFromHistoryState,
  } from "./lib/navigation";
  import {
    EMPTY_RESET_PREVIEW,
    listDecksWithCounts,
    resetDeckProgress,
    resetPreview,
    type DeckInfo,
    type ResetPreview,
  } from "./lib/study";

  let decks = $state<readonly DeckInfo[]>([]);
  let studyDeck = $state<string | null>(null);
  let deckListScrollTop = $state(0);
  let busy = $state(false);
  let initializing = $state(true);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let collapsedDeckNames = $state<readonly string[]>([]);
  // null until the reader has chosen: the packages' own defaults stand in.
  let hiddenDeckNames = $state<readonly string[] | null>(null);
  const LEGACY_CIRCLE_NOTE_SELECTION_KEY =
    "music-flashcards:circle-of-fifths-note-selection";
  const CIRCLE_NOTE_SELECTION_KEYS = {
    "note-to-cell":
      "music-flashcards:circle-of-fifths-note-to-cell-selection",
    intervals: "music-flashcards:circle-of-fifths-interval-selection",
  } as const satisfies Readonly<Record<CircleNoteSettingsScope, string>>;
  const STAFF_NOTE_SELECTION_KEY =
    "music-flashcards:music-staff-note-selection";
  const INTERVAL_PAIR_SELECTION_KEY =
    "music-flashcards:interval-pair-selection";
  const FRET_WINDOW_KEY = "music-flashcards:guitar-fret-window";
  const COLLAPSED_DECK_NAMES_KEY = "music-flashcards:collapsed-decks";
  const HIDDEN_DECK_NAMES_KEY = "music-flashcards:hidden-decks";

  let noteToCellSelection = $state<CircleNoteSelection>(
    DEFAULT_CIRCLE_NOTE_SELECTION,
  );
  let intervalSelection = $state<CircleNoteSelection>(
    DEFAULT_CIRCLE_NOTE_SELECTION,
  );
  let staffNoteSelection = $state<StaffNoteSelection>(
    DEFAULT_STAFF_NOTE_SELECTION,
  );
  let intervalPairSelection = $state<readonly string[]>(
    DEFAULT_INTERVAL_PAIR_SELECTION,
  );
  let fretWindow = $state<FretWindow>(DEFAULT_FRET_WINDOW);
  const circleNoteSelections = $derived<CircleNoteSelections>({
    noteToCell: noteToCellSelection,
    intervals: intervalSelection,
  });
  const noteSelections = $derived<NoteSelections>({
    circle: circleNoteSelections,
    fretWindow,
    intervalPairs: new Set(intervalPairSelection),
    staff: staffNoteSelection,
  });
  let devSyncRunning = false;
  let devSyncAll = false;
  let devSyncForce = false;
  const pendingDevDeckIds = new Set<string>();

  let resetDeckName = $state<string | null>(null);
  let resetPreviewCounts = $state<ResetPreview>(EMPTY_RESET_PREVIEW);
  let resetPreviewLoading = $state(false);

  // On the history stack like the other dialogs, so the back button closes it
  // instead of leaving the app.
  async function openResetDialog(deckName: string): Promise<void> {
    history.pushState(historyStateForResetDeck(history.state, deckName), "");
    resetDeckName = deckName;
    resetPreviewCounts = EMPTY_RESET_PREVIEW;
    resetPreviewLoading = true;
    try {
      resetPreviewCounts = await resetPreview(deckName);
    } finally {
      resetPreviewLoading = false;
    }
  }

  function closeResetDialog(): void {
    if (resetDeckFromHistoryState(history.state) !== null) {
      history.back();
    } else {
      resetDeckName = null;
    }
  }

  async function confirmReset(): Promise<void> {
    const deckName = resetDeckName;
    if (deckName === null) return;
    closeResetDialog();
    await resetDeckProgress(deckName);
    await refresh();
  }

  // A deployed update arrives as a new service worker taking over, but the
  // page it takes over is still the old one until it reloads. Not mid-review,
  // though: that would throw the reader out of a card.
  let updateReady = $state(false);
  $effect(() => {
    if (updateReady && studyDeck === null) location.reload();
  });

  // Bumped when a deck is imported again, so the reviewer redraws the card it
  // is holding rather than the version it was built from.
  let deckVersion = $state(0);

  async function refresh(): Promise<void> {
    decks = await listDecksWithCounts(new Date(), {
      hiddenDeckNames,
      includeNote: (note) => includesSelectedNote(note, noteSelections),
    });
  }

  function setCollapsedDeckNames(names: readonly string[]): void {
    collapsedDeckNames = names;
    try {
      localStorage.setItem(COLLAPSED_DECK_NAMES_KEY, JSON.stringify(names));
    } catch {
      // The preference is optional when storage is unavailable.
    }
  }

  function setHiddenDeckNames(names: readonly string[] | null): void {
    hiddenDeckNames = names;
    try {
      if (names === null) localStorage.removeItem(HIDDEN_DECK_NAMES_KEY);
      else localStorage.setItem(HIDDEN_DECK_NAMES_KEY, JSON.stringify(names));
    } catch {
      // The preference is optional when storage is unavailable.
    }
  }

  function setCircleNoteSelection(
    scope: CircleNoteSettingsScope,
    selection: CircleNoteSelection,
  ): void {
    if (scope === "note-to-cell") noteToCellSelection = selection;
    else intervalSelection = selection;
    try {
      localStorage.setItem(
        CIRCLE_NOTE_SELECTION_KEYS[scope],
        JSON.stringify(selection),
      );
    } catch {
      // The preference is optional when storage is unavailable.
    }
    void refresh();
  }

  function setStaffNoteSelection(selection: StaffNoteSelection): void {
    staffNoteSelection = selection;
    try {
      localStorage.setItem(
        STAFF_NOTE_SELECTION_KEY,
        JSON.stringify(selection),
      );
    } catch {
      // The preference is optional when storage is unavailable.
    }
    void refresh();
  }

  function setFretWindow(selection: FretWindow): void {
    fretWindow = selection;
    try {
      localStorage.setItem(FRET_WINDOW_KEY, JSON.stringify(selection));
    } catch {
      // The preference is optional when storage is unavailable.
    }
    void refresh();
  }

  function setIntervalPairSelection(selection: readonly string[]): void {
    intervalPairSelection = selection;
    try {
      localStorage.setItem(
        INTERVAL_PAIR_SELECTION_KEY,
        JSON.stringify(selection),
      );
    } catch {
      // The preference is optional when storage is unavailable.
    }
    void refresh();
  }

  function loadCircleNoteSelection(
    key: string,
    fallback: CircleNoteSelection,
  ): CircleNoteSelection {
    try {
      const saved = localStorage.getItem(key);
      return saved === null
        ? fallback
        : parseCircleNoteSelection(JSON.parse(saved));
    } catch {
      return fallback;
    }
  }

  // Downloads run in parallel, but a deck is imported and listed as soon as it
  // arrives: the first decks are studiable while the largest is still landing.
  // Each deck is remembered on its own, so a failure keeps what already
  // imported.
  async function importAsTheyArrive<T extends { deck: DeckData }>(
    jobs: readonly Promise<T>[],
    remember: (imported: readonly T[]) => void,
  ): Promise<readonly T[]> {
    if (jobs.length === 0) return [];
    busy = true;
    error = null;
    const imported: T[] = [];
    const failures = new Set<string>();
    const recordFailure = (reason: unknown): void => {
      failures.add(reason instanceof Error ? reason.message : String(reason));
    };
    try {
      for (const job of jobs) {
        try {
          const deck = await job;
          await importDeckData(deck.deck);
          imported.push(deck);
          try {
            remember([deck]);
          } catch (reason) {
            // Remembering only avoids downloading the same deck next time; a
            // full or unavailable localStorage must not hide this deck or the
            // unrelated ones after it.
            recordFailure(reason);
          }
          await refresh();
          // Importing holds the main thread, so hand it back long enough for
          // the deck that just landed to be painted before the next one starts.
          // A timeout rather than requestAnimationFrame: a background tab
          // never gets a frame, and the import must finish there too.
          await new Promise((resolve) => setTimeout(resolve));
        } catch (reason) {
          // Downloads are independent: a missing or malformed deck leaves an
          // error to show, but must not strand the successful downloads after
          // it.
          recordFailure(reason);
        }
      }
      if (failures.size > 0) error = [...failures].join("\n");
      return imported;
    } finally {
      busy = false;
    }
  }

  // Start every download now, but keep the rejections quiet until the loop
  // above awaits them, or the browser reports them as unhandled.
  function startDownloads<E, T>(
    entries: readonly E[],
    fetchOne: (entry: E) => Promise<T>,
  ): readonly Promise<T>[] {
    return entries.map((entry) => {
      const job = fetchOne(entry);
      job.catch(() => {});
      return job;
    });
  }

  function queueDevSync(id?: string, force = false): void {
    if (!import.meta.env.DEV) return;
    if (id === undefined) devSyncAll = true;
    else pendingDevDeckIds.add(id);
    devSyncForce ||= force;
    void flushDevSync();
  }

  async function flushDevSync(): Promise<void> {
    if (devSyncRunning) return;
    if (!devSyncAll && pendingDevDeckIds.size === 0) return;

    const requestedIds = devSyncAll ? undefined : [...pendingDevDeckIds];
    const force = devSyncForce;
    devSyncAll = false;
    devSyncForce = false;
    pendingDevDeckIds.clear();
    devSyncRunning = true;
    try {
      const entries = await changedDevDeckEntries(requestedIds, force);
      const imports = await importAsTheyArrive(
        startDownloads(entries, fetchDevDeck),
        rememberImportedDevDecks,
      );
      if (imports.length > 0) {
        deckVersion += 1;
        console.info(
          `[Music Flashcards] automatically imported ${imports
            .map(({ id }) => id)
            .join(", ")}`,
        );
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      devSyncRunning = false;
      if (devSyncAll || pendingDevDeckIds.size > 0) void flushDevSync();
    }
  }

  function startStudy(name: string, scrollTop: number): void {
    deckListScrollTop = scrollTop;
    const listState = historyStateForDeckListScrollTop(
      history.state,
      scrollTop,
    );
    history.replaceState(listState, "");
    history.pushState(historyStateForDeck(listState, name), "");
    studyDeck = name;
  }

  async function applyHistoryState(state: unknown): Promise<void> {
    const deck = deckFromHistoryState(state);
    if (deck !== null) {
      // The reviewer keeps track of its own dialogs.
      studyDeck = deck;
      return;
    }
    resetDeckName = resetDeckFromHistoryState(state);
    deckListScrollTop = deckListScrollTopFromHistoryState(state);
    studyDeck = null;
    await refresh();
    void flushDevSync();
  }

  function closeReviewer(): void {
    if (deckFromHistoryState(history.state) === studyDeck) {
      history.back();
      return;
    }
    const listState = historyStateForDeck(history.state, null);
    history.replaceState(listState, "");
    void applyHistoryState(listState);
  }

  // The old domain sends the reader here with their progress in the URL. It
  // is restored before the decks are imported: the cards it schedules are
  // keyed by note guid, so they wait for the notes rather than the other way
  // round, and the deck list is right the first time it is drawn.
  async function receiveHandoff(): Promise<void> {
    const payload = handoffFromHash(location.hash);
    if (payload === null) return;
    // Dropped before the restore rather than after: a reload must not apply it
    // a second time, and the reader's progress has no business sitting in an
    // address bar.
    history.replaceState(history.state, "", location.pathname + location.search);
    const summary = await restoreBackup(await decodeHandoff(payload));
    notice =
      `Brought ${counted(summary.statesWritten, "card")} and ` +
      `${counted(summary.reviewsAdded, "answer")} over from ` +
      "learnmusic.wataash.com.";
  }

  async function initialize(): Promise<void> {
    try {
      await receiveHandoff();
    } catch (e) {
      // The decks are still worth importing, and what the old domain sent is
      // still on the old domain: it can be exported and restored by hand.
      error = `The progress from the old domain could not be restored: ${
        e instanceof Error ? e.message : String(e)
      }`;
    }
    await refresh();
    if (import.meta.env.PROD) {
      const entries = await changedBundledDeckEntries(
        (await db.decks.count()) === 0,
      );
      const imports = await importAsTheyArrive(
        startDownloads(entries, fetchBundledDeck),
        rememberImportedBundledDecks,
      );
      if (imports.length > 0) {
        console.info(
          `[Music Flashcards] imported bundled decks: ${imports
            .map(({ id }) => id)
            .join(", ")}`,
        );
      }
    }
    queueDevSync(undefined, decks.length === 0);
  }

  onMount(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_DECK_NAMES_KEY);
      if (saved !== null) {
        collapsedDeckNames = parseCollapsedDeckNames(JSON.parse(saved));
      }
    } catch {
      collapsedDeckNames = [];
    }
    try {
      const saved = localStorage.getItem(HIDDEN_DECK_NAMES_KEY);
      if (saved !== null) {
        hiddenDeckNames = parseHiddenDeckNames(JSON.parse(saved));
      }
    } catch {
      hiddenDeckNames = null;
    }
    const legacyCircleSelection = loadCircleNoteSelection(
      LEGACY_CIRCLE_NOTE_SELECTION_KEY,
      DEFAULT_CIRCLE_NOTE_SELECTION,
    );
    noteToCellSelection = loadCircleNoteSelection(
      CIRCLE_NOTE_SELECTION_KEYS["note-to-cell"],
      legacyCircleSelection,
    );
    intervalSelection = loadCircleNoteSelection(
      CIRCLE_NOTE_SELECTION_KEYS.intervals,
      DEFAULT_CIRCLE_NOTE_SELECTION,
    );
    try {
      const saved = localStorage.getItem(STAFF_NOTE_SELECTION_KEY);
      if (saved !== null) {
        staffNoteSelection = parseStaffNoteSelection(JSON.parse(saved));
      }
    } catch {
      staffNoteSelection = DEFAULT_STAFF_NOTE_SELECTION;
    }
    try {
      const saved = localStorage.getItem(INTERVAL_PAIR_SELECTION_KEY);
      if (saved !== null) {
        intervalPairSelection = parseIntervalPairs(JSON.parse(saved));
      }
    } catch {
      intervalPairSelection = DEFAULT_INTERVAL_PAIR_SELECTION;
    }
    try {
      const saved = localStorage.getItem(FRET_WINDOW_KEY);
      if (saved !== null) fretWindow = parseFretWindow(JSON.parse(saved));
    } catch {
      fretWindow = DEFAULT_FRET_WINDOW;
    }
    const initialState = historyStateForDeckListScrollTop(
      historyStateForDeck(
        history.state,
        deckFromHistoryState(history.state),
      ),
      deckListScrollTopFromHistoryState(history.state),
    );
    history.replaceState(initialState, "");
    deckListScrollTop = deckListScrollTopFromHistoryState(initialState);
    studyDeck = deckFromHistoryState(initialState);
    const handlePopState = (event: PopStateEvent): void => {
      void applyHistoryState(event.state);
    };
    window.addEventListener("popstate", handlePopState);
    const stopListening = import.meta.env.DEV
      ? listenForDevDeckUpdates((id) => queueDevSync(id))
      : () => {};
    const stopWatchingForUpdates = import.meta.env.PROD
      ? watchForServiceWorkerUpdate(() => (updateReady = true))
      : () => {};
    void initialize()
      .catch((e: unknown) => {
        error = e instanceof Error ? e.message : String(e);
      })
      .finally(() => {
        initializing = false;
      });
    return () => {
      window.removeEventListener("popstate", handlePopState);
      stopListening();
      stopWatchingForUpdates();
    };
  });
</script>

{#if studyDeck !== null}
  <Reviewer
    deckName={studyDeck}
    {decks}
    {deckVersion}
    {hiddenDeckNames}
    importing={busy}
    {noteSelections}
    onclose={closeReviewer}
    oncirclenoteselectionchange={setCircleNoteSelection}
    onfretwindowchange={setFretWindow}
    onintervalpairselectionchange={setIntervalPairSelection}
    onstaffnoteselectionchange={setStaffNoteSelection}
  />
{:else}
  <DeckList
    {decks}
    {collapsedDeckNames}
    {hiddenDeckNames}
    initialScrollTop={deckListScrollTop}
    {noteSelections}
    busy={busy || initializing}
    {error}
    {notice}
    onstudy={startStudy}
    onresetdeck={(name) => void openResetDialog(name)}
    oncollapseddecknameschange={setCollapsedDeckNames}
    onhiddendecknameschange={setHiddenDeckNames}
    oncirclenoteselectionchange={setCircleNoteSelection}
    onfretwindowchange={setFretWindow}
    onintervalpairselectionchange={setIntervalPairSelection}
    onstaffnoteselectionchange={setStaffNoteSelection}
    ondismisserror={() => (error = null)}
    ondismissnotice={() => (notice = null)}
  />
{/if}

{#if resetDeckName !== null}
  <ResetProgressDialog
    deckName={resetDeckName}
    preview={resetPreviewCounts}
    loading={resetPreviewLoading}
    onconfirm={() => void confirmReset()}
    oncancel={closeResetDialog}
  />
{/if}
