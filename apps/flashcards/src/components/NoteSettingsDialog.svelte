<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { untrack } from "svelte";

  import CircleNoteSettings from "./CircleNoteSettings.svelte";
  import GuitarIntervalSettings from "./GuitarIntervalSettings.svelte";
  import IntervalPairSettings from "./IntervalPairSettings.svelte";
  import SettingsDialog from "./SettingsDialog.svelte";
  import StaffNoteSettings from "./StaffNoteSettings.svelte";
  import type {
    CircleNoteSelection,
    CircleNoteSettingsScope,
    CircleRing,
  } from "../lib/circle-note-selection";
  import type { FretWindow } from "../lib/guitar-interval-selection";
  import type {
    DeckSettingsTarget,
    NoteSelections,
  } from "../lib/note-selection";
  import type { StaffNoteSelection } from "../lib/staff-note-selection";

  // What the decks being studied let the reader narrow, one section each. A
  // deck of its own has one; a deck with decks under it has theirs, so the
  // four clefs of Staff → Note are set in one place rather than four.
  let {
    targets,
    noteSelections,
    onpreviewfretwindow,
    oncirclenoteselectionchange,
    onfretwindowchange,
    onintervalpairselectionchange,
    onstaffnoteselectionchange,
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
    onfretwindowchange: (selection: FretWindow) => void;
    onintervalpairselectionchange: (selection: readonly string[]) => void;
    onstaffnoteselectionchange: (selection: StaffNoteSelection) => void;
    onclose: () => void;
  } = $props();

  // One draft per kind of setting rather than per section: the four clefs
  // share a staff selection, and a circle deck's two rings share theirs, so a
  // section writes its own part of the draft and the rest is left alone.
  let staff = $state<StaffNoteSelection>(
    untrack(() => ({ ...noteSelections.staff })),
  );
  let circle = $state(untrack(() => ({ ...noteSelections.circle })));
  let intervalPairs = $state<readonly string[]>(
    untrack(() => [...noteSelections.intervalPairs]),
  );
  let fretWindow = $state<FretWindow>(
    untrack(() => ({ ...noteSelections.fretWindow })),
  );

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
    const kinds = new Set(targets.map(({ kind }) => kind));
    if (kinds.has("staff")) onstaffnoteselectionchange(staff);
    if (kinds.has("interval")) onintervalpairselectionchange(intervalPairs);
    if (kinds.has("guitar-interval")) onfretwindowchange(fretWindow);
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
        return `staff-${target.setting.clef}`;
      default:
        return `${target.kind}-${target.setting.deckLabel}`;
    }
  }
</script>

<SettingsDialog
  title="Settings"
  titleId="note-settings-title"
  onapply={apply}
  oncancel={onclose}
>
  {#each targets as target (sectionKey(target))}
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
      {:else if target.kind === "guitar-interval"}
        <GuitarIntervalSettings
          deckLabel={target.setting.deckLabel}
          selection={fretWindow}
          onpreview={onpreviewfretwindow}
          onchange={(selection) => (fretWindow = selection)}
        />
      {:else}
        <StaffNoteSettings
          clef={target.setting.clef}
          deckLabel={target.setting.deckLabel}
          selection={staff}
          onchange={(pitches) =>
            (staff = { ...staff, [target.setting.clef]: pitches })}
        />
      {/if}
    </div>
  {/each}
</SettingsDialog>

<style>
  /* Under a parent deck the sections are stacked, so each says where it ends
     rather than running into the next one's table. */
  .deck-section + .deck-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--divider);
  }
</style>
