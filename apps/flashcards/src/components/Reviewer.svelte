<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { untrack } from "svelte";

  import AnswerPlacementPicker from "./AnswerPlacementPicker.svelte";
  import CardFrame from "./CardFrame.svelte";
  import DeckActionsSheet from "./DeckActionsSheet.svelte";
  import ResetProgressDialog from "./ResetProgressDialog.svelte";
  import ExtraStudyDialog, {
    type ExtraStudySelection,
  } from "./ExtraStudyDialog.svelte";
  import NoteSettingsDialog from "./NoteSettingsDialog.svelte";
  import { mediaUrls as mediaUrlsFor } from "../lib/db";
  import { effectiveHiddenDeckNames } from "../lib/deck-hiding";
  import {
    isCircleIntervalCard,
    isCircleNoteToCellCard,
    type CircleNoteSelection,
    type CircleNoteSettingsScope,
  } from "../lib/circle-note-selection";
  import {
    intervalAnswerNote,
    isIntervalCard,
  } from "../lib/interval-pair-selection";
  import {
    fretWindowVariables,
    isGuitarIntervalCard,
    type FretWindow,
  } from "../lib/guitar-interval-selection";
  import {
    deckSettingsTarget,
    includesSelectedNote,
    type DeckSettingsTarget,
    type NoteSelections,
  } from "../lib/note-selection";
  import {
    staffCardVariables,
    type StaffNoteSelection,
  } from "../lib/staff-note-selection";
  import {
    cardScaleVariables,
    deckCardSettings,
    formatCardScale,
    loadCardScales,
    loadCardSettingsByDeck,
    saveCardScales,
    saveCardSettingsByDeck,
    SCREEN_WIDTH,
    stepCardRotation,
    stepCardScale,
    stepKeyboardKeys,
    stepPianoKeys,
    answerAnchorParts,
    ANSWER_ANCHOR_LABELS,
    stepTopSpace,
    type CardRotation,
    type CardScale,
    type CardScaleKind,
    type CardScales,
    type CardSettingsByDeck,
    type DeckCardSettings,
    withDeckCardSettings,
  } from "../lib/card-scale";
  import {
    addNewCardsForToday,
    answerButtonLabels,
    answerCard,
    deckCounts,
    type DeckCounts,
    extraStudyAvailability,
    type ExtraStudyAvailability,
    nextCard,
    type QueueItem,
    Rating,
    resetDeckProgress,
    resetPreview,
    type ResetPreview,
    EMPTY_RESET_PREVIEW,
  } from "../lib/study";
  import {
    buildCardDocument,
    mediaFilenamesIn,
    renderTemplate,
    resolveMediaReferences,
  } from "../lib/template";
  import type { Grade } from "../lib/scheduler";
  import {
    answerPlacementFromHistoryState,
    deckActionsFromHistoryState,
    extraStudyDeckFromHistoryState,
    historyStateForAnswerPlacement,
    historyStateForDeckActions,
    historyStateForExtraStudyDeck,
    historyStateForResetDeck,
    historyStateForSettingsDeck,
    resetDeckFromHistoryState,
    settingsDeckFromHistoryState,
  } from "../lib/navigation";
  import { isFretboardNoteToPositionsCard } from "../lib/fretboard-card";
  import { isPianoKeyboardCard, isStaffReadingCard } from "../lib/staff-card";

  let {
    deckName,
    decks,
    deckVersion = 0,
    hiddenDeckNames,
    importing = false,
    noteSelections,
    onclose,
    oncirclenoteselectionchange,
    onfretwindowchange,
    onintervalpairselectionchange,
    onstaffnoteselectionchange,
  }: {
    deckName: string;
    // Every deck there is, so a deck with decks under it can offer their
    // settings as well as its own.
    decks: readonly Readonly<{ name: string; hiddenByDefault: boolean }>[];
    // Bumped when the deck is imported again, which in development happens
    // whenever a deck file is regenerated: the card on screen was built from
    // the version before it.
    deckVersion?: number;
    // What the deck list is not showing: a deck turned off is not asked about
    // when its parent is studied either.
    hiddenDeckNames: readonly string[] | null;
    importing?: boolean;
    noteSelections: NoteSelections;
    onclose: () => void;
    oncirclenoteselectionchange: (
      scope: CircleNoteSettingsScope,
      selection: CircleNoteSelection,
    ) => void;
    onfretwindowchange: (selection: FretWindow) => void;
    onintervalpairselectionchange: (selection: readonly string[]) => void;
    onstaffnoteselectionchange: (selection: StaffNoteSelection) => void;
  } = $props();

  let item = $state<QueueItem | null>(null);
  let counts = $state<DeckCounts>({ newCount: 0, learnCount: 0, dueCount: 0 });
  let phase = $state<"question" | "answer">("question");
  let labels = $state<Record<Grade, string> | null>(null);
  let mediaUrls = $state<ReadonlyMap<string, string>>(new Map());
  let finished = $state(false);
  let extraOptionsOpen = $state(false);
  let extraAvailability = $state<ExtraStudyAvailability>({
    newRemaining: 0,
    forgottenTodayKeys: [],
    aheadKeys: [],
  });
  let actionsOpen = $state(false);
  let placementOpen = $state(false);
  const ROTATION_LABELS = {
    0: "Upright",
    90: "Clockwise",
    180: "Upside down",
    "-90": "Anticlockwise",
  } as const;
  // So the space left above the card reads as part of it rather than as a
  // band of app behind it.
  let cardBackground = $state("");
  let cardScales = $state<CardScales>(loadCardScales());
  // Stored rather than held here, so what the reader set stays set when they
  // come back to the deck — and stays that deck's: a fretboard turned sideways
  // leaves the staff decks upright.
  let cardSettingsByDeck = $state<CardSettingsByDeck>(loadCardSettingsByDeck());
  const deckSettings = $derived(deckCardSettings(cardSettingsByDeck, deckName));
  const rotation = $derived(deckSettings.rotation);
  const answerAnchor = $derived(deckSettings.answerAnchor);
  const answerPlace = $derived(answerAnchorParts(answerAnchor));
  // Down a side the buttons stand on end. Beside a card on its side they face
  // the way it does, so the two are read the same way round; beside an upright
  // one there is no such card to follow, and they stand on the edge they are
  // on as though it were the foot of the screen — the phone turned to bring
  // that edge down reads them straight, AGAIN where the left of the row lands.
  const answerTurn = $derived.by(() => {
    const { edge } = answerPlace;
    if (edge !== "left" && edge !== "right") return 0;
    if (rotation === 90 || rotation === -90) return rotation;
    return edge === "left" ? 90 : -90;
  });

  function setScale(kind: CardScaleKind, scale: CardScale): void {
    cardScales = { ...cardScales, [kind]: scale };
    saveCardScales(cardScales);
  }

  function toggleMinimalAppBar(): void {
    cardScales = { ...cardScales, minimalAppBar: !cardScales.minimalAppBar };
    saveCardScales(cardScales);
  }

  function setPianoKeys(keys: number): void {
    cardScales = { ...cardScales, pianoKeys: keys };
    saveCardScales(cardScales);
  }

  function setDeckSettings(changes: Partial<DeckCardSettings>): void {
    cardSettingsByDeck = withDeckCardSettings(cardSettingsByDeck, deckName, {
      ...deckSettings,
      ...changes,
    });
    saveCardSettingsByDeck(cardSettingsByDeck);
  }
  let resetOpen = $state(false);
  let resetPreviewCounts = $state<ResetPreview>(EMPTY_RESET_PREVIEW);
  let resetPreviewLoading = $state(false);
  let sessionNew = $state(0);
  let sessionReview = $state(0);
  let loadingExtraAvailability = $state(false);
  let settingsOpen = $state(
    untrack(() => settingsDeckFromHistoryState(history.state) === deckName),
  );
  let answering = false;
  const extraReviewKeys = new Set<string>();
  const completedExtraReviewKeys = new Set<string>();

  const nightMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Which queue the current card came from, for the underlined count à la
  // AnkiDroid: no state → new, learning → learn, review → due.
  const currentQueue = $derived(
    item === null
      ? null
      : item.state === undefined
        ? "new"
        : item.extraReview
          ? "due"
          : item.state.stateKind === "learning"
          ? "learn"
          : "due",
  );

  const canStudyMore = $derived(
    extraAvailability.newRemaining > 0 ||
      extraAvailability.forgottenTodayKeys.length > 0 ||
      extraAvailability.aheadKeys.length > 0,
  );
  // Today's new cards are done while the session still has cards to loop: the
  // point at which "ten more" is worth offering, and worth knowing whether
  // the deck has any left to give.
  const newExhausted = $derived(
    !finished &&
      counts.newCount === 0 &&
      (counts.learnCount > 0 || counts.dueCount > 0),
  );
  const canAddNewNow = $derived(
    newExhausted && extraAvailability.newRemaining > 0,
  );
  // The deck's own settings, and those of every deck under it that is being
  // asked: studying Staff → Note asks all four clefs, so the gear offers all
  // four. A deck the reader has turned off is not asked and is not offered.
  const settingsTargets = $derived.by(() => {
    const hidden = new Set(effectiveHiddenDeckNames(hiddenDeckNames, decks));
    return decks
      .filter(
        ({ name }) =>
          (name === deckName || name.startsWith(`${deckName}::`)) &&
          !hidden.has(name),
      )
      .flatMap(({ name }) => deckSettingsTarget(name) ?? []);
  });
  // The clefs this deck asks, which is what the staff cards are cropped to:
  // one clef's notes must not decide the framing of another's, or the staff
  // would move as the deck went from one to the next.
  const staffClefs = $derived(
    settingsTargets.flatMap((target) =>
      target.kind === "staff" ? [target.setting.clef] : [],
    ),
  );
  // What the settings dialog is dragging, before it is applied: only the
  // drawing follows it, so the card on screen does not change under the
  // reader while they look at what a window does.
  let previewFretWindow = $state<FretWindow | null>(null);
  const drawnFretWindow = $derived(
    previewFretWindow ?? noteSelections.fretWindow,
  );

  const revealAnswerOnDiagramTap = $derived(
    item !== null &&
      (isCircleNoteToCellCard(item.note) ||
        isCircleIntervalCard(item.note) ||
        isFretboardNoteToPositionsCard(item.note) ||
        isGuitarIntervalCard(item.note) ||
        isIntervalCard(item.note) ||
        isStaffReadingCard(item.note)),
  );

  // Every deck can be pushed down the screen, whatever it draws, so that row
  // comes first and is in the same place in every deck — under the turn, which
  // is the other row every deck has. What the card draws follows: the staff
  // decks draw a staff and a keyboard; the interval decks draw a keyboard
  // beside the answer, so there is no staff to size; the guitar deck draws a
  // fretboard and neither.
  const cardSizes = $derived.by(() => {
    if (item === null) return [];
    const staff = isStaffReadingCard(item.note);
    const board = isGuitarIntervalCard(item.note);
    const diagram = staff || isIntervalCard(item.note);
    return [
      {
        label: "Top space",
        value: formatCardScale(deckSettings.topSpace),
        onstep: (steps: 1 | -1) =>
          setDeckSettings({ topSpace: stepTopSpace(deckSettings.topSpace, steps) }),
      },
      ...(board ? boardSizes() : []),
      ...(diagram ? diagramSizes(staff) : []),
    ];
  });

  function boardSizes() {
    return [
      {
        label: "Board size",
        value: formatCardScale(cardScales.board),
        onstep: (steps: 1 | -1) =>
          setScale("board", stepCardScale(cardScales.board, steps)),
        option: {
          label: "Screen width",
          active: cardScales.board === SCREEN_WIDTH,
          onselect: () => setScale("board", SCREEN_WIDTH),
        },
      },
      {
        label: "Answer size",
        value: formatCardScale(cardScales.answer),
        onstep: (steps: 1 | -1) =>
          setScale("answer", stepCardScale(cardScales.answer, steps)),
      },
    ];
  }

  function diagramSizes(staff: boolean) {
    return [
      ...(staff
        ? [
            {
              label: "Staff size",
              value: formatCardScale(deckSettings.staff),
              onstep: (steps: 1 | -1) =>
                setDeckSettings({
                  staff: stepCardScale(deckSettings.staff, steps),
                }),
            },
          ]
        : []),
      {
        label: "Keyboard size",
        value: formatCardScale(cardScales.keyboard),
        onstep: (steps: 1 | -1) =>
          setScale("keyboard", stepCardScale(cardScales.keyboard, steps)),
        option: {
          label: "Screen width",
          active: cardScales.keyboard === SCREEN_WIDTH,
          onselect: () => setScale("keyboard", SCREEN_WIDTH),
        },
      },
      ...(staff && item !== null && isPianoKeyboardCard(item.note)
        ? [
            {
              label: "Piano keys",
              value: String(cardScales.pianoKeys),
              onstep: (steps: 1 | -1) =>
                setPianoKeys(stepPianoKeys(cardScales.pianoKeys, steps)),
            },
          ]
        : []),
      ...(staff
        ? []
        : [
            {
              label: "Keyboard keys",
              value: String(deckSettings.keyboardKeys),
              onstep: (steps: 1 | -1) =>
                setDeckSettings({
                  keyboardKeys: stepKeyboardKeys(
                    deckSettings.keyboardKeys,
                    steps,
                  ),
                }),
            },
          ]),
      {
        label: "Answer size",
        value: formatCardScale(cardScales.answer),
        onstep: (steps: 1 | -1) =>
          setScale("answer", stepCardScale(cardScales.answer, steps)),
      },
    ];
  }

  // What an interval keyboard marks before the card is turned over. The
  // question names the root, so it is marked; the answer is not, unless the
  // reader is naming the interval between two notes and wants to see both.
  const cardSwitches = $derived.by(() => {
    // The bar above the card is the app's, not the deck's, so this row is
    // offered whatever is being studied — and first, because a screen with no
    // room is what sends a reader to this sheet in the first place.
    const appBar = [
      {
        label: "Minimize app bar",
        on: cardScales.minimalAppBar,
        ontoggle: toggleMinimalAppBar,
      },
    ];
    if (item === null || !isIntervalCard(item.note)) return appBar;
    return [
      ...appBar,
      {
        label: "Front: root note",
        on: deckSettings.frontRoot,
        ontoggle: () => setDeckSettings({ frontRoot: !deckSettings.frontRoot }),
      },
      {
        label: "Front: answer note",
        on: deckSettings.frontAnswer,
        ontoggle: () =>
          setDeckSettings({ frontAnswer: !deckSettings.frontAnswer }),
      },
    ];
  });

  const doc = $derived.by(() => {
    if (!item) return "";
    const fields: Record<string, string> = {};
    item.model.fieldNames.forEach((name, i) => {
      fields[name] = item!.note.fields[i] ?? "";
    });
    const front = renderTemplate(item.template.qfmt, fields);
    const html =
      phase === "question"
        ? front
        : renderTemplate(item.template.afmt, {
            ...fields,
            FrontSide: front,
          });
    return buildCardDocument({
      html: resolveMediaReferences(html, mediaUrls),
      css: item.model.css,
      nightMode,
      keyboardKeys: deckSettings.keyboardKeys,
      pianoKeys: cardScales.pianoKeys,
      // Only the question is the reader's to strip down or fill in; the answer
      // marks what it always marks.
      intervalRoot: phase === "question" ? deckSettings.frontRoot : true,
      intervalAnswerNote:
        phase === "question" &&
        deckSettings.frontAnswer &&
        isIntervalCard(item.note)
          ? intervalAnswerNote(item.note)
          : undefined,
      variables: {
        ...fretWindowVariables(drawnFretWindow),
        ...staffCardVariables(item.note, noteSelections.staff, staffClefs),
        ...cardScaleVariables(cardScales, deckSettings),
      },
    });
  });

  async function advance(): Promise<void> {
    const now = new Date();
    const [next, freshCounts] = await Promise.all([
      nextCard(deckName, now, {
        extraReviewKeys,
            hiddenDeckNames,
            includeNote: (note) => includesSelectedNote(note, noteSelections),
      }),
      deckCounts(deckName, now, {
            hiddenDeckNames,
            includeNote: (note) => includesSelectedNote(note, noteSelections),
      }),
    ]);
    // The media first, so the card is never rendered with unresolved <img
    // src>, and the counts with it: a count for a card that is not on screen
    // yet says the reviewer is ready when it is not.
    if (next) {
      mediaUrls = await mediaUrlsFor(
        mediaFilenamesIn(next.note.fields.join("\n")),
      );
    }
    counts = withExtraReviews(freshCounts);
    item = next;
    phase = "question";
    labels = next ? answerButtonLabels(next) : null;
    finished = next === null;
    if (finished) await loadExtraAvailability(now);
  }

  function withExtraReviews(fresh: DeckCounts): DeckCounts {
    return { ...fresh, dueCount: fresh.dueCount + extraReviewKeys.size };
  }

  // Counts only, keeping the card on screen: used after pulling in more cards
  // mid-session.
  async function refreshCounts(now = new Date()): Promise<void> {
    counts = withExtraReviews(
      await deckCounts(deckName, now, {
            hiddenDeckNames,
            includeNote: (note) => includesSelectedNote(note, noteSelections),
      }),
    );
  }

  async function loadExtraAvailability(now = new Date()): Promise<void> {
    loadingExtraAvailability = true;
    try {
      extraAvailability = await extraStudyAvailability(
        deckName,
        new Set([...completedExtraReviewKeys, ...extraReviewKeys]),
        now,
        {
                hiddenDeckNames,
                includeNote: (note) => includesSelectedNote(note, noteSelections),
        },
      );
    } finally {
      loadingExtraAvailability = false;
    }
  }

  $effect(() => {
    void deckName;
    void deckVersion;
    void noteSelections;
    untrack(() => {
      applyExtraOptionsHistory(history.state);
      applyResetHistory(history.state);
      applyAnswerPlacementHistory(history.state);
    });
    void advance();
  });

  // Loaded before the sheet is opened rather than when it is: a row that
  // appears a moment late is a row pressed by accident.
  $effect(() => {
    if (!newExhausted) return;
    untrack(() => void loadExtraAvailability());
  });

  function showAnswer(): void {
    if (item) phase = "answer";
  }

  async function rate(grade: Grade): Promise<void> {
    if (!item || answering) return;
    answering = true;
    try {
      const wasNew = item.state === undefined;
      const wasReview = item.extraReview || item.state?.stateKind === "review";
      await answerCard(item, grade);
      if (wasNew) sessionNew += 1;
      if (wasReview) sessionReview += 1;
      if (item.extraReview) {
        extraReviewKeys.delete(item.card.key);
        completedExtraReviewKeys.add(item.card.key);
      }
      await advance();
    } finally {
      answering = false;
    }
  }

  // Pushed onto the history stack like the note settings, so the back button
  // closes the dialog instead of leaving the deck.
  async function openExtraOptions(): Promise<void> {
    history.pushState(
      historyStateForExtraStudyDeck(history.state, deckName),
      "",
    );
    extraOptionsOpen = true;
    await loadExtraAvailability();
  }

  function closeExtraOptions(): void {
    if (extraStudyDeckFromHistoryState(history.state) === deckName) {
      history.back();
    } else {
      extraOptionsOpen = false;
    }
  }

  // Every dialog and sheet is a history entry, so the back button closes the
  // one on screen rather than the card behind it.
  function openDeckActions(): void {
    history.pushState(historyStateForDeckActions(history.state, deckName), "");
    actionsOpen = true;
  }

  // Closed first, then the entry dropped: the sheet listens for Escape itself
  // as well, and two calls must not walk two entries back.
  function closeDeckActions(): void {
    if (!actionsOpen) return;
    actionsOpen = false;
    if (deckActionsFromHistoryState(history.state) === deckName) history.back();
  }

  // Handing the sheet over to another screen, rather than closing it: the
  // entry it is on becomes the one behind that screen, so the back button
  // goes straight there instead of stepping through the sheet again — and so
  // that going back does not race the entry the screen is about to push.
  function leaveDeckActions(): void {
    history.replaceState(historyStateForDeckActions(history.state, null), "");
    actionsOpen = false;
  }

  function openAnswerPlacement(): void {
    leaveDeckActions();
    history.pushState(
      historyStateForAnswerPlacement(history.state, deckName),
      "",
    );
    placementOpen = true;
  }

  function closeAnswerPlacement(): void {
    if (answerPlacementFromHistoryState(history.state) === deckName) {
      history.back();
    } else {
      placementOpen = false;
    }
  }

  async function openResetDialog(): Promise<void> {
    leaveDeckActions();
    history.pushState(historyStateForResetDeck(history.state, deckName), "");
    resetOpen = true;
    resetPreviewCounts = EMPTY_RESET_PREVIEW;
    resetPreviewLoading = true;
    try {
      resetPreviewCounts = await resetPreview(deckName);
    } finally {
      resetPreviewLoading = false;
    }
  }

  function closeResetDialog(): void {
    if (resetDeckFromHistoryState(history.state) === deckName) {
      history.back();
    } else {
      resetOpen = false;
    }
  }

  async function confirmReset(): Promise<void> {
    closeResetDialog();
    await resetDeckProgress(deckName);
    extraReviewKeys.clear();
    completedExtraReviewKeys.clear();
    await advance();
  }

  function applyResetHistory(state: unknown): void {
    resetOpen = resetDeckFromHistoryState(state) === deckName;
  }

  function applyAnswerPlacementHistory(state: unknown): void {
    placementOpen = answerPlacementFromHistoryState(state) === deckName;
  }

  function applyExtraOptionsHistory(state: unknown): void {
    const open = extraStudyDeckFromHistoryState(state) === deckName;
    if (open === extraOptionsOpen) return;
    extraOptionsOpen = open;
    if (open) void loadExtraAvailability();
  }

  async function startExtraStudy(
    selection: ExtraStudySelection,
  ): Promise<void> {
    closeExtraOptions();
    if (selection.new > 0) addNewCardsForToday(deckName, selection.new);
    for (const key of [
      ...extraAvailability.forgottenTodayKeys.slice(0, selection.forgotten),
      ...extraAvailability.aheadKeys.slice(0, selection.ahead),
    ]) {
      extraReviewKeys.add(key);
    }
    // Mid-session the current card stays on screen; only the counts move.
    if (finished) {
      finished = false;
      await advance();
    } else {
      await refreshCounts();
    }
  }

  // Sheet shortcut: the common case is "just give me ten more new cards".
  async function addNewCardsNow(amount: number): Promise<void> {
    addNewCardsForToday(deckName, amount);
    await refreshCounts();
  }

  function openNoteSettings(): void {
    history.pushState(
      historyStateForSettingsDeck(history.state, deckName),
      "",
    );
    settingsOpen = true;
  }

  function closeNoteSettings(): void {
    previewFretWindow = null;
    if (settingsDeckFromHistoryState(history.state) === deckName) {
      history.back();
    } else {
      settingsOpen = false;
    }
  }

  function handlePopState(event: PopStateEvent): void {
    settingsOpen = settingsDeckFromHistoryState(event.state) === deckName;
    actionsOpen = deckActionsFromHistoryState(event.state) === deckName;
    applyExtraOptionsHistory(event.state);
    applyResetHistory(event.state);
    applyAnswerPlacementHistory(event.state);
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.repeat) return;
    // The picker listens for Escape itself; the card behind it must not.
    if (placementOpen) return;
    if (settingsOpen) {
      if (event.key === "Escape") closeNoteSettings();
      return;
    }
    if (extraOptionsOpen) {
      if (event.key === "Escape") closeExtraOptions();
      return;
    }
    if (resetOpen) {
      if (event.key === "Escape") closeResetDialog();
      return;
    }
    if (actionsOpen) {
      if (event.key === "Escape") closeDeckActions();
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (phase === "question") showAnswer();
      else void rate(Rating.Good);
    } else if (phase === "answer" && ["1", "2", "3", "4"].includes(event.key)) {
      event.preventDefault();
      void rate(Number(event.key) as Grade);
    } else if (event.key === "Escape") {
      onclose();
    }
  }
