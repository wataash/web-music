<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { untrack } from "svelte";

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
    deckActionsFromHistoryState,
    extraStudyDeckFromHistoryState,
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
  let bannerDismissed = $state(false);
  let actionsOpen = $state(false);
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

  function setScale(kind: CardScaleKind, scale: CardScale): void {
    cardScales = { ...cardScales, [kind]: scale };
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
  // Nothing but the red (learning) queue left: the session keeps looping the
  // same cards unless more blue/green cards are pulled in.
  const onlyLearnLeft = $derived(
    !finished &&
      counts.newCount === 0 &&
      counts.dueCount === 0 &&
      counts.learnCount > 0,
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
    if (item === null || !isIntervalCard(item.note)) return [];
    return [
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
    });
    void advance();
  });

  $effect(() => {
    if (!onlyLearnLeft) return;
    bannerDismissed = false;
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

  // Banner shortcut: the common case is "just give me ten more new cards".
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
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.repeat) return;
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
  <header class="appbar">
    <button class="appbar-action" title="Back" onclick={onclose}>←</button>
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
      {#if onlyLearnLeft && canStudyMore && !bannerDismissed}
        <div class="only-learn">
          <span class="only-learn-text">
            Only cards you are still learning are left.
          </span>
          {#if extraAvailability.newRemaining > 0}
            <button
              class="banner-action new"
              onclick={() => void addNewCardsNow(10)}
              >+10 NEW</button
            >
          {/if}
          <button
            class="banner-action"
            onclick={() => void openExtraOptions()}>MORE…</button
          >
          <button
            class="banner-close"
            title="Dismiss"
            aria-label="Dismiss"
            onclick={() => (bannerDismissed = true)}>✕</button
          >
        </div>
      {/if}
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
    <footer class="bottom">
      <div class="counts">
        <span class="count new" class:current={currentQueue === "new"}>
          {counts.newCount}
        </span>
        <span class="count learn" class:current={currentQueue === "learn"}>
          {counts.learnCount}
        </span>
        <span class="count due" class:current={currentQueue === "due"}>
          {counts.dueCount}
        </span>
      </div>
      {#if phase === "question"}
        <button class="show-answer" onclick={showAnswer}>SHOW ANSWER</button>
      {:else if labels}
        <div class="eases">
          <button class="ease again" onclick={() => rate(Rating.Again)}>
            <span class="ivl">{labels[Rating.Again]}</span>
            <span class="ease-label">AGAIN</span>
          </button>
          <button class="ease hard" onclick={() => rate(Rating.Hard)}>
            <span class="ivl">{labels[Rating.Hard]}</span>
            <span class="ease-label">HARD</span>
          </button>
          <button class="ease good" onclick={() => rate(Rating.Good)}>
            <span class="ivl">{labels[Rating.Good]}</span>
            <span class="ease-label">GOOD</span>
          </button>
          <button class="ease easy" onclick={() => rate(Rating.Easy)}>
            <span class="ivl">{labels[Rating.Easy]}</span>
            <span class="ease-label">EASY</span>
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
    sizes={cardSizes}
    switches={cardSwitches}
    onreset={() => void openResetDialog()}
    onclose={closeDeckActions}
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
  }

  .appbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
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

  .only-learn {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 8px 8px 12px;
    border-bottom: 1px solid var(--divider);
    background: var(--bg);
    font-size: 13px;
  }

  .only-learn-text {
    flex: 1;
    color: var(--on-surface-muted);
  }

  .banner-action {
    flex: none;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--divider);
    border-radius: 16px;
    font-size: 12px;
    font-weight: 500;
    color: var(--count-due);
  }

  .banner-action.new {
    color: var(--count-new);
  }

  .banner-close {
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: var(--on-surface-muted);
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

  .counts {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 4px 0 0;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 60px;
    border-left: 1px solid var(--divider);
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
