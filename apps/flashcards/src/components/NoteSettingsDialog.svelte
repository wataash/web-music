<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import SettingChange from "./SettingChange.svelte";
  import { DEFAULT_FRETBOARD_FRET_COUNT } from "../lib/fretboard-card";
  import { untrack } from "svelte";
  import { CLEFS, CLEF_LABELS, MAJOR_KEYS_BY_SIGNATURE } from "@web-music/music-staff-core";

  import CircleNoteSettings from "./CircleNoteSettings.svelte";
  import CircleReference from "./CircleReference.svelte";
  import FretboardNoteSettings from "./FretboardNoteSettings.svelte";
  import FretboardReference from "./FretboardReference.svelte";
  import GuitarIntervalSettings from "./GuitarIntervalSettings.svelte";
  import InstrumentSettings from "./InstrumentSettings.svelte";
  import IntervalAnswerReference from "./IntervalAnswerReference.svelte";
  import IntervalPairSettings from "./IntervalPairSettings.svelte";
  import { DEFAULT_MOVABLE_DO_KEYS } from "../lib/movable-do-key-selection";
  import MovableDoKeySettings from "./MovableDoKeySettings.svelte";
  import ProgressionSettings from "./ProgressionSettings.svelte";
  import DiatonicSettings from "./DiatonicSettings.svelte";
  import { type ProgressionSelection } from "../lib/progression-selection";
  import { diatonicNotationPreference } from "../lib/diatonic-notation.svelte";
  import type { DiatonicSelections } from "../lib/diatonic-selection";
  import SettingsDialog from "./SettingsDialog.svelte";
  import StaffNoteSettings from "./StaffNoteSettings.svelte";
  import StaffScaleReference from "./StaffScaleReference.svelte";
  import type {
    CircleNoteSelection,
    CircleNoteSettingsScope,
    CircleRing,
  } from "../lib/circle-note-selection";
  import type { FretWindow } from "../lib/guitar-interval-selection";
  import { sameTuning, type Tuning } from "../lib/guitar-tuning";
  import {
    isGuitarDeckTarget,
    type DeckSettingsTarget,
    type NoteSelections,
  } from "../lib/note-selection";
  import type { StaffNoteSelection, MovableDoStaffSelections } from "../lib/staff-note-selection";

  // What the decks being studied let the reader narrow, one section each. A
  // deck of its own has one; a deck with decks under it has theirs, so the
  // four clefs of Staff → Note are set in one place rather than four.
  let {
    targets,
    noteSelections,
    onpreviewfretwindow,
    oncirclenoteselectionchange,
    onfretboardnoteselectionchange,
    onfretboardfretcountchange,
    onfretwindowchange,
    onguitardifficultychange,
    onguitaroverrideschange,
    onguitartuningchange,
    onintervalpairselectionchange,
    onstaffnoteselectionchange,
    onmovabledokeyselectionchange,
    ondiatonicselectionchange,
    onprogressionselectionchange,
    onclose,
  }: {
    targets: readonly DeckSettingsTarget[];
    noteSelections: NoteSelections;
    // The card behind the dialog, when there is one, is redrawn as the fret
    // window is dragged.
    onpreviewfretwindow?: (selection: FretWindow) => void;
    oncirclenoteselectionchange: (
      scope: CircleNoteSettingsScope,
      selection: CircleNoteSelection,
    ) => void;
    onfretboardnoteselectionchange: (selection: readonly string[]) => void;
    onfretboardfretcountchange: (count: number) => void;
    onfretwindowchange: (selection: FretWindow) => void;
    onguitardifficultychange: (difficulty: number) => void;
    onguitaroverrideschange: (overrides: Readonly<Record<string, boolean>>) => void;
    onguitartuningchange: (tuning: Tuning) => void;
    onintervalpairselectionchange: (selection: readonly string[]) => void;
    onstaffnoteselectionchange: (selection: StaffNoteSelection, solfege: MovableDoStaffSelections) => void;
    onmovabledokeyselectionchange: (selection: readonly number[]) => void;
    ondiatonicselectionchange: (selection: DiatonicSelections) => void;
    onprogressionselectionchange: (selection: ProgressionSelection) => void;
    onclose: () => void;
  } = $props();

  // One draft per kind of setting rather than per section: the four clefs
  // share a staff selection, and a circle deck's two rings share theirs, so a
  // section writes its own part of the draft and the rest is left alone.
  let staff = $state<StaffNoteSelection>(
    untrack(() => ({ ...noteSelections.staff })),
  );
  let progressions = $state(untrack(() => noteSelections.progressions));
  let diatonic = $state(untrack(() => noteSelections.diatonic));
  let movableDoKeys = $state<readonly number[]>(untrack(() => [...noteSelections.movableDoKeys]));
  let movableDoStaff = $state<MovableDoStaffSelections>(untrack(() => ({ ...noteSelections.movableDoStaff })));
  let editingKey = $state(untrack(() => [...noteSelections.movableDoKeys][0] ?? 0));
  const editableKeys = $derived(MAJOR_KEYS_BY_SIGNATURE.filter((key) => movableDoKeys.includes(key.fifths)));

  function setStudyKeys(keys: readonly number[]): void {
    movableDoKeys = keys;
    if (!keys.includes(editingKey)) editingKey = keys[0] ?? 0;
  }
  let circle = $state(untrack(() => ({ ...noteSelections.circle })));
  let intervalPairs = $state<readonly string[]>(
    untrack(() => [...noteSelections.intervalPairs]),
  );
  let guitarOverrides = $state(untrack(() => ({ ...noteSelections.guitarOverrides })));
  let guitarDifficulty = $state(untrack(() => noteSelections.guitarDifficulty));
  let fretWindow = $state<FretWindow>(
    untrack(() => ({ ...noteSelections.fretWindow })),
  );
  let fretboardNotes = $state<readonly string[]>(
    untrack(() => [...noteSelections.fretboardNotes]),
  );
  let fretboardFretCount = $state(untrack(() => noteSelections.fretboardFretCount));
  let guitarTuning = $state<Tuning>(untrack(() => [...noteSelections.guitarTuning]));
  // The instrument is every guitar deck's, so it is set once above their
  // sections rather than in each of them.
  const guitarDecks = $derived(targets.some(isGuitarDeckTarget));
  const movableDoDecks = $derived(targets.some((target) =>
    target.kind === "movable-do-keys" || (target.kind === "staff" && target.setting.movableDo === true),
  ));
  const sections = $derived.by(() => {
    const result: DeckSettingsTarget[] = targets.filter((target) =>
      target.kind !== "guitar-instrument" && target.kind !== "movable-do-keys" && target.kind !== "circle-cells" && target.kind !== "diatonic" && target.kind !== "progression",
    ).filter((target) => !(target.kind === "staff" && target.setting.movableDo && movableDoKeys.length === 0));
    if (movableDoDecks && movableDoKeys.length > 0 && !result.some((target) => target.kind === "staff" && target.setting.movableDo)) {
      result.push(...CLEFS.map((clef): DeckSettingsTarget => ({
        kind: "staff", setting: { clef, deckLabel: `${CLEF_LABELS[clef]} Clef`, movableDo: true },
      })));
    }
    return result;
  });
  // One reference per kind of deck, after the sections: the answers the decks
  // being set can ask for, with those the draft leaves out drawn faint.
  const targetKinds = $derived(new Set(targets.map(({ kind }) => kind)));
  const diatonicDirections = $derived([...new Set(targets.flatMap(target =>
    target.kind === "diatonic" ? target.setting.directions : [],
  ))]);
  const fretboardReference = $derived(targetKinds.has("fretboard-note") || targetKinds.has("guitar-instrument"));
  const circleReference = $derived(targets.some((target) =>
    target.kind === "circle-cells" || (target.kind === "circle" && target.setting.scope === "note-to-cell"),
  ));
  // Movable Do's own reference, with its solfege, is in its key settings.
  const letterStaffClef = $derived(targets.flatMap((target) =>
    target.kind === "staff" && target.setting.movableDo !== true ? [target.setting.clef] : [],
  )[0]);

  const SCOPE_FIELDS = {
    "note-to-cell": "noteToCell",
    intervals: "intervals",
  } as const;

  function circleScopeSelection(
    scope: CircleNoteSettingsScope,
  ): CircleNoteSelection {
    return circle[SCOPE_FIELDS[scope]];
  }

  function setCircleRing(
    scope: CircleNoteSettingsScope,
    ring: CircleRing,
    notes: readonly string[],
  ): void {
    const field = SCOPE_FIELDS[scope];
    circle = {
      ...circle,
      [field]: { ...circle[field], [ring]: notes },
    };
  }

  // A section is a deck's, but a saved setting is a kind's: applying writes
  // each kind once, however many decks under the one being studied asked for
  // it.
  function apply(): void {
    if (targetKinds.has("progression")) onprogressionselectionchange(progressions);
    if (targetKinds.has("diatonic")) ondiatonicselectionchange(diatonic);
    if (movableDoDecks || sections.some((target) => target.kind === "staff")) onstaffnoteselectionchange(staff, movableDoStaff);
    if (movableDoDecks) onmovabledokeyselectionchange(movableDoKeys);
    if (targetKinds.has("interval")) onintervalpairselectionchange(intervalPairs);
    if (targetKinds.has("fretboard-note")) {
      onfretboardnoteselectionchange(fretboardNotes);
    }
    if (targetKinds.has("fretboard-note") || targetKinds.has("guitar-instrument")) {
      onfretboardfretcountchange(fretboardFretCount);
    }
    // Before the shapes turned off by hand, which are kept per instrument:
    // they are written for the instrument being applied, not the one before.
    if (guitarDecks && !sameTuning(guitarTuning, noteSelections.guitarTuning)) {
      onguitartuningchange(guitarTuning);
    }
    if (targetKinds.has("guitar-interval")) {
      onfretwindowchange(fretWindow);
      onguitardifficultychange(guitarDifficulty);
      onguitaroverrideschange(guitarOverrides);
    }
    const scopes = new Set(
      targets.flatMap((target) =>
        target.kind === "circle" ? [target.setting.scope] : [],
      ),
    );
    for (const scope of scopes) {
      oncirclenoteselectionchange(scope, circleScopeSelection(scope));
    }
    onclose();
  }

  function sectionKey(target: DeckSettingsTarget): string {
    switch (target.kind) {
      case "circle":
        return `circle-${target.setting.scope}-${target.setting.ring}`;
      case "staff":
        return `staff-${target.setting.movableDo ? "solfege" : "regular"}-${target.setting.clef}`;
      default:
        return `${target.kind}-${target.setting.deckLabel}`;
    }
  }
