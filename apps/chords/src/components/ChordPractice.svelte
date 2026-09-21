<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onMount, onDestroy, getAllContexts, setContext, untrack } from "svelte";
  import { CHORD_VIEW_CONTEXT, chordViewPersistence, type ChordViewStore } from "../lib/chord-view";

  import { matchingPreset } from "../lib/tuning";
  import { fretPitch } from "@web-music/practice-ui/guitar";
  import { chordSemitones } from "../lib/chord-audio";
  import { playSemitones } from "@web-music/practice-ui/tones";
  import ChordFretboard from "./ChordFretboard.svelte";
  import ChordList from "./ChordList.svelte";
  import ChordTones from "./ChordTones.svelte";
  import ChordMetadata from "./ChordMetadata.svelte";
  import { headingChord } from "../lib/ireal-layout";
  import { chordDegree } from "../lib/chord-degree";
  import { type AnnotatedChord, practiceAnnotation, practiceEntries, chordLyric, sectionStarts, uniqueAnnotatedChords, setImportedMetadata, songScore } from "../lib/chord-metadata";
  import { irealLabel } from "../lib/ireal-labels";
  import { prepareChartPrint } from "../lib/chart-print";
  import SongPicker from "./SongPicker.svelte";
  import SongSource from "./SongSource.svelte";
  import ChordSource from "./ChordSource.svelte";
  import ChordSettings from "./ChordSettings.svelte";
  import InstrumentSettings from "./InstrumentSettings.svelte";
  import { CHORD_SONGS, type ChordSong } from "../lib/chord-songs";
  import ChordExport from "./ChordExport.svelte";
  import ChartEditor from "./ChartEditor.svelte";
  import { loadImportedSongs, saveImportedSongs, deleteImportedSong, type ImportedSong } from "../lib/chord-import";
  import { CUSTOM_PLAYLIST } from "../lib/custom-chart";
  import { CHORDWIKI_PLAYLIST } from "../lib/chordwiki-import";
  import { loadChordFavorites, saveChordFavorites } from "../lib/chord-favorites";

  import { defaultChordProgress, loadChordProgress, saveChordProgress, type ChordNaming } from "../lib/chord-progress";
  import {
    DEFAULT_CARD_SCALES,
    deckCardSettings,
    formatCardScale,
    loadCardScales,
    loadCardSettingsByDeck,
    saveCardScales,
    saveCardSettingsByDeck,
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
  import { describeChord, PRACTICE_KEYS, transposeChordSymbol } from "../lib/chords";
  import {
    deckActionsFromHistoryState,
    historyStateForDeckActions,
  } from "@web-music/practice-ui/navigation";

  let importedSongs = $state<ImportedSong[]>([]);
  const songs = $derived([...CHORD_SONGS, ...importedSongs]);
  let libraryReady = $state(false);
  let libraryError = $state("");
  let songSearch = $state("");
  let songSort = $state("title");
  let playlistFilter = $state("");
  const importedById = $derived(new Map(importedSongs.map(song => [song.id, song])));
  // Playlists in the filter: the charts written here, then ChordWiki, then
  // iReal playlists by name, with iReal songs that came without one last.
  function playlistRank(playlist: string): number {
    return playlist === CUSTOM_PLAYLIST ? 0 : playlist === CHORDWIKI_PLAYLIST ? 1 : playlist ? 2 : 3;
  }
  const playlists = $derived([...new Set(importedSongs.map(song => song.playlist))].sort((a, b) => playlistRank(a) - playlistRank(b) || a.localeCompare(b)));
  const songStyles = $derived(new Map(importedSongs.map(song => [song.id, song.metadata.score.fields.find(field => irealLabel(field.label) === 'Style')?.value ?? ""])));
  // How many songs each playlist holds, shown in its option; the counts
  // ignore the other filters.
  const playlistCounts = $derived(new Map(playlists.map(playlist => [playlist, importedSongs.filter(song => song.playlist === playlist).length])));
  const searchText = $derived(songSearch.toLocaleLowerCase());
  function matchesLibrary(song: ChordSong): boolean {
    const imported = importedById.get(song.id);
    return (!playlistFilter || (playlistFilter === 'examples' ? !imported : !!imported && 'playlist:' + imported.playlist === playlistFilter)) &&
      (song.title + " " + song.artist).toLocaleLowerCase().includes(searchText);
  }
  let favoriteIds = $state(loadChordFavorites());
  const titleCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
  const artistCollator = new Intl.Collator('en', { sensitivity: 'base' });
  // Sorted once per sort key; the filters below keep that order.
  const sortedSongs = $derived([...songs].sort((a, b) => {
    const titleOrder = titleCollator.compare(a.title, b.title) || a.id.localeCompare(b.id);
    if (songSort === 'artist') return artistCollator.compare(a.artist, b.artist) || titleOrder;
    if (songSort === 'import') return (importedById.get(a.id)?.importedAt ?? 0) - (importedById.get(b.id)?.importedAt ?? 0) || titleOrder;
    return titleOrder;
  }));
  const matchingSongs = $derived(sortedSongs.filter(matchesLibrary));

  function toggleFavorite() {
    const next = isFavorite ? favoriteIds.filter(id => id !== selectedSong.id) : [...favoriteIds, selectedSong.id];
    try {
      saveChordFavorites(next);
      favoriteIds = next;
    } catch { libraryError = "Could not save favorites. Check your browser storage settings."; }
  }

  onMount(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await loadImportedSongs();
        if (!active) return;
        const available = setLibrary(stored);
        Object.assign(savedProgress, loadChordProgress(available));
        selectSong(available.find(song => song.id === savedProgress.songId) ?? CHORD_SONGS[0]);
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
    playlistFilter = "";
    selectSong(incoming[0]);
  }

  async function removeSong() {
    const removedId = songId;
    try {
      await deleteImportedSong(removedId);
      const available = setLibrary(importedSongs.filter(song => song.id !== removedId));
      if (songId === removedId) selectSong(available[0] ?? CHORD_SONGS[0]);
    } catch { libraryError = "Could not delete the chart."; }
  }

  const savedProgress = loadChordProgress();
  let minorNotation = $state(savedProgress.minorNotation);
  let highlightAnnotations = $state(savedProgress.highlightAnnotations);
  let chordNames = $state(savedProgress.chordNames);
  let chartZoom = $state(savedProgress.chartZoom);
  let viewRevision = $state(0);
  setContext<ChordViewStore>(CHORD_VIEW_CONTEXT, {
    scope: () => `${songId}:${listMode}:${uniqueBySection}`,
    songScope: () => songId,
    views: () => savedProgress.views,
    save: () => saveChordProgress(savedProgress),
    minorNotation: () => minorNotation,
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
    if (score) clearPrint = prepareChartPrint(score, displaySymbols, selectedSong.title, songMeta, printContext, displaySublabels, selectedSong.originalKey, targetKey);
  }
  function afterPrint() { clearPrint(); clearPrint = () => {}; }
  onDestroy(afterPrint);
  const { remember, viewKey } = chordViewPersistence();
  let index = $state(savedProgress.positions[savedProgress.songId] ?? 0);
  let listMode = $state(savedProgress.listMode);
  let uniqueBySection = $state(savedProgress.uniqueBySection);
  let songId = $state(savedProgress.songId);
  const selectedSong = $derived(
    songs.find(({ id }) => id === songId) ?? CHORD_SONGS[0],
  );
  const songMeta = $derived([selectedSong.artist, songStyles.get(selectedSong.id)].filter(Boolean).join(" · "));
  let importOpen = $state(false);
  let chartEditor = $state<{ startNew: () => void; startEdit: () => void; startCopy: () => void; canEdit: () => boolean }>();
  let chordExport = $state<{ show: () => void }>();
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
  // The scale over each chord, kept by the chart's own spelling so it
  // follows the chord through every key.
  let chordScales = $state<Record<string, string>>(savedProgress.scales);
  const scaleKey = (chord: AnnotatedChord) => `${songId}:${chord.sourceSymbol ?? chord.symbol}`;
  const scaleFor = (chord: AnnotatedChord) => chordScales[scaleKey(chord)] ?? "";
  function setChordScale(chord: AnnotatedChord, id: string) {
    if (id) chordScales[scaleKey(chord)] = id; else delete chordScales[scaleKey(chord)];
  }
  $effect(() => {
    if (!libraryReady) return;
    savedProgress.positions[songId] = index;
    savedProgress.keys[songId] = targetKey;
    Object.assign(savedProgress, { songId, listMode, uniqueBySection, minorNotation, highlightAnnotations, chordNames, chartZoom,
      bassStrings: [...bassStrings], tuning: [...tuning], tuningPreset, fretCount, scales: { ...chordScales } });
    saveChordProgress(savedProgress);
  });

  function resetProgress(): void {
    songSearch = "";
    playlistFilter = "";
    const defaults = defaultChordProgress();
    Object.assign(savedProgress, defaults);
    songId = defaults.songId;
    index = 0;
    listMode = defaults.listMode;
    uniqueBySection = defaults.uniqueBySection;
    targetKey = CHORD_SONGS[0].originalKey;
    bassStrings = [...defaults.bassStrings];
    tuning = [...defaults.tuning];
    tuningPreset = defaults.tuningPreset;
    fretCount = defaults.fretCount;
    chordScales = defaults.scales;
    cardScales = { ...cardScales, board: DEFAULT_CARD_SCALES.board, answer: DEFAULT_CARD_SCALES.answer,
      minimalAppBar: DEFAULT_CARD_SCALES.minimalAppBar };
    saveCardScales(cardScales);
    const settings = { ...cardSettingsByDeck };
    for (const song of songs) delete settings[`Chord positions: ${song.id}`];
    cardSettingsByDeck = settings;
    saveCardSettingsByDeck(settings);
    minorNotation = defaults.minorNotation;
    highlightAnnotations = defaults.highlightAnnotations;
    chordNames = defaults.chordNames;
    chartZoom = defaults.chartZoom;
    viewRevision++;
    saveChordProgress(defaults);
  }
  const sourceChords = $derived(selectedSong.chords.map((chord, chordIndex) => {
    const sourceKey = selectedSong.chordKeys?.[chordIndex] ?? selectedSong.originalKey;
    const chordTargetKey = transposeChordSymbol(sourceKey, selectedSong.originalKey, targetKey);
    return describeChord(chord, sourceKey, chordTargetKey, /^(ireal|chordwiki)-/.test(selectedSong.id));
  }));
  const entries = $derived(practiceEntries(selectedSong.id, selectedSong.chords.length));
  // Under the chord's name, the words it is sung on, when the chart has them.
  const lyric = $derived(chordLyric(selectedSong.id, index));
  const songChords = $derived(
    entries.map((entry, index) => ({
      ...sourceChords[entry.chordIndex],
      annotation: practiceAnnotation(selectedSong.id, index),
      sourceIndices: [index],
      sourceSymbol: selectedSong.chords[entry.chordIndex],
    })),
  );
  const sourceSymbols = $derived(sourceChords.map(chord => chord.symbol));
  // What the charts and headings call each chord: its name, its degree in
  // the key being practised, or the name with the degree in small under it.
  const degreeOf = (symbol: string) => chordDegree(symbol, targetKey, minorNotation);
  const displaySymbols = $derived(chordNames === "degrees" ? sourceSymbols.map(degreeOf) : sourceSymbols);
  const displaySublabels = $derived(chordNames === "both" ? sourceSymbols.map(degreeOf) : undefined);
  const heading = (symbol: string) => chordNames === "degrees" ? degreeOf(symbol) : headingChord(symbol, minorNotation);
  const subheading = (symbol: string) => chordNames === "both" ? degreeOf(symbol) : undefined;
  // A chart with an editor shows its own text there.
  const editableChart = $derived(importedById.get(selectedSong.id)?.customText !== undefined);
  const listChords = $derived(uniqueAnnotatedChords(songChords, uniqueBySection ? sectionStarts(songChords) : []));
  let fretCount = $state(savedProgress.fretCount);
  let tuningPreset = $state(savedProgress.tuningPreset);
  let tuning = $state<number[]>([...savedProgress.tuning]);
  const instrumentLabel = $derived(`${matchingPreset(tuning, tuningPreset)?.instrument ?? "Custom"} · ${tuning.length} strings`);
  let bassStrings = $state<number[]>([...savedProgress.bassStrings]);
  let actionsOpen = $state(
    untrack(() => deckActionsFromHistoryState(history.state) === settingsId),
  );
  let cardScales = $state<CardScales>(loadCardScales());
  let cardSettingsByDeck = $state<CardSettingsByDeck>(
    loadCardSettingsByDeck(),
  );
  const cardSettings = $derived(
    deckCardSettings(cardSettingsByDeck, settingsId),
  );
  const cardSizes = $derived([{
    label: "Answer size",
    value: formatCardScale(cardScales.answer),
    onstep: (steps: 1 | -1) => setScale("answer", stepCardScale(cardScales.answer, steps)),
  }]);
  const current = $derived(songChords[index]);
  const nextChord = $derived(songChords[index + 1] ?? null);
  const canGoBack = $derived(index > 0);
  const canGoForward = $derived(index < songChords.length - 1);

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

  function sound(semitones: readonly number[]): void {
    if (cardSettings.sound && semitones.length > 0) playSemitones(semitones, "guitar");
  }

  function playChord(): void {
    sound(chordSemitones(current));
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

  function handlePopState(event: PopStateEvent): void {
    actionsOpen = deckActionsFromHistoryState(event.state) === settingsId;
  }

  function goBack(): void {
    if (!canGoBack) return;
    index -= 1;
    playChord();
  }

  function goForward(): void {
    if (!canGoForward) return;
    index += 1;
    playChord();
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.repeat || libraryOpen || importOpen || instrumentOpen) return;
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


  function selectSong(song: ChordSong): void {
    songId = song.id;
    targetKey = savedProgress.keys[song.id] ?? song.originalKey;
    index = savedProgress.positions[song.id] ?? 0;
  }

  function selectScore(indexValue: number): void {
    index = indexValue;
    playChord();
  }

  function updateChordNumber(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (Number.isFinite(input.valueAsNumber)) {
      const number = Math.min(songChords.length, Math.max(1, Math.round(input.valueAsNumber)));
      index = Math.max(0, number - 1);
    }
    input.value = String(index + 1);
  }
</script>

<svelte:window onbeforeprint={beforePrint} onafterprint={afterPrint} onkeydown={handleKey} onpopstate={handlePopState} />

{#key viewRevision}
<div class="practice-screen" data-chord-practice>
  <header class="appbar" class:minimal={cardScales.minimalAppBar && !listMode}>
    <div class="titles">
      <h1 aria-label={selectedSong.title}><button class="song-trigger" title={selectedSong.title} aria-label="Choose song" aria-haspopup="dialog" aria-expanded={libraryOpen} aria-controls="song-library" disabled={!libraryReady} onclick={() => libraryOpen = !libraryOpen}><span class="song-title">{selectedSong.title}</span><span aria-hidden="true">⌄</span></button></h1>
      <p class="song-meta">{songMeta}</p>
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

  {#if libraryReady}
    <dialog class="library-toolbar" id="song-library" bind:this={libraryDialog} onclose={() => libraryOpen = false} aria-labelledby="library-title">
    <div class="library-heading"><h2 id="library-title">Choose song</h2><button aria-label="Close song library" onclick={() => libraryOpen = false}>×</button></div>
    <div class="library-controls">
      <input class="song-search" aria-label="Search songs" placeholder="Search songs" type="search" bind:value={songSearch} />
      <SongPicker songs={matchingSongs} {favoriteIds} selected={selectedSong} onselect={(song) => { selectSong(song); libraryOpen = false; }} />


    </div>
    <div class="library-filters">
      <label class="library-sort">Sort by
      <select aria-label="Sort songs" bind:value={songSort}>
        <option value="title">Title</option><option value="artist">Artist</option><option value="import">Import order</option>
      </select>
      </label>
      <select aria-label="Playlist" bind:value={playlistFilter}>
        <option value="">All playlists ({songs.length})</option>
        {#each playlists as playlist}<option value={'playlist:' + playlist}>{playlist || 'Unlisted imports'} ({playlistCounts.get(playlist)})</option>{/each}
        <option value="examples">Built-in ({CHORD_SONGS.length})</option>
      </select>
    </div>
    <div class="library-secondary">
      {#if !matchingSongs.length}<span role="status">No matching songs.</span><button onclick={() => { songSearch = ''; playlistFilter = ''; }}><span class="icon" aria-hidden="true">×</span>Clear filters</button>{/if}
      <button class="library-action" onclick={() => chartEditor?.startNew()}><span class="icon" aria-hidden="true">＋</span>Add chart</button>
    </div>
    </dialog>
  {/if}
  <!-- Outside the library, so they open from the settings sheet. -->
  <ChordExport bind:this={chordExport} song={importedById.get(selectedSong.id)} songs={importedSongs} />
  <ChartEditor bind:this={chartEditor} bind:open={importOpen} song={importedById.get(selectedSong.id)} onadd={async (incoming, format, edited) => {
    await importSongs(incoming);
    // A chart typed or edited here opens on its own full chart, from the
    // start; a playlist keeps the library open to choose from.
    if (format === "ireal" && !edited) return;
    const song = incoming[0];
    index = 0; targetKey = song.originalKey; fullChartOpen = true; listMode = false;
    savedProgress.views[`${song.id}:song-open`] = { open: true };
    viewRevision++; libraryOpen = false;
  }} />
  {#if libraryError}<p role="alert">{libraryError}</p>{/if}
  {#if !libraryReady}<p role="status">Loading saved charts…</p>{/if}

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

      <!-- One choice of three: the two lists are the same view with the
           merge started again at each section or not, so they sit together. -->
      <div class="view-switch" role="group" aria-label="View mode">
        <button aria-pressed={!listMode} onclick={() => listMode = false}>Card</button>
        <button aria-pressed={listMode && !uniqueBySection} onclick={() => { listMode = true; uniqueBySection = false; }}>List</button>
        <button aria-pressed={listMode && uniqueBySection} onclick={() => { listMode = true; uniqueBySection = true; }}>By section</button>
      </div>
    </div>

  {#if listMode}
    {#key `${songId}:${uniqueBySection}`}
      <ChordList
        chords={listChords}
        {songId}
        sourceSymbols={displaySymbols}
        {heading}
        {subheading}
        sublabels={displaySublabels}
        bind:sourceIndex={() => index, (value) => { index = value; }}
        {uniqueBySection}
        editable={editableChart}
        originalKey={selectedSong.originalKey}
        {targetKey}
        {fretCount}
        {tuning}
        bind:bassStrings
        {scaleFor}
        onscale={setChordScale}
        soundEnabled={cardSettings.sound}
        shortcutsEnabled={!actionsOpen && !libraryOpen && !importOpen && !instrumentOpen}
        onplay={(chord) => sound(chordSemitones(chord))}
        onplayfret={playFret}
      />
    {/key}
  {:else}
  <main class="card-area">
    <div class="practice-content" use:remember={viewKey("practice-scroll")}>
      <SongSource {songId} symbols={displaySymbols} sublabels={displaySublabels} bind:open={fullChartOpen} onselect={selectScore} selected={[index]} editable={editableChart} originalKey={selectedSong.originalKey} {targetKey} />
      <ChordMetadata annotation={current.annotation} />
      {#if !fullChartOpen}<ChordSource {songId} onselect={selectScore} indices={[index]} symbols={displaySymbols} sublabels={displaySublabels} originalKey={selectedSong.originalKey} {targetKey} />{/if}
      <div class="question-heading">
        <h2>{heading(current.symbol)}{#if subheading(current.symbol)}<span class="chord-name">{subheading(current.symbol)}</span>{/if}</h2>
        {#if lyric}<p class="lyric" aria-label="Lyrics">{lyric}</p>{/if}
        <label class="progress">
          <input
            type="number"
            min="1"
            max={songChords.length}
            value={index + 1}
            aria-label="Chord number"
            onchange={updateChordNumber}
          />
          <span>/ {songChords.length}</span>
        </label>
        {#if !current.noChord}<button class="play-chord" disabled={!cardSettings.sound} onclick={playChord}>Play chord</button>{/if}
      </div>

      <ChordFretboard
        chord={current}
        {fretCount}
        {bassStrings}
        {tuning}
        bind:scale={() => cardScales.board, value => setScale("board", value)}
        bind:chordScale={() => scaleFor(current), (id) => setChordScale(current, id)}
        onplay={playFret}
      />

      <section class="answer" aria-label="Chord tones" aria-live="polite" style:--answer-scale={cardScales.answer}>
        {#if current.noChord}
          <p class="no-chord">No chord tones</p>
        {:else}
          <ChordTones chord={current} scaleId={scaleFor(current)} />
        {/if}
        <p class="next-chord">
          {#if nextChord}
            Next: <strong>{heading(nextChord.symbol)}</strong>
          {:else}
            Last chord
          {/if}
        </p>
      </section>
    </div>
  </main>

  <nav class="step-buttons" aria-label="Chord practice navigation">
    <div class="step-button-group">
      <button class="previous" disabled={!canGoBack} aria-label="Previous chord" onclick={goBack}>
        <span aria-hidden="true">←</span>
      </button>
      <button class="next" disabled={!canGoForward} aria-label="Next chord" onclick={goForward}>
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
    onedit={chartEditor?.canEdit() ? () => { closeActions(); chartEditor?.startEdit(); } : undefined}
    oncopy={chartEditor?.canEdit() ? () => { closeActions(); chartEditor?.startCopy(); } : undefined}
    onexport={importedById.has(songId) ? () => { closeActions(); chordExport?.show(); } : undefined}
    ondelete={importedById.has(songId) ? () => { closeActions(); void removeSong(); } : undefined}
    sizes={[{ label: "Frets", value: String(fretCount), onstep: step => fretCount = clampFretCount(fretCount + step) }, ...(!listMode ? cardSizes : [])]}
    choices={[{ label: "Chord names", value: chordNames, options: [
      { id: "names", label: "Dm7" }, { id: "degrees", label: "IIm7" }, { id: "both", label: "Dm7 + IIm7" },
    ], onchoose: (value) => { chordNames = value as ChordNaming; } }]}
    actions={[{ label: `Instrument and tuning: ${instrumentLabel}`, icon: "🎸", onopen: () => { closeActions(); instrumentOpen = true; } }]}
    switches={[
      { label: "Write minor chords as Cm7", on: minorNotation === "m", ontoggle: () => { minorNotation = minorNotation === "m" ? "-" : "m"; } },
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
  .library-filters { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; margin-top: 8px; }
  .library-sort { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--on-surface-muted); }
  .library-filters select { max-width: 100%; min-width: 0; padding: 6px; border: 1px solid var(--divider); border-radius: 6px; background: var(--surface); color: var(--on-surface); font: inherit; }
  /* Clear filters and Add chart are buttons like the view switch; Add chart
     stands out as the one that leads somewhere. */
  .library-secondary button { min-height: 40px; padding: 8px 12px; border: 1px solid var(--divider); border-radius: 6px; background: transparent; color: var(--on-surface-muted); font: inherit; font-size: 14px; cursor: pointer; }
  .library-secondary button:hover { background: color-mix(in srgb, var(--on-surface) 6%, var(--surface)); }
  .library-secondary .library-action { margin-left: auto; color: var(--text-accent); font-weight: 600; }
  .library-secondary .icon { margin-right: 4px; }
  .favorite { min-height: 40px; padding: 8px 0; border: 0; background: transparent; color: var(--on-surface-muted); font-size: 26px; cursor: pointer; }
  .favorite[aria-pressed="true"] { color: #d79513; }
  .song-meta { margin: 4px 0 0; font-size: 12px; color: var(--on-surface-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Key, instrument and view in a row; the view switch drops to a row of
     its own before the instrument's name is squeezed out. */
  .mode-picker { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 16px; }
  .mode-picker .view-switch { margin-left: auto; }
  .mode-picker button { min-height: 40px; padding: 8px 12px; border: 1px solid var(--divider); border-radius: 6px; color: var(--on-surface-muted); background: transparent; font: inherit; font-size: 14px; cursor: pointer; }
  .mode-picker button[aria-pressed="true"] { border-color: transparent; color: var(--text-accent); background: color-mix(in srgb, var(--text-accent) 8%, transparent); }
  .view-switch { display: flex; padding: 3px; border-radius: 8px; background: color-mix(in srgb, var(--on-surface) 6%, transparent); }
  .view-switch button { border: 0; white-space: nowrap; }
  /* The two lists read as one item with two settings. */
  .view-switch button:nth-child(2) { border-radius: 6px 0 0 6px; }
  .view-switch button:nth-child(3) { border-radius: 0 6px 6px 0; border-left: 1px solid var(--divider); }
  .card-area { position: relative; }
  .play-chord { padding: 8px 12px; color: var(--on-surface); background: var(--surface); border: 1px solid var(--divider); border-radius: 6px; }

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

  .appbar.minimal .titles, .appbar.minimal .favorite {
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


  .appbar-action:hover, .appbar-action:focus-visible {
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

  /* The card scrolls within its own area; the step buttons stay below it. */
  .card-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
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

  /* The words come after the name on a line of their own, as large as the
     rest of the card's text. */
  /* Beside the chord's name, its degree in small. */
  .chord-name {
    margin-left: 0.5em;
    font-size: 0.5em;
    color: var(--on-surface-muted);
  }

  .lyric {
    flex-basis: 100%;
    order: 1;
    margin: 0;
    font-size: calc(18px * var(--text-scale, 1));
    line-height: 1.4;
    overflow-wrap: anywhere;
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

  .next-chord, .no-chord {
    margin: 18px 0 0;
    text-align: center;
  }

  .next-chord {
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

  .step-buttons button:hover:not(:disabled), .step-buttons button:focus-visible:not(:disabled) {
    filter: brightness(0.96);
  }

  .step-buttons button:disabled {
    color: var(--count-zero);
    cursor: default;
    opacity: 0.45;
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
  }
</style>