</script>

<svelte:window onkeydown={handleKey} onpopstate={handlePopState} />

<div class="screen">
  <header class="appbar" class:minimal={cardScales.minimalAppBar}>
    <button
      class="appbar-action"
      title="Back"
      aria-label="Back"
      onclick={onclose}><span aria-hidden="true">←</span></button
    >
    <h1>{deckName.split("::").pop()}</h1>
    {#if importing}
      <span class="importing" role="status">Updating…</span>
    {/if}
    <button
      class="appbar-action"
      title="Deck actions"
      aria-label="Deck actions"
      onclick={openDeckActions}
      ><span aria-hidden="true">⋮</span></button
    >
  </header>

  <main class="card-area">
    {#if finished}
      <div class="congrats">
        <p class="congrats-title">Today's study is complete</p>
        <p class="session-summary">
          This session: {sessionNew} new · {sessionReview} review
        </p>
        {#if loadingExtraAvailability}
          <p>Checking for more cards…</p>
        {:else if canStudyMore}
          <button
            class="primary-action study-more"
            onclick={() => void openExtraOptions()}
          >
            STUDY MORE
          </button>
        {:else}
          <p>No additional cards are available.</p>
        {/if}
      </div>
    {:else if item}
      <div
        class="card-rotator"
        class:clockwise={rotation === 90}
        class:anticlockwise={rotation === -90}
        class:upside-down={rotation === 180}
      >
        <!-- The space and the card are inside the turn, so the space is at
             the top of the card rather than the top of the phone: a card read
             sideways is pushed away from its own top edge. The grow factors
             split the card's height, so no length has to be guessed; a share
             below zero leaves none, and the card takes it from beyond its top
             instead. -->
        <div
          class="card-turn"
          style:--top-space={deckSettings.topSpace}
          style:background={cardBackground}
        >
          <div
            class="top-space"
            style:flex-grow={Math.max(deckSettings.topSpace, 0)}
          ></div>
          <CardFrame
            {doc}
            onbackground={(color) => (cardBackground = color)}
            oncardkeydown={handleKey}
            ondiagramtap={phase === "question" && revealAnswerOnDiagramTap
              ? showAnswer
              : undefined}
          />
        </div>
      </div>
    {/if}
  </main>

  {#if !finished}
    <footer
      class="bottom"
      class:anchored={answerAnchor !== "bottom"}
      class:left={answerPlace.edge === "left" || answerPlace.end === "left"}
      class:right={answerPlace.edge === "right" || answerPlace.end === "right"}
      class:top={answerPlace.edge === "top" || answerPlace.end === "top"}
      class:full={answerPlace.end === undefined}
      class:turned={answerTurn !== 0}
      class:anticlockwise={answerTurn === -90}
    >
      <div class="counts">
        <span class="counts-body">
          <span class="count new" class:current={currentQueue === "new"}>
            {counts.newCount}
          </span>
          <span class="count learn" class:current={currentQueue === "learn"}>
            {counts.learnCount}
          </span>
          <span class="count due" class:current={currentQueue === "due"}>
            {counts.dueCount}
          </span>
        </span>
      </div>
      {#if phase === "question"}
        <button class="show-answer" onclick={showAnswer}>
          <span class="answer-label">SHOW ANSWER</span>
        </button>
      {:else if labels}
        <div class="eases">
          <button class="ease again" onclick={() => rate(Rating.Again)}>
            <span class="ease-body">
              <span class="ivl">{labels[Rating.Again]}</span>
              <span class="ease-label">AGAIN</span>
            </span>
          </button>
          <button class="ease hard" onclick={() => rate(Rating.Hard)}>
            <span class="ease-body">
              <span class="ivl">{labels[Rating.Hard]}</span>
              <span class="ease-label">HARD</span>
            </span>
          </button>
          <button class="ease good" onclick={() => rate(Rating.Good)}>
            <span class="ease-body">
              <span class="ivl">{labels[Rating.Good]}</span>
              <span class="ease-label">GOOD</span>
            </span>
          </button>
          <button class="ease easy" onclick={() => rate(Rating.Easy)}>
            <span class="ease-body">
              <span class="ivl">{labels[Rating.Easy]}</span>
              <span class="ease-label">EASY</span>
            </span>
          </button>
        </div>
      {/if}
    </footer>
  {:else}
    <footer class="bottom">
      <button class="show-answer" onclick={onclose}>BACK TO DECKS</button>
    </footer>
  {/if}
</div>

{#if actionsOpen}
  <DeckActionsSheet
    deckLabel={deckName}
    onaddnew={canAddNewNow
      ? () => {
          closeDeckActions();
          void addNewCardsNow(10);
        }
      : undefined}
    onstudymore={() => {
      leaveDeckActions();
      void openExtraOptions();
    }}
    onnotesettings={settingsTargets.length === 0
      ? undefined
      : () => {
          leaveDeckActions();
          openNoteSettings();
        }}
    rotate={{
      label: ROTATION_LABELS[rotation],
      // The sheet stays open: the next turn is usually one press away.
      onstep: (steps) =>
        setDeckSettings({ rotation: stepCardRotation(rotation, steps) }),
    }}
    answerPlacement={{
      label: ANSWER_ANCHOR_LABELS[answerAnchor],
      onopen: openAnswerPlacement,
    }}
    sizes={cardSizes}
    switches={cardSwitches}
    onreset={() => void openResetDialog()}
    onclose={closeDeckActions}
  />
{/if}

{#if placementOpen}
  <AnswerPlacementPicker
    current={answerAnchor}
    onpick={(anchor) => setDeckSettings({ answerAnchor: anchor })}
    onclose={closeAnswerPlacement}
  />
{/if}

{#if resetOpen}
  <ResetProgressDialog
    {deckName}
    preview={resetPreviewCounts}
    loading={resetPreviewLoading}
    onconfirm={() => void confirmReset()}
    oncancel={closeResetDialog}
  />
{/if}

{#if extraOptionsOpen}
  <ExtraStudyDialog
    deckLabel={deckName.split("::").pop() ?? deckName}
    availability={extraAvailability}
    loading={loadingExtraAvailability}
    onstart={(selection) => void startExtraStudy(selection)}
    oncancel={closeExtraOptions}
  />
{/if}

{#if settingsOpen && settingsTargets.length > 0}
  <NoteSettingsDialog
    targets={settingsTargets}
    {noteSelections}
    onpreviewfretwindow={(selection) => (previewFretWindow = selection)}
    {oncirclenoteselectionchange}
    {onfretwindowchange}
    {onintervalpairselectionchange}
    {onstaffnoteselectionchange}
    onclose={closeNoteSettings}
  />
{/if}

<style>
  .screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    /* The minimized bar hangs over the card rather than sitting above it. */
    position: relative;
    --minimal-bar: 36px;
    --app-bar: 56px;
  }

  .appbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    height: var(--app-bar);
    background: var(--primary);
    color: var(--on-primary);
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.25);
    flex: none;
  }

  /* Cut down for a screen with no height to spare: the bar comes out of the
     column altogether and its two buttons hang over the top corners of the
     card, so the whole screen is the card's. The name of the deck goes — the
     reader chose it a moment ago, and the sheet still carries it — but its
     heading stays in the row, hidden, to hold the buttons at the two ends.

     Nothing but the buttons takes a tap: the card underneath is answered by
     tapping what it draws, and a strip across the top of it that swallowed
     that would cost more than the bar did. */
  .appbar.minimal {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 5;
    height: var(--minimal-bar);
    background: transparent;
    box-shadow: none;
    pointer-events: none;
  }

  .appbar.minimal h1 {
    visibility: hidden;
  }

  .appbar.minimal .appbar-action {
    width: var(--minimal-bar);
    height: var(--minimal-bar);
    /* Its own ground, since what is behind it is now the card and not the
       bar's colour. */
    background: rgb(0 0 0 / 0.4);
    color: #fff;
    font-size: 17px;
    pointer-events: auto;
  }

  /* Cut down, the bar is two buttons over the top corners of the card rather
     than a row above it, and that is all a strip down the edge has to start
     below. */
  .appbar.minimal ~ .bottom {
    --app-bar: var(--minimal-bar);
  }

  .appbar.minimal .importing {
    border-radius: 10px;
    padding: 2px 8px;
    background: rgb(0 0 0 / 0.4);
    color: #fff;
  }

  .appbar h1 {
    flex: 1;
    margin: 0;
    font-size: 20px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .appbar-action {
    width: 48px;
    height: 48px;
    font-size: 22px;
    color: var(--on-primary);
    border-radius: 50%;
    flex: none;
  }

  .importing {
    flex: none;
    padding-right: 4px;
    font-size: 12px;
    opacity: 0.85;
  }

  .card-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--surface);
  }

  .card-area :global(iframe) {
    flex: 1;
    min-height: 0;
    height: auto;
  }

  .top-space {
    flex: 0 0 0;
  }

  /* Only the card turns; the app bar and the answer buttons stay where the
     hands are. What the turn overruns is cropped here, in the area's own
     shape. */
  .card-rotator {
    position: relative;
    flex: 1;
    min-height: 0;
    container-type: size;
    overflow: hidden;
  }

  /* The card and the space above it, in the card's own frame: upright it is
     the area, turned it is the area laid on its side, which is what `cq`
     units name — so a sideways card fills the space rather than being
     cropped by it. */
  .card-turn {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    container-type: size;
  }

  .card-turn :global(iframe) {
    flex: 1;
    width: 100%;
    min-height: 0;
    /* A negative top space is a negative margin: flex hands the card back
       what the margin takes away, so it grows past the top of its frame.
       `cqh` is the frame's height — the card is not its own container. */
    margin-top: calc(min(var(--top-space, 0), 0) * 100cqh);
  }

  .card-rotator.clockwise .card-turn,
  .card-rotator.anticlockwise .card-turn {
    inset: auto;
    top: 50%;
    left: 50%;
    width: 100cqh;
    height: 100cqw;
    translate: -50% -50%;
  }

  .card-rotator.clockwise .card-turn {
    rotate: 90deg;
  }

  /* Standing on its head needs no resizing: the card's own sides are still
     the area's. */
  .card-rotator.upside-down .card-turn {
    rotate: 180deg;
  }

  .card-rotator.anticlockwise .card-turn {
    rotate: -90deg;
  }

  .congrats {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--on-surface-muted);
    text-align: center;
    padding: 16px;
    overflow-y: auto;
  }

  .congrats-title {
    font-size: 20px;
    color: var(--on-surface);
    margin: 0 0 8px;
  }

  .session-summary {
    margin: 0;
  }

  .study-more {
    margin-top: 24px;
  }

  .primary-action {
    min-height: 44px;
    padding: 0 18px;
    border-radius: 4px;
    background: var(--count-new);
    color: #0b1720;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  .bottom {
    flex: none;
    background: var(--surface);
    border-top: 1px solid var(--divider);
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  /* Anchored to an edge rather than lying across the foot of the screen.
     Like the minimized bar, the row comes out of the column and hangs over
     the card, so the card keeps the height the bar would have cost. */
  .bottom.anchored {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 5;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    padding: 8px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    background: transparent;
    border-top: none;
    /* Only the buttons take a tap: the rest of the row is the card. */
    pointer-events: none;
  }

  .bottom.anchored > * {
    pointer-events: auto;
  }

  /* Each control carries its own ground, since what is behind it is now the
     card and not the bar's colour. */
  .bottom.anchored .counts {
    padding: 2px 8px;
    border-radius: 10px;
    background: rgb(0 0 0 / 0.4);
  }

  .bottom.anchored .show-answer {
    width: auto;
    height: 44px;
    padding: 0 20px;
    border-radius: 22px;
    background: rgb(0 0 0 / 0.4);
    color: #fff;
  }

  .bottom.anchored .eases {
    border-radius: 12px;
    overflow: hidden;
    background: rgb(0 0 0 / 0.4);
  }

  .bottom.anchored .ease {
    flex: none;
    width: 60px;
    height: 54px;
    border-left-color: rgb(255 255 255 / 0.3);
  }

  .bottom.anchored .ivl {
    color: rgb(255 255 255 / 0.7);
  }

  .bottom.anchored .show-answer:active,
  .bottom.anchored .ease:active {
    background: rgb(0 0 0 / 0.55);
  }

  /* The counts keep the far end of the edge, so the buttons keep the hand's. */
  .bottom.anchored.left {
    flex-direction: row-reverse;
  }

  .bottom.anchored.top {
    top: var(--app-bar);
    bottom: auto;
    align-items: flex-start;
    padding-bottom: 8px;
  }

  /* Down a side: the row stands up into a strip from under the app bar to the
     foot of the screen, and its labels stand with it. A phone held upright can
     then be answered beside a card on its side, without the two facing
     different ways. */
  .bottom.anchored.turned {
    top: var(--app-bar);
    bottom: 0;
    flex-direction: column;
    align-items: flex-start;
  }

  /* Which end of the strip the buttons are at; the counts take the other. */
  .bottom.anchored.turned.top {
    flex-direction: column-reverse;
  }

  .bottom.anchored.turned.left {
    right: auto;
    left: 0;
  }

  .bottom.anchored.turned.right {
    right: 0;
    left: auto;
    align-items: flex-end;
  }

  /* AGAIN to EASY runs the way it does on the card: down the strip beside a
     card turned clockwise, up it beside one turned the other way. */
  .bottom.anchored.turned .eases {
    flex-direction: column;
  }

  .bottom.anchored.turned.anticlockwise .eases {
    flex-direction: column-reverse;
  }

  .bottom.anchored.turned .ease {
    height: 64px;
    border-left: none;
    border-top: 1px solid rgb(255 255 255 / 0.3);
  }

  .bottom.anchored.turned .ease:first-child {
    border-top: none;
  }

  /* Stacked the other way up, it is the last button that is at the top of the
     strip and wants no line above it. */
  .bottom.anchored.turned.anticlockwise .ease:first-child {
    border-top: 1px solid rgb(255 255 255 / 0.3);
  }

  .bottom.anchored.turned.anticlockwise .ease:last-child {
    border-top: none;
  }

  .bottom.anchored.turned .show-answer {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 170px;
    padding: 0;
    border-radius: 30px;
  }

  .bottom.anchored.turned .ease-body,
  .bottom.anchored.turned .counts-body,
  .bottom.anchored.turned .answer-label {
    rotate: 90deg;
  }

  .bottom.anchored.turned.anticlockwise .ease-body,
  .bottom.anchored.turned.anticlockwise .counts-body,
  .bottom.anchored.turned.anticlockwise .answer-label {
    rotate: -90deg;
  }

  /* The ground goes on the numbers themselves once they are turned: a box the
     size the row left behind would sit crooked behind them. */
  .bottom.anchored.turned .counts {
    align-items: center;
    width: 2.2em;
    height: 5.5em;
    padding: 0;
    background: none;
  }

  .bottom.anchored.turned .counts-body {
    padding: 2px 8px;
    border-radius: 10px;
    background: rgb(0 0 0 / 0.4);
  }

  /* An edge on its own rather than one end of it: the buttons spread along the
     whole of it, as they do across the foot of the screen, and the counts take
     the near end. */
  .bottom.anchored.turned.full .eases,
  .bottom.anchored.turned.full .ease,
  .bottom.anchored.turned.full .show-answer {
    flex: 1;
    height: auto;
  }

  .counts {
    display: flex;
    justify-content: center;
    padding: 4px 0 0;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  /* The three numbers as one block, so a strip down the edge turns them
     together, the way it turns an ease's two lines. */
  .counts-body {
    display: flex;
    gap: 12px;
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

  .count.current {
    text-decoration: underline;
  }

  .answer-label {
    display: block;
    white-space: nowrap;
  }

  .show-answer {
    display: block;
    width: 100%;
    height: 52px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.05em;
    color: var(--on-surface);
  }

  .show-answer:active,
  .ease:active {
    filter: brightness(0.92);
    background: var(--bg);
  }

  .eases {
    display: flex;
  }

  .ease {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60px;
    border-left: 1px solid var(--divider);
  }

  /* The interval and the label as one block, so a strip down the edge turns
     the two together. */
  .ease-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .ease:first-child {
    border-left: none;
  }

  .ivl {
    font-size: 12px;
    color: var(--on-surface-muted);
  }

  .ease-label {
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.05em;
  }

  .ease.again .ease-label {
    color: var(--ease-again);
  }

  .ease.hard .ease-label {
    color: var(--ease-hard);
  }

  .ease.good .ease-label {
    color: var(--ease-good);
  }

  .ease.easy .ease-label {
    color: var(--ease-easy);
  }
</style>
