<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount, onDestroy, getAllContexts, setContext, untrack } from "svelte";
  import { CHORD_VIEW_CONTEXT, chordViewPersistence, type ChordViewStore } from "../lib/chord-view";

  import { arrangePart } from "../lib/arrange-part";
  import { fretPitch, matchingPreset } from "../lib/tuning";
  import { chordSemitones } from "../lib/chord-audio";
  import { playSemitones } from "@web-music/practice-ui/tones";
  import ChordFretboard from "./ChordFretboard.svelte";
  import ChordList from "./ChordList.svelte";
  import ChordTones from "./ChordTones.svelte";
  import ChordMetadata from "./ChordMetadata.svelte";
  import { practiceAnnotation, practiceEntries, songComments, uniqueAnnotatedChords, setImportedMetadata, songScore } from "../lib/chord-metadata";
  import { prepareChartPrint } from "../lib/chart-print";
  import SongPicker from "./SongPicker.svelte";
  import SongSource from "./SongSource.svelte";
  import ChordSource from "./ChordSource.svelte";
  import ChordSettings from "./ChordSettings.svelte";
  import InstrumentSettings from "./InstrumentSettings.svelte";
  import { CHORD_SONGS, type ChordSong } from "../lib/chord-songs";
  import ChordExport from "./ChordExport.svelte";
  import ChordImport from "./ChordImport.svelte";
  import { loadImportedSongs, saveImportedSongs, deleteImportedSong, type ImportedSong } from "../lib/chord-import";
  import { loadChordFavorites, saveChordFavorites } from "../lib/chord-favorites";

  import { defaultChordProgress, loadChordProgress, saveChordProgress } from "../lib/chord-progress";
  import {
    ANSWER_ANCHOR_LABELS,
    answerAnchorParts,
    answerAnchorAt,
    DEFAULT_CARD_OFFSETS,
    DEFAULT_CARD_SCALES,
    DEFAULT_DECK_CARD_SETTINGS,
    type CardOffset,
    deckCardSettings,
    formatCardScale,
    loadCardScales,
    loadCardSettingsByDeck,
    saveCardScales,
    saveCardSettingsByDeck,
    SCREEN_WIDTH,
    stepCardRotation,
    stepCardScale,
    type CardScale,
    type CardScaleKind,
    type CardScales,
    type CardSettingsByDeck,
    type DeckCardSettings,
    withDeckCardSettings,
  } from "@web-music/practice-ui/card-scale";
  import {
    clampFretCount,
  } from "../lib/chord-fretboard";
  import { describeChord, PRACTICE_KEYS } from "../lib/chords";
  import {
    cardLayoutFromHistoryState,
    deckActionsFromHistoryState,
    historyStateForCardLayout,
    historyStateForDeckActions,
  } from "@web-music/practice-ui/navigation";

  let importedSongs = $state<ImportedSong[]>([]);
  const songs = $derived([...CHORD_SONGS, ...importedSongs]);
  let libraryReady = $state(false);
  let libraryError = $state("");
  let songSearch = $state("");
  let songSort = $state("title");
  let playlistFilter = $state("");
  let styleFilter = $state("");
  const importedById = $derived(new Map(importedSongs.map(song => [song.id, song])));
  const playlists = $derived([...new Set(importedSongs.map(song => song.playlist))].sort());
  const songStyles = $derived(new Map(importedSongs.map(song => [song.id, song.metadata.score.fields.find(field => ['Style', 'スタイル'].includes(field.label))?.value ?? ""])));
  const styles = $derived([...new Set(songStyles.values())].filter(Boolean).sort());
  function matchesLibrary(song: ChordSong): boolean {
    const imported = importedById.get(song.id);
    return (!playlistFilter || (playlistFilter === 'examples' ? !imported : !!imported && 'playlist:' + imported.playlist === playlistFilter)) &&
      (!styleFilter || songStyles.get(song.id) === styleFilter) &&
      (song.title + " " + song.artist).toLocaleLowerCase().includes(songSearch.toLocaleLowerCase());
  }
  let favoriteIds = $state(loadChordFavorites());
  let favoritesOnly = $state(false);
  const favoriteSongs = $derived(songs.filter(song => favoriteIds.includes(song.id)));
  const matchingSongs = $derived(songs.filter(song => (!favoritesOnly || favoriteIds.includes(song.id)) &&
    matchesLibrary(song)).sort((a, b) => {
      const titleOrder = a.title.localeCompare(b.title, 'en', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);
      if (songSort === 'artist') return a.artist.localeCompare(b.artist, 'en', { sensitivity: 'base' }) || titleOrder;
      if (songSort === 'import') return (importedById.get(a.id)?.importedAt ?? 0) - (importedById.get(b.id)?.importedAt ?? 0) || titleOrder;
      return titleOrder;
    }));

  function toggleFavorite() {
    const next = isFavorite ? favoriteIds.filter(id => id !== selectedSong.id) : [...favoriteIds, selectedSong.id];
    try {
      saveChordFavorites(next);
      favoriteIds = next;
      if (favoritesOnly && !next.includes(selectedSong.id)) {
        const first = songs.find(song => next.includes(song.id) && matchesLibrary(song));
        if (first) selectSong(first);
      }
    } catch { libraryError = "Could not save favorites. Check your browser storage settings."; }
  }

  function toggleFavoritesOnly() {
    favoritesOnly = !favoritesOnly;
    if (favoritesOnly && !isFavorite && favoriteSongs.length) {
      const first = favoriteSongs.find(matchesLibrary);
      if (first) selectSong(first);
    }
  }

  onMount(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await loadImportedSongs();
        if (!active) return;
        const available = setLibrary(stored);
        Object.assign(savedProgress, loadChordProgress(available));
        selectSong(available.find(song => song.id === savedProgress.songId) ?? CHORD_SONGS[0], true);
        viewRevision++;
      } catch { libraryError = "Could not load saved charts. Check your browser storage settings."; }
      finally { if (active) libraryReady = true; }
    })();
    return () => { active = false; };
  });

  function setLibrary(stored: ImportedSong[]): ChordSong[] {
    setImportedMetadata(stored);
    importedSongs = stored;
    return [...CHORD_SONGS, ...stored];
  }

  async function importSongs(incoming: ImportedSong[]) {
    await saveImportedSongs(incoming);
    setLibrary(await loadImportedSongs());
    songSearch = "";
    playlistFilter = ""; styleFilter = "";
    favoritesOnly = false;
    selectSong(incoming[0]);
  }

  async function removeSong() {
    const removedId = songId;
    try {
      await deleteImportedSong(removedId);
      const available = setLibrary(importedSongs.filter(song => song.id !== removedId));
      if (songId === removedId) selectSong(available.find(song => !favoritesOnly || favoriteIds.includes(song.id)) ?? CHORD_SONGS[0]);
    } catch { libraryError = "Could not delete the chart."; }
  }

  const ROTATION_LABELS = {
    0: "Upright",
    90: "Clockwise",
    180: "Upside down",
    "-90": "Anticlockwise",
  } as const;

  const savedProgress = loadChordProgress();
  let minorNotation = $state(savedProgress.minorNotation);
  let highlightAnnotations = $state(savedProgress.highlightAnnotations);
  let chartZoom = $state(savedProgress.chartZoom);
  let viewRevision = $state(0);
  setContext<ChordViewStore>(CHORD_VIEW_CONTEXT, {
    scope: () => `${songId}:${listMode}:${uniqueScope}`,
    views: () => savedProgress.views,
    save: () => saveChordProgress(savedProgress),
    minorNotation: () => minorNotation,
    setMinorNotation: (value) => { minorNotation = value; },
    highlightAnnotations: () => highlightAnnotations,
    setHighlightAnnotations: (value) => { highlightAnnotations = value; },
    chartZoom: () => chartZoom,
    setChartZoom: (zoom) => { chartZoom = zoom; },
  });
  const printContext = getAllContexts();
  let clearPrint = () => {};
  function beforePrint() {
    afterPrint();
    const score = songScore(songId);
    if (score) clearPrint = prepareChartPrint(score, sourceSymbols, selectedSong.title, [selectedSong.artist, songStyle].filter(Boolean).join(" · "), printContext);
  }
  function afterPrint() { clearPrint(); clearPrint = () => {}; }
  onDestroy(afterPrint);
  const { remember, viewKey } = chordViewPersistence();
  let index = $state(savedProgress.positions[savedProgress.songId] ?? 0);
  let listMode = $state(savedProgress.listMode);
  let uniqueChordsOnly = $state(savedProgress.uniqueChordsOnly);
  let uniqueBySection = $state(savedProgress.uniqueBySection);
  // Keeping the song-wide names lets saved views survive the added section mode.
  const uniqueScope = $derived(!uniqueChordsOnly ? "false" : uniqueBySection ? "section" : "true");
  let revealed = $state(savedProgress.revealed);
  let separator = $state(savedProgress.separator);
  let insertBlankBoards = $state(savedProgress.insertBlankBoards);
  let songId = $state(savedProgress.songId);
  const selectedSong = $derived(
    songs.find(({ id }) => id === songId) ?? CHORD_SONGS[0],
  );
  const songStyle = $derived(songScore(selectedSong.id)?.fields.find(field => ['Style', 'スタイル'].includes(field.label))?.value);
  let importOpen = $state(false);
  let libraryOpen = $state(false);
  let libraryDialog = $state<HTMLDialogElement>();
  $effect(() => {
    if (libraryOpen) { libraryDialog?.showModal(); libraryDialog?.querySelector<HTMLInputElement>(".song-search")?.focus(); }
    else libraryDialog?.close();
  });
  let instrumentOpen = $state(false);
  let fullChartOpen = $state(false);
  const isFavorite = $derived(favoriteIds.includes(selectedSong.id));
  const settingsId = $derived(`Chord positions: ${selectedSong.id}`);
  let targetKey = $state<string>(untrack(() => savedProgress.keys[songId] ?? selectedSong.originalKey));
  $effect(() => {
    if (!libraryReady) return;
    savedProgress.positions[songId] = index;
    savedProgress.keys[songId] = targetKey;
    Object.assign(savedProgress, { songId, listMode, uniqueChordsOnly, uniqueBySection, minorNotation, highlightAnnotations, chartZoom,
      insertBlankBoards, revealed, separator, bassStrings: [...bassStrings], tuning: [...tuning], tuningPreset, fretCount });
    saveChordProgress(savedProgress);
  });

  function resetProgress(): void {
    favoritesOnly = false;
    songSearch = "";
    playlistFilter = ""; styleFilter = "";
    const defaults = defaultChordProgress();
    Object.assign(savedProgress, defaults);
    songId = defaults.songId;
    index = 0;
    listMode = defaults.listMode;
    uniqueChordsOnly = defaults.uniqueChordsOnly;
    uniqueBySection = defaults.uniqueBySection;
    insertBlankBoards = defaults.insertBlankBoards;
    revealed = defaults.revealed;
    separator = defaults.separator;
    targetKey = CHORD_SONGS[0].originalKey;
    bassStrings = [...defaults.bassStrings];
    tuning = [...defaults.tuning];
    tuningPreset = defaults.tuningPreset;
    fretCount = defaults.fretCount;
    cardScales = { ...cardScales, board: DEFAULT_CARD_SCALES.board, answer: DEFAULT_CARD_SCALES.answer,
      minimalAppBar: DEFAULT_CARD_SCALES.minimalAppBar };
    saveCardScales(cardScales);
    const settings = { ...cardSettingsByDeck };
    for (const song of songs) delete settings[`Chord positions: ${song.id}`];
    cardSettingsByDeck = settings;
    saveCardSettingsByDeck(settings);
    minorNotation = defaults.minorNotation;
    highlightAnnotations = defaults.highlightAnnotations;
    chartZoom = defaults.chartZoom;
    viewRevision++;
    saveChordProgress(defaults);
  }
  const sourceChords = $derived(selectedSong.chords.map(chord => describeChord(chord, selectedSong.originalKey, targetKey, selectedSong.id.startsWith("ireal-"))));
  const entries = $derived(practiceEntries(selectedSong.id, selectedSong.chords.length));
  const songChords = $derived(
    entries.map((entry, index) => ({
      ...sourceChords[entry.chordIndex],
      annotation: practiceAnnotation(selectedSong.id, index),
      sourceIndices: [index],
    })),
  );
  const sourceSymbols = $derived(sourceChords.map(chord => chord.symbol));
  const listChords = $derived(uniqueChordsOnly
    ? uniqueAnnotatedChords(songChords, uniqueBySection ? songChords.flatMap((chord, i) => chord.annotation.section !== songChords[i - 1]?.annotation.section ? [i] : []) : [])
    : songChords);
  let fretCount = $state(savedProgress.fretCount);
  let tuningPreset = $state(savedProgress.tuningPreset);
  let tuning = $state<number[]>([...savedProgress.tuning]);
  const instrumentLabel = $derived(`${matchingPreset(tuning, tuningPreset)?.instrument ?? "Custom"} · ${tuning.length} strings`);
  let bassStrings = $state<number[]>([...savedProgress.bassStrings]);
  let actionsOpen = $state(
    untrack(() => deckActionsFromHistoryState(history.state) === settingsId),
  );
  let positioning = $state(
    untrack(
      () => cardLayoutFromHistoryState(history.state) === settingsId,
    ),
  );
  let cardScales = $state<CardScales>(loadCardScales());
  let cardSettingsByDeck = $state<CardSettingsByDeck>(
    loadCardSettingsByDeck(),
  );
  const cardSettings = $derived(
    deckCardSettings(cardSettingsByDeck, settingsId),
  );
  const rotation = $derived(cardSettings.rotation);
  const answerAnchor = $derived(cardSettings.answerAnchor);
  const answerPlace = $derived(answerAnchorParts(answerAnchor));
  const answerTurn = $derived.by(() => {
    if (answerPlace.edge !== "left" && answerPlace.edge !== "right") return 0;
    if (rotation === 90 || rotation === -90) return rotation;
    return answerPlace.edge === "left" ? 90 : -90;
  });
  let screenElement = $state<HTMLElement>();
  let cardElement = $state<HTMLElement>();
  let arranged = $state<"board" | "text" | "answer" | null>(null);
  const cardSizes = $derived([{
    label: "Answer size",
    value: formatCardScale(cardScales.answer),
    onstep: (steps: 1 | -1) => setScale("answer", stepCardScale(cardScales.answer, steps)),
  }]);
  const current = $derived(songChords[index]);
  const nextChord = $derived(songChords[index + 1] ?? null);
  const canGoBack = $derived(
    !separator && (insertBlankBoards || index > 0),
  );
  const canGoForward = $derived(
    separator || !revealed || index < songChords.length - 1,
  );

  function setScale(kind: CardScaleKind, scale: CardScale, save = true): void {
    cardScales = { ...cardScales, [kind]: scale };
    if (save) saveCardScales(cardScales);
  }

  function setCardSettings(changes: Partial<DeckCardSettings>, save = true): void {
    cardSettingsByDeck = withDeckCardSettings(cardSettingsByDeck, settingsId, {
      ...cardSettings,
      ...changes,
    });
    if (save) saveCardSettingsByDeck(cardSettingsByDeck);
  }

  function settleCardParts(): void {
    saveCardScales(cardScales);
    saveCardSettingsByDeck(cardSettingsByDeck);
  }

  function turnCard(steps: 1 | -1): void {
    setCardSettings({ rotation: stepCardRotation(rotation, steps) });
  }

  function partOptions(part: "board" | "text") {
    return {
      enabled: positioning,
      area: cardElement,
      rotation,
      offset: cardSettings.offsets[part],
      scale: part === "board" ? (cardScales.board === SCREEN_WIDTH ? 1 : cardScales.board) : cardSettings.text,
      onmove: (offset: CardOffset) => {
        arranged = part;
        setCardSettings({ offsets: { ...cardSettings.offsets, [part]: offset } }, false);
      },
      onscale: (scale: number) => {
        arranged = part;
        if (part === "board") setScale("board", scale, false);
        else setCardSettings({ text: scale }, false);
      },
      onturn: turnCard,
      onsettle: settleCardParts,
    };
  }

  function resetCardParts(): void {
    arranged = null;
    setCardSettings({ offsets: DEFAULT_CARD_OFFSETS, text: DEFAULT_DECK_CARD_SETTINGS.text,
      rotation: 0, answerAnchor: DEFAULT_DECK_CARD_SETTINGS.answerAnchor });
    setScale("board", DEFAULT_CARD_SCALES.board);
  }

  function startAnswerDrag(event: PointerEvent): void {
    if (!positioning) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
    dragAnswerTo(event);
  }

  function dragAnswerTo(event: PointerEvent): void {
    if (!positioning || !screenElement || !(event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) return;
    const box = screenElement.getBoundingClientRect();
    arranged = "answer";
    setCardSettings({ answerAnchor: answerAnchorAt(
      { x: event.clientX - box.left, y: event.clientY - box.top }, box,
    ) }, false);
  }

  function sound(semitones: readonly number[]): void {
    if (!positioning && cardSettings.sound && semitones.length > 0) playSemitones(semitones, "guitar");
  }

  function playChord(): void {
    if (!separator && revealed) sound(chordSemitones(current));
  }

  function playFret(string: number, fret: number): void {
    const semitone = fretPitch(tuning, string, fret);
    if (semitone !== null) sound([semitone]);
  }

  function toggleMinimalAppBar(): void {
    cardScales = { ...cardScales, minimalAppBar: !cardScales.minimalAppBar };
    saveCardScales(cardScales);
  }

  function openActions(): void {
    history.pushState(
      historyStateForDeckActions(history.state, settingsId),
      "",
    );
    actionsOpen = true;
  }

  function closeActions(): void {
    if (!actionsOpen) return;
    actionsOpen = false;
    if (deckActionsFromHistoryState(history.state) === settingsId) {
      history.back();
    }
  }

  function openCardLayout(): void {
    const state = historyStateForCardLayout(
      historyStateForDeckActions(history.state, null),
      settingsId,
    );
    if (actionsOpen) history.replaceState(state, "");
    else history.pushState(state, "");
    actionsOpen = false;
    arranged = null;
    positioning = true;
  }

  function closeCardLayout(): void {
    settleCardParts();
    positioning = false;
    if (cardLayoutFromHistoryState(history.state) === settingsId) history.back();
  }

  function handlePopState(event: PopStateEvent): void {
    actionsOpen = deckActionsFromHistoryState(event.state) === settingsId;
    positioning =
      cardLayoutFromHistoryState(event.state) === settingsId;
  }

  function goBack(): void {
    if (positioning || !canGoBack) return;
    if (revealed) {
      if (insertBlankBoards) {
        revealed = false;
      } else {
        index -= 1;
      }
    } else if (index === 0) {
      separator = true;
    } else {
      index -= 1;
      revealed = true;
    }
    playChord();
  }

  function goForward(): void {
    if (positioning || !canGoForward) return;
    if (separator) {
      separator = false;
      revealed = !insertBlankBoards;
    } else if (!revealed) {
      revealed = true;
    } else if (index < songChords.length - 1) {
      index += 1;
      revealed = !insertBlankBoards;
    }
    playChord();
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.repeat || libraryOpen || importOpen || instrumentOpen) return;
    if (positioning) {
      if (event.key === "Escape") closeCardLayout();
      return;
    }
    if (actionsOpen) {
      if (event.key === "Escape") closeActions();
      return;
    }
    const target = event.target as HTMLElement | null;
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      target?.closest('dialog') || target?.isContentEditable === true ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName ?? "")
    ) {
      return;
    }
    else if (!listMode && event.key === "ArrowLeft" && canGoBack) goBack();
    else if (!listMode && event.key === "ArrowRight" && canGoForward) goForward();
    else return;
    event.preventDefault();
  }


  function selectSong(song: ChordSong, restoring = false): void {
    songId = song.id;
    targetKey = savedProgress.keys[song.id] ?? song.originalKey;
    index = savedProgress.positions[song.id] ?? 0;
    if (!restoring) {
      separator = insertBlankBoards && index === 0;
      revealed = !insertBlankBoards;
    }
  }

  function selectScore(indexValue: number): void {
    index = indexValue; separator = false; revealed = true;
  }

  function updateChordNumber(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (Number.isFinite(input.valueAsNumber)) {
      const minimum = insertBlankBoards ? 0 : 1;
      const number = Math.min(
        songChords.length,
        Math.max(minimum, Math.round(input.valueAsNumber)),
      );
      index = Math.max(0, number - 1);
      separator = number === 0;
      revealed = !insertBlankBoards;
    }
    input.value = String(separator ? 0 : index + 1);
  }

  function toggleBlankBoards(): void {
    insertBlankBoards = !insertBlankBoards;
    if (!insertBlankBoards) {
      separator = false;
      revealed = true;
    }
  }