</script>

<SettingsDialog
  title="What to ask"
  titleId="note-settings-title"
  onapply={apply}
  oncancel={onclose}
>
  {#if targetKinds.has("progression")}
    <ProgressionSettings selection={progressions} onchange={value => progressions = value} />
  {/if}
  {#if diatonicDirections.length > 0}
    <DiatonicSettings minorNotation={diatonicNotationPreference.value} chordNotation={diatonicNotationPreference.chords} directions={diatonicDirections} selection={diatonic} onchange={value => diatonic = value} />
  {/if}
  {#each sections as target}
    {#if target.kind === "chord-tones"}
      <p class="hint">Most common chords first · iReal Pro Jazz 1460</p>
    {/if}
  {/each}
  {#if guitarDecks}
    <InstrumentSettings
      tuning={guitarTuning}
      applied={noteSelections.guitarTuning}
      onchange={(tuning) => {
        guitarTuning = tuning;
        // The shapes turned off by hand were another instrument's.
        guitarOverrides = {};
      }}
    />
  {/if}
  {#if targetKinds.has("fretboard-note") || targetKinds.has("guitar-instrument")}
    <div class="deck-section">
      <SettingChange modified={fretboardFretCount !== DEFAULT_FRETBOARD_FRET_COUNT} settingName="Fretboard frets" onreset={() => fretboardFretCount = DEFAULT_FRETBOARD_FRET_COUNT}>
      {#snippet heading()}
      <label for="fretboard-fret-count">Fretboard frets</label>
      {/snippet}
      <select id="fretboard-fret-count" bind:value={fretboardFretCount}>
        {#each Array.from({ length: 13 }, (_, index) => index + 12) as count}
          <option value={count}>{count}</option>
        {/each}
      </select>
      </SettingChange>
    </div>
  {/if}
  {#if movableDoDecks}
    <div class="deck-section">
      <p class="scope-label">Keys to study (select multiple)</p>
      <MovableDoKeySettings selection={movableDoKeys} defaultSelection={DEFAULT_MOVABLE_DO_KEYS} onchange={setStudyKeys} />
    </div>
    <div class="deck-section">
      <label class="scope-label" for="staff-range-key">Edit note range for key</label>
      <select id="staff-range-key" bind:value={editingKey} disabled={editableKeys.length === 0}>
        {#if editableKeys.length === 0}
          <option value={editingKey}>Select keys to study first</option>
        {/if}
        {#each editableKeys as key}
          <option value={key.fifths}>{key.tonic} major ({key.fifths === 0 ? "no accidentals" : `${Math.abs(key.fifths)} ${key.fifths < 0 ? "♭" : "♯"}`})</option>
        {/each}
      </select>
      <p class="scope-label">{editableKeys.length === 0 ? "Choose a key to study above to edit its range." : "Range changes apply only to this key and clef. Other keys keep their own ranges."}</p>
    </div>
  {/if}
  {#each sections as target (sectionKey(target))}
    <div class="deck-section">
      {#if target.kind === "circle"}
        <CircleNoteSettings
          ring={target.setting.ring}
          deckLabel={target.setting.deckLabel}
          tableKind={target.setting.tableKind}
          selection={circleScopeSelection(target.setting.scope)}
          onchange={(notes) =>
            setCircleRing(target.setting.scope, target.setting.ring, notes)}
        />
      {:else if target.kind === "interval"}
        <IntervalPairSettings
          deckLabel={target.setting.deckLabel}
          selection={intervalPairs}
          onchange={(selection) => (intervalPairs = selection)}
        />
      {:else if target.kind === "fretboard-note"}
        <FretboardNoteSettings
          deckLabel={target.setting.deckLabel}
          selection={fretboardNotes}
          onchange={(selection) => (fretboardNotes = selection)}
        />
      {:else if target.kind === "guitar-interval"}
        <GuitarIntervalSettings
          deckLabel={target.setting.deckLabel}
          tuning={guitarTuning}
          selection={fretWindow}
          difficulty={guitarDifficulty}
          ondifficultychange={(value) => { guitarDifficulty = value; guitarOverrides = {}; }}
          overrides={guitarOverrides}
          onoverrideschange={(value) => (guitarOverrides = value)}
          onpreview={onpreviewfretwindow}
          onchange={(selection) => (fretWindow = selection)}
        />
      {:else if target.kind === "staff"}
        <StaffNoteSettings
          clef={target.setting.clef}
          deckLabel={target.setting.deckLabel}
          selection={target.setting.movableDo ? movableDoStaff[editingKey] : staff}
          keyFifths={target.setting.movableDo ? editingKey : undefined}
          onchange={(pitches) => {
            if (target.setting.movableDo) {
              movableDoStaff = { ...movableDoStaff, [editingKey]: { ...movableDoStaff[editingKey], [target.setting.clef]: pitches } };
            } else {
              staff = { ...staff, [target.setting.clef]: pitches };
            }
          }}
        />
      {/if}
    </div>
  {/each}
  {#if targetKinds.has("interval")}
    <IntervalAnswerReference selection={new Set(intervalPairs)} />
  {/if}
  {#if fretboardReference}
    <FretboardReference
      tuning={guitarTuning}
      fretCount={fretboardFretCount}
      selection={targetKinds.has("fretboard-note") ? fretboardNotes : undefined}
    />
  {/if}
  {#if circleReference}
    <CircleReference />
  {/if}
  {#if letterStaffClef !== undefined}
    <StaffScaleReference solfege={false} initialClef={letterStaffClef} />
  {/if}
</SettingsDialog>

<style>
  .scope-label {
    display: block;
    margin: 8px 0;
    color: var(--on-surface-muted);
    font-size: var(--ui-font-size-secondary);
    line-height: 1.5;
  }

  #staff-range-key {
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    background: var(--surface);
    color: var(--on-surface);
    border: 1px solid var(--divider);
    border-radius: 6px;
    font: inherit;
  }

  /* Under a parent deck the sections are stacked, so each says where it ends
     rather than running into the next one's table. */
  .deck-section + .deck-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--divider);
  }
</style>
