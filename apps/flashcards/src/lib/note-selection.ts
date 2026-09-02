// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  circleNoteDeckSetting,
  includesCircleNoteCard,
  type CircleNoteDeckSetting,
  type CircleNoteSelections,
} from "./circle-note-selection";
import type { NoteRow } from "./db";
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
  staffNoteDeckSetting,
  type StaffNoteDeckSetting,
  type StaffNoteSelection,
} from "./staff-note-selection";

// Every deck that lets you narrow what it asks. Each predicate passes notes it
// does not recognise, so a note only drops out of study when its own deck's
// settings exclude it.
export type NoteSelections = Readonly<{
  circle: CircleNoteSelections;
  fretWindow: FretWindow;
  intervalPairs: ReadonlySet<string>;
  staff: StaffNoteSelection;
}>;

export function includesSelectedNote(
  note: Pick<NoteRow, "fields" | "tags">,
  selections: NoteSelections,
): boolean {
  return (
    includesCircleNoteCard(note, selections.circle) &&
    includesGuitarIntervalCard(note, selections.fretWindow) &&
    includesIntervalPairCard(note, selections.intervalPairs) &&
    includesStaffNoteCard(note, selections.staff)
  );
}

// Which settings panel a deck's gear opens, or null when it has no gear.
export type DeckSettingsTarget =
  | Readonly<{ kind: "circle"; setting: CircleNoteDeckSetting }>
  | Readonly<{ kind: "guitar-interval"; setting: Readonly<{ deckLabel: string }> }>
  | Readonly<{ kind: "interval"; setting: IntervalDeckSetting }>
  | Readonly<{ kind: "staff"; setting: StaffNoteDeckSetting }>;

export function deckSettingsTarget(
  deckName: string,
): DeckSettingsTarget | null {
  const circle = circleNoteDeckSetting(deckName);
  if (circle !== null) return { kind: "circle", setting: circle };
  const interval = intervalDeckSetting(deckName);
  if (interval !== null) return { kind: "interval", setting: interval };
  const guitar = guitarIntervalDeckSetting(deckName);
  if (guitar !== null) return { kind: "guitar-interval", setting: guitar };
  const staff = staffNoteDeckSetting(deckName);
  if (staff !== null) return { kind: "staff", setting: staff };
  return null;
}