</script>

<svelte:window onbeforeprint={beforePrint} onafterprint={afterPrint} onkeydown={handleKey} onpopstate={handlePopState} />

{#key viewRevision}
<div class="practice-screen" data-chord-practice bind:this={screenElement}>
  <header class="appbar" class:minimal={cardScales.minimalAppBar && !listMode}>
    <div class="titles">
      <h1 aria-label={selectedSong.title}><button class="song-trigger" title={selectedSong.title} aria-label="Choose song" aria-haspopup="dialog" aria-expanded={libraryOpen} aria-controls="song-library" disabled={!libraryReady || positioning} onclick={() => libraryOpen = !libraryOpen}><span class="song-title">{selectedSong.title}</span><span aria-hidden="true">⌄</span></button></h1>
      <p class="song-meta">{[selectedSong.artist, songStyle].filter(Boolean).join(" · ")}</p>
    </div>
      <button class="favorite" aria-pressed={isFavorite} aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"} onclick={toggleFavorite} title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
        <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
      </button>
    <button
      class="appbar-action"
      title="Settings"
      aria-label="Chord practice settings"
      onclick={openActions}
    >
      <span aria-hidden="true">⋮</span>
    </button>
  </header>

  {#if !positioning && libraryReady}
    <dialog class="library-toolbar" id="song-library" bind:this={libraryDialog} onclose={() => libraryOpen = false} aria-labelledby="library-title">
    <div class="library-heading"><h2 id="library-title">Choose song</h2><button aria-label="Close song library" onclick={() => libraryOpen = false}>×</button></div>
    <div class="library-controls">
      <input class="song-search" aria-label="Search songs" placeholder="Search songs" type="search" bind:value={songSearch} />
      <SongPicker songs={matchingSongs} selected={selectedSong} onselect={(song) => { selectSong(song); libraryOpen = false; }} />


    </div>
    <div class="library-filters">
      <label class="library-sort">Sort by
      <select aria-label="Sort songs" bind:value={songSort}>
        <option value="title">Title</option><option value="artist">Artist</option><option value="import">Import order</option>
      </select>
      </label>
      <select aria-label="Playlist" bind:value={playlistFilter}>
        <option value="">All playlists</option><option value="examples">Built-in examples</option>
        {#each playlists as playlist}<option value={'playlist:' + playlist}>{playlist || 'Unlisted imports'}</option>{/each}
      </select>
      <select aria-label="Style" bind:value={styleFilter}>
        <option value="">All styles</option>
        {#each styles as style}<option value={style}>{style}</option>{/each}
      </select>
    </div>
    <div class="library-secondary">
      <button aria-pressed={favoritesOnly} onclick={toggleFavoritesOnly}>Favorites only ({favoriteSongs.length})</button>
      <span class="song-count">{matchingSongs.length} songs</span>
      {#if songSearch || playlistFilter || styleFilter || favoritesOnly}<button onclick={() => { songSearch = ''; playlistFilter = ''; styleFilter = ''; favoritesOnly = false; }}>Clear filters</button>{/if}
      {#if !matchingSongs.length && (!favoritesOnly || favoriteSongs.length)}<span role="status">No matching songs.</span>{/if}
      <ChordImport onimport={importSongs} bind:open={importOpen} />
      <ChordExport song={importedById.get(selectedSong.id)} songs={importedSongs} />
      {#if favoritesOnly && !favoriteSongs.length}<span role="status">No favorites yet.</span>{/if}
    </div>
    </dialog>
  {/if}
  {#if libraryError}<p role="alert">{libraryError}</p>{/if}
  {#if !libraryReady}<p role="status">Loading saved charts…</p>{/if}

  {#if !positioning}
    <div class="mode-picker">
    <div class="pickers">
      <label class="picker">
        <span>Key</span>
        <select bind:value={targetKey} aria-label="Song key">
          {#each PRACTICE_KEYS as key}
            <option value={key}>{key}</option>
          {/each}
        </select>
      </label>

    </div>

      <button class="instrument-trigger" aria-label="Instrument settings" title={instrumentLabel} onclick={() => instrumentOpen = true}>{instrumentLabel}</button>
      <div class="view-switch" role="group" aria-label="View mode"><button aria-pressed={!listMode} onclick={() => listMode = false}>Practice</button><button aria-pressed={listMode} onclick={() => listMode = true}>List</button></div>
        {#if listMode}
          <div class="node list-options">
            <button class="sub" aria-pressed={uniqueChordsOnly} onclick={() => uniqueChordsOnly = !uniqueChordsOnly}>Unique chords</button>
            {#if uniqueChordsOnly}
              <div class="node">
                <button class="sub" aria-pressed={uniqueBySection} onclick={() => uniqueBySection = !uniqueBySection}>By section</button>
              </div>
            {/if}
          </div>
        {/if}
    </div>
  {/if}

  {#if listMode}
    {#key `${songId}:${uniqueScope}`}
      <ChordList
        chords={listChords}
        {songId}
        {sourceSymbols}
        bind:sourceIndex={() => index, (value) => { index = value; separator = false; revealed = true; }}
        comments={songComments(selectedSong.id)}
        {uniqueChordsOnly}
        {uniqueBySection}
        {fretCount}
        {tuning}
        bind:bassStrings
        soundEnabled={cardSettings.sound}
        shortcutsEnabled={!actionsOpen && !positioning && !libraryOpen && !importOpen && !instrumentOpen}
        onplay={(chord) => sound(chordSemitones(chord))}
        onplayfret={playFret}
      />
    {/key}
  {:else}
  <main class="card-area">
    <div
      class="card-rotator"
      class:clockwise={rotation === 90}
      class:anticlockwise={rotation === -90}
      class:upside-down={rotation === 180}
    >
      <div class="card-turn" bind:this={cardElement}
        style:--text-x={cardSettings.offsets.text.x}
        style:--text-y={cardSettings.offsets.text.y}
        style:--text-scale={cardSettings.text}
        style:--board-x={cardSettings.offsets.board.x}
        style:--board-y={cardSettings.offsets.board.y}
        class:positioning>
        <div class="practice-content" use:remember={viewKey("practice-scroll")}>
          <ChordMetadata annotation={{ comments: songComments(selectedSong.id) }} label="Song comments" />
          <SongSource {songId} symbols={sourceSymbols} bind:open={fullChartOpen} onselect={selectScore} selected={separator ? [] : [index]} />
          {#if !separator}<ChordMetadata annotation={current.annotation} />{/if}
          {#if !separator && !fullChartOpen}<ChordSource {songId} onselect={selectScore} indices={[index]} symbols={sourceSymbols} />{/if}
          <div class="question-heading text-part" use:arrangePart={partOptions("text")} role="group" aria-label="Chord name placement">
            <h2>{separator ? "No chord" : current.symbol}</h2>
            <label class="progress">
              <input
                type="number"
                min={insertBlankBoards ? 0 : 1}
                max={songChords.length}
                value={separator ? 0 : index + 1}
                aria-label="Chord number"
                onchange={updateChordNumber}
              />
              <span>/ {songChords.length}</span>
            </label>
            {#if !separator && revealed && !current.noChord}<button class="play-chord" disabled={!cardSettings.sound || positioning} onclick={playChord}>Play chord</button>{/if}
          </div>

          <div class="board-part" use:arrangePart={partOptions("board")} role="group" aria-label="Fretboard placement">
          <ChordFretboard
            chord={current}
            {fretCount}
            {bassStrings}
            {tuning}
            revealed={revealed && !separator}
            bind:scale={() => cardScales.board, value => setScale("board", value)}
            interactive={!positioning}
            onplay={playFret}
          />
          </div>

          <section
            class="answer text-part"
            use:arrangePart={partOptions("text")}

            aria-label="Answer placement"
            aria-live="polite"
            style:--answer-scale={cardScales.answer}
          >
            {#if separator}
              <p class="next-chord">
                Next: <strong>{current.symbol}</strong>
              </p>
            {:else if revealed}
              {#if current.noChord}
                <p class="no-chord">No chord tones</p>
              {:else}
                <ChordTones chord={current} />
              {/if}
              <p class="next-chord">
                {#if nextChord}
                  Next: <strong>{nextChord.symbol}</strong>
                {:else}
                  Last chord
                {/if}
              </p>
            {:else}
              <p class="prompt">
                Recall the chord tones on the fretboard, then press → to reveal the answer.
              </p>
            {/if}
          </section>
        </div>
      </div>
    </div>
    {#if positioning}
      <div class="laying-out" class:high={answerPlace.edge === "bottom" || answerPlace.end === "bottom"} role="group" aria-label="Arrange card">
        <p>{arranged === "answer" ? ANSWER_ANCHOR_LABELS[answerAnchor] : "Drag to move; pinch or scroll to resize"}</p>
        <button aria-label="Rotate anticlockwise" title={ROTATION_LABELS[rotation]} onclick={() => turnCard(-1)}>⟲</button>
        <button aria-label="Rotate clockwise" title={ROTATION_LABELS[rotation]} onclick={() => turnCard(1)}>⟳</button>
        <button onclick={() => setScale("board", SCREEN_WIDTH)}>Screen width</button>
        <button onclick={resetCardParts}>Reset</button>
        <button onclick={closeCardLayout}>DONE</button>
      </div>
    {/if}
  </main>

  <nav
    class="step-buttons"
    class:arranging={positioning}
    onpointerdown={startAnswerDrag}
    onpointermove={dragAnswerTo}
    onpointerup={settleCardParts}
    onpointercancel={settleCardParts}
    class:anchored={answerAnchor !== "bottom"}
    class:edge-bottom={answerPlace.edge === "bottom"}
    class:edge-top={answerPlace.edge === "top"}
    class:edge-left={answerPlace.edge === "left"}
    class:edge-right={answerPlace.edge === "right"}
    class:end-top={answerPlace.end === "top"}
    class:end-bottom={answerPlace.end === "bottom"}
    class:end-left={answerPlace.end === "left"}
    class:end-right={answerPlace.end === "right"}
    class:full={answerPlace.end === undefined}
    class:turned={answerTurn !== 0}
    class:anticlockwise={answerTurn === -90}
    aria-label="Chord practice navigation"
  >
    <div class="step-button-group">
      <button
        class="previous"
        disabled={!canGoBack}
        aria-label="Previous screen"
        onclick={goBack}
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        class="next"
        disabled={!canGoForward}
        aria-label={separator
          ? `Next chord ${current.symbol}`
          : revealed
            ? "Next screen"
            : "Show answer"}
        onclick={goForward}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  </nav>
  {/if}
</div>

{#if instrumentOpen}
  <InstrumentSettings bind:tuning bind:tuningPreset bind:bassStrings onclose={() => instrumentOpen = false} />
{/if}
{#if actionsOpen}
  <ChordSettings
    deckLabel={selectedSong.title}
    onreset={() => { closeActions(); resetProgress(); }}
    ondelete={importedSongs.some(song => song.id === songId) ? () => { closeActions(); void removeSong(); } : undefined}
    arrange={listMode ? undefined : { onopen: openCardLayout }}
    sizes={[{ label: "Frets", value: String(fretCount), onstep: step => fretCount = clampFretCount(fretCount + step) }, ...(!listMode ? cardSizes : [])]}
    switches={[
      { label: "Insert blank fretboards between chords", on: insertBlankBoards, ontoggle: toggleBlankBoards },
      { label: "Sound", on: cardSettings.sound, ontoggle: () => setCardSettings({ sound: !cardSettings.sound }) },
      ...(!listMode ? [{
        label: "Minimize app bar",
        on: cardScales.minimalAppBar,
        ontoggle: toggleMinimalAppBar,
      }] : []),
    ]}
    onclose={closeActions}
  />
{/if}
{/key}


<style>
  .song-trigger { display: flex; align-items: center; gap: 8px; max-width: 100%; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .song-trigger .song-title { overflow-wrap: anywhere; white-space: normal; line-height: 1.25; font: inherit; color: inherit; }
  .song-trigger span { font-size: 16px; color: var(--on-surface-muted); }
  .instrument-trigger { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: auto; }
  button:focus-visible { outline: 2px solid var(--text-accent); outline-offset: 2px; }
  button:disabled { opacity: 0.45; cursor: default; }
  .mode-picker button:hover, .play-chord:hover { background: color-mix(in srgb, var(--on-surface) 6%, var(--surface)); }

  .library-toolbar { width: min(600px, calc(100vw - 24px)); max-height: 85dvh; box-sizing: border-box; padding: 20px; border: 1px solid var(--divider); border-radius: 12px; background: var(--surface); color: var(--on-surface); }
  .library-toolbar::backdrop { background: #0008; }
  .library-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .library-heading h2 { margin: 0; font-size: 20px; }
  .library-heading button { border: 0; background: transparent; color: inherit; font-size: 24px; cursor: pointer; }
  .library-controls { display: grid; grid-template-columns: minmax(0, 1fr); align-items: center; gap: 8px; }
  .library-controls input { box-sizing: border-box; width: 100%; min-width: 0; height: 40px; padding: 8px; border: 1px solid var(--divider); border-radius: 6px; background: var(--surface); color: var(--on-surface); font: inherit; font-size: 14px; }
  .library-secondary { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 6px; font-size: 12px; }
  .library-filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; margin-top: 8px; }
  .library-sort { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--on-surface-muted); }
  .library-filters select { max-width: 100%; min-width: 0; padding: 6px; border: 1px solid var(--divider); border-radius: 6px; background: var(--surface); color: var(--on-surface); font: inherit; }
  .library-secondary button, .favorite { border: 0; background: transparent; color: var(--on-surface-muted); cursor: pointer; padding: 8px 0; }
  .library-secondary button[aria-pressed="true"] { color: var(--text-accent); }
  .song-count { color: var(--on-surface-muted); }
  .favorite { min-height: 40px; font-size: 26px; }
  .favorite[aria-pressed="true"] { color: #d79513; }
  .song-meta { margin: 4px 0 0; font-size: 12px; color: var(--on-surface-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mode-picker { flex: none; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 8px 16px; }
  .list-options { grid-column: 1 / -1; justify-content: flex-end; }
  .mode-picker button { min-height: 40px; padding: 8px 12px; border: 1px solid var(--divider); border-radius: 6px; color: var(--on-surface-muted); background: transparent; font: inherit; font-size: 14px; cursor: pointer; }
  .mode-picker button[aria-pressed="true"] { border-color: transparent; color: var(--text-accent); background: color-mix(in srgb, var(--text-accent) 8%, transparent); }
  .view-switch { display: flex; padding: 3px; border-radius: 8px; background: color-mix(in srgb, var(--on-surface) 6%, transparent); }
  .view-switch button { border: 0; }
  .node { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .board-part { translate: calc(var(--board-x) * 100cqw) calc(var(--board-y) * 100cqh); }
  .text-part {
    translate: calc(var(--text-x) * 100cqw) calc(var(--text-y) * 100cqh);
    scale: var(--text-scale);
    transform-origin: top left;
  }
  .positioning .board-part, .positioning .text-part {
    outline: 2px dashed var(--primary);
    cursor: move;
    touch-action: none;
    user-select: none;
  }
  .positioning .board-part :global(*), .positioning .text-part :global(*) { pointer-events: none; }
  .positioning .practice-content { overflow: hidden; }
  .step-buttons.arranging { touch-action: none; cursor: move; outline: 2px dashed var(--primary); }
  .step-buttons.arranging > * { pointer-events: none; }
  .card-area { position: relative; }
  .laying-out {
    position: absolute; z-index: 5; bottom: 12px; left: 12px; right: 12px;
    display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    padding: 10px; border-radius: 10px; background: var(--surface); box-shadow: 0 2px 12px #0004;
  }
  .laying-out.high { top: 12px; bottom: auto; }
  .laying-out p { flex: 1 1 100%; margin: 0; font-size: 12px; }
  .laying-out button, .play-chord { padding: 8px 12px; color: var(--on-surface); background: var(--surface); border: 1px solid var(--divider); border-radius: 6px; }

  .practice-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    --minimal-bar: 36px;
    --app-bar: 64px;
    background: var(--bg);
  }

  .appbar {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 64px;
    padding: 12px 16px;
    background: var(--surface);
    color: var(--on-surface);
    border-bottom: 1px solid var(--divider);
    flex: none;
  }

  .appbar.minimal {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 5;
    min-height: var(--minimal-bar);
    height: var(--minimal-bar);
    padding: 0;
    background: transparent;
    box-shadow: none;
    pointer-events: none;
  }

  .appbar.minimal .titles,
  .appbar.minimal .favorite {
    visibility: hidden;
  }

  .appbar.minimal .appbar-action {
    width: var(--minimal-bar);
    height: var(--minimal-bar);
    background: rgb(0 0 0 / 0.4);
    color: #fff;
    font-size: 17px;
    pointer-events: auto;
  }

  .appbar.minimal ~ .step-buttons {
    --app-bar: var(--minimal-bar);
  }

  .appbar-action {
    width: 48px;
    height: 48px;
    flex: none;
    border-radius: 50%;
    color: inherit;
    font-size: 22px;
  }


  .appbar-action:hover,
  .appbar-action:focus-visible {
    background: rgb(255 255 255 / 0.12);
  }

  .titles {
    flex: 1;
    min-width: 0;
  }

  .titles h1 {
    margin: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .titles h1 {
    font-size: 24px;
    font-weight: 650;
  }


  .pickers {
    display: flex;
    align-items: end;
    gap: 6px;
  }

  .picker {
    display: grid;
    gap: 2px;
    color: inherit;
    font-size: 10px;
  }

  .picker select {
    height: 31px;
    min-width: 68px;
    padding: 5px 22px 5px 8px;
    border: 1px solid var(--divider);
    border-radius: 4px;
    background: var(--surface);
    color: inherit;
    font: inherit;
    font-size: 15px;
  }


  .picker option {
    background: var(--surface);
    color: var(--on-surface);
  }

  .card-area {
    flex: 1;
    min-height: 0;
    background: var(--bg);
  }

  .card-rotator {
    position: relative;
    width: 100%;
    height: 100%;
    container-type: size;
    overflow: hidden;
  }

  .card-turn {
    container-type: size;
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
  }


  .practice-content {
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px 16px 28px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
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

  .card-rotator.upside-down .card-turn {
    rotate: 180deg;
  }

  .card-rotator.anticlockwise .card-turn {
    rotate: -90deg;
  }




  .question-heading {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    min-height: 64px;
    padding-bottom: 8px;
  }

  .question-heading h2 {
    margin: 0;
    font-size: clamp(28px, 6vw, 44px);
    font-weight: 500;
    letter-spacing: -0.025em;
  }

  .progress {
    margin: 0;
    color: var(--on-surface-muted);
    font-size: 12px;
    letter-spacing: 0.08em;
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 4px;
    font-variant-numeric: tabular-nums;
  }

  .progress input {
    width: 48px;
    height: 28px;
    padding: 2px 4px;
    border: 1px solid var(--divider);
    border-radius: 4px;
    background: var(--surface);
    color: var(--on-surface);
    font: inherit;
    font-size: 14px;
    text-align: right;
  }

  .question-heading .play-chord { min-height: 40px; }

  .answer {
    min-height: calc(112px * var(--answer-scale));
    padding-top: calc(18px * var(--answer-scale));
    font-size: calc(16px * var(--answer-scale));
  }

  .next-chord,
  .prompt,
  .no-chord {
    margin: 18px 0 0;
    text-align: center;
  }

  .next-chord,
  .prompt {
    color: var(--on-surface-muted);
    font-size: 0.875em;
  }

  .next-chord strong {
    color: var(--on-surface);
    font-size: 1.125em;
  }

  .no-chord {
    color: var(--on-surface);
    font-size: 1.125em;
  }

  .step-buttons {
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--divider);
    border-top: 1px solid var(--divider);
    flex: none;
  }

  .step-button-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
  }

  .step-buttons button {
    width: 100%;
    min-height: 64px;
    background: var(--surface);
    color: var(--count-new);
    font-size: 34px;
    font-weight: 500;
  }

  .step-buttons button:hover:not(:disabled),
  .step-buttons button:focus-visible:not(:disabled) {
    filter: brightness(0.96);
  }

  .step-buttons button:disabled {
    color: var(--count-zero);
    cursor: default;
    opacity: 0.45;
  }

  .step-buttons.anchored {
    position: absolute;
    top: var(--app-bar);
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 5;
    display: flex;
    padding: 8px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    background: transparent;
    border: none;
    pointer-events: none;
  }

  .step-buttons.anchored .step-button-group {
    flex: none;
    overflow: hidden;
    border-radius: 14px;
    background: rgb(0 0 0 / 0.4);
    pointer-events: auto;
  }

  .step-buttons.anchored button {
    width: 64px;
    min-height: 56px;
    background: rgb(0 0 0 / 0.4);
    color: #fff;
  }

  .step-buttons.anchored button:disabled {
    color: rgb(255 255 255 / 0.4);
  }

  .step-buttons.edge-bottom {
    align-items: flex-end;
  }

  .step-buttons.edge-top {
    align-items: flex-start;
  }

  .step-buttons.edge-bottom.end-left,
  .step-buttons.edge-top.end-left {
    justify-content: flex-start;
  }

  .step-buttons.edge-bottom.end-right,
  .step-buttons.edge-top.end-right {
    justify-content: flex-end;
  }

  .step-buttons.edge-left,
  .step-buttons.edge-right {
    align-items: stretch;
  }

  .step-buttons.edge-left {
    justify-content: flex-start;
  }

  .step-buttons.edge-right {
    justify-content: flex-end;
  }

  .step-buttons.edge-left .step-button-group,
  .step-buttons.edge-right .step-button-group {
    display: flex;
    flex-direction: column;
  }

  .step-buttons.edge-left.end-top .step-button-group,
  .step-buttons.edge-right.end-top .step-button-group {
    align-self: flex-start;
  }

  .step-buttons.edge-left.end-bottom .step-button-group,
  .step-buttons.edge-right.end-bottom .step-button-group {
    align-self: flex-end;
  }

  .step-buttons.edge-left.full .step-button-group,
  .step-buttons.edge-right.full .step-button-group {
    height: 100%;
  }

  .step-buttons.edge-left.full button,
  .step-buttons.edge-right.full button {
    flex: 1;
  }

  .step-buttons.turned .step-button-group span {
    display: block;
    rotate: 90deg;
  }

  .step-buttons.turned.anticlockwise .step-button-group span {
    rotate: -90deg;
  }

  @media (max-width: 480px) {
    .practice-content {
      padding-inline: 10px;
    }

    .titles h1 {
      font-size: 20px;
    }

    .question-heading {
      min-height: 78px;
    }

    .prompt {
      font-size: 13px;
    }
  }
</style>
