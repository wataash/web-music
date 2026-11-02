// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  circleCellDeckSetting,
  circleNoteDeckSetting,
  includesCircleNoteCard,
  type CircleNoteDeckSetting,
  type CircleNoteSelections,
} from "./circle-note-selection";
import { CHORD_TONE_DECKS } from "./chord-tone-selection";
import type { NoteRow } from "./db";
import { isProgressionDeck, includesProgressionCard, type ProgressionSelection } from "./progression-selection";
import { diatonicDeckSetting, includesDiatonicCard, type DiatonicDirection, type DiatonicSelections } from "./diatonic-selection";
import {
  FRETBOARD_POSITION_TO_NOTE_DECK,
  fretboardNoteDeckSetting,
  includesFretboardFretCard,
  includesFretboardNoteCard,
} from "./fretboard-card";
import type { Tuning } from "./guitar-tuning";
import { includesMovableDoKeyCard, movableDoKeyDeckSetting } from "./movable-do-key-selection";
import {
  guitarIntervalDeckSetting,
  includesGuitarIntervalCard,
  type FretWindow,
} from "./guitar-interval-selection";
import {
  includesIntervalPairCard,
  intervalDeckSetting,
  type IntervalDeckSetting,
} from "./interval-pair-selection";
import {
  includesStaffNoteCard,
  staffSelectionForNote,
  type MovableDoStaffSelections,
  staffNoteDeckSetting,
  type StaffNoteDeckSetting,
  type StaffNoteSelection,
} from "./staff-note-selection";

// Every deck that lets you narrow what it asks. Each predicate passes notes it
// does not recognise, so a note only drops out of study when its own deck's
// settings exclude it.
export type NoteSelections = Readonly<{
  circle: CircleNoteSelections;
  fretboardNotes: ReadonlySet<string>;
  fretboardFretCount: number;
  fretWindow: FretWindow;
  guitarDifficulty: number;
  guitarOverrides: Readonly<Record<string, boolean>>;
  // The instrument both guitar decks are drawn for. Not a predicate: the
  // notes in the database are already that instrument's.
  guitarTuning: Tuning;
  intervalPairs: ReadonlySet<string>;
  staff: StaffNoteSelection;
  movableDoStaff: MovableDoStaffSelections;
  movableDoKeys: ReadonlySet<number>;
  diatonic: DiatonicSelections;
  progressions: ProgressionSelection;
}>;

export function includesSelectedNote(
  note: Pick<NoteRow, "fields" | "tags">,
  selections: NoteSelections,
): boolean {
  return (
    includesCircleNoteCard(note, selections.circle) &&
    includesFretboardNoteCard(note, selections.fretboardNotes) &&
    includesFretboardFretCard(note, selections.fretboardFretCount) &&
    includesGuitarIntervalCard(note, selections.fretWindow, selections.guitarDifficulty, selections.guitarOverrides) &&
    includesIntervalPairCard(note, selections.intervalPairs) &&
    includesStaffNoteCard(note, staffSelectionForNote(note, selections.staff, selections.movableDoStaff)) &&
    includesMovableDoKeyCard(note, selections.movableDoKeys) &&
    includesDiatonicCard(note, selections.diatonic) &&
    includesProgressionCard(note, selections.progressions)
  );
}

export function isGuitarDeckTarget(target: DeckSettingsTarget): boolean {
  return ["fretboard-note", "guitar-interval", "guitar-instrument"].includes(target.kind);
}

// Which settings panel a deck's gear opens, or null when it has no gear.
export type DeckSettingsTarget =
  | Readonly<{ kind: "chord-tones"; setting: Readonly<{ deckLabel:string; triads:boolean }> }>
  | Readonly<{ kind: "progression"; setting: Readonly<{ deckLabel: string }> }>
  | Readonly<{ kind: "diatonic"; setting: Readonly<{ deckLabel: string; directions: readonly DiatonicDirection[] }> }>
  | Readonly<{ kind: "circle"; setting: CircleNoteDeckSetting }>
  // A deck with nothing to narrow, whose gear offers only a reference.
  | Readonly<{ kind: "circle-cells"; setting: Readonly<{ deckLabel: string }> }>
  | Readonly<{ kind: "fretboard-note"; setting: Readonly<{ deckLabel: string }> }>
  | Readonly<{ kind: "guitar-interval"; setting: Readonly<{ deckLabel: string }> }>
  // A guitar deck with nothing of its own to narrow: its gear offers the
  // instrument, which every guitar deck's gear offers as well.
  | Readonly<{ kind: "guitar-instrument"; setting: Readonly<{ deckLabel: string }> }>
  | Readonly<{ kind: "interval"; setting: IntervalDeckSetting }>
  | Readonly<{ kind: "staff"; setting: StaffNoteDeckSetting }>
  | Readonly<{ kind: "movable-do-keys"; setting: Readonly<{ deckLabel: string }> }>;

export function deckSettingsTarget(
  deckName: string,
): DeckSettingsTarget | null {
  if (Object.values(CHORD_TONE_DECKS).includes(deckName as typeof CHORD_TONE_DECKS[keyof typeof CHORD_TONE_DECKS])) return {kind:"chord-tones",setting:{deckLabel:deckName,triads:deckName===CHORD_TONE_DECKS.triads}};
  if (isProgressionDeck(deckName)) return { kind: "progression", setting: { deckLabel: "II–V–I Progressions" } };
  const diatonic = diatonicDeckSetting(deckName);
  if (diatonic !== null) return { kind: "diatonic", setting: diatonic };
  const circle = circleNoteDeckSetting(deckName);
  if (circle !== null) return { kind: "circle", setting: circle };
  const circleCells = circleCellDeckSetting(deckName);
  if (circleCells !== null) return { kind: "circle-cells", setting: circleCells };
  const interval = intervalDeckSetting(deckName);
  if (interval !== null) return { kind: "interval", setting: interval };
  const fretboard = fretboardNoteDeckSetting(deckName);
  if (fretboard !== null) {
    return { kind: "fretboard-note", setting: fretboard };
  }
  const guitar = guitarIntervalDeckSetting(deckName);
  if (guitar !== null) return { kind: "guitar-interval", setting: guitar };
  if (deckName === FRETBOARD_POSITION_TO_NOTE_DECK) {
    return { kind: "guitar-instrument", setting: { deckLabel: "Position → Note" } };
  }
  const staff = staffNoteDeckSetting(deckName);
  if (staff !== null) return { kind: "staff", setting: staff };
  const movableDo = movableDoKeyDeckSetting(deckName);
  if (movableDo !== null) return { kind: "movable-do-keys", setting: movableDo };
  return null;
}
