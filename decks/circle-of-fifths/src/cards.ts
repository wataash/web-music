// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  FLAT_THIRD_PAIRS,
  formatNoteName,
  MAJOR_THIRD_PAIRS,
  POSITIONS,
} from "@circle-of-fifths/core";

export type IntervalKind = "flat3" | "major3";

export type IntervalCardDefinition = Readonly<{
  id: string;
  kind: "interval";
  interval: IntervalKind;
  intervalLabel: "♭3" | "Δ3";
  questionNote: string;
  answerNote: string;
  outerNote: string;
  innerNote: string;
  tag: "interval::flat3" | "interval::major3";
}>;

export type NoteToCellCardDefinition = Readonly<{
  id: string;
  kind: "note-to-cell";
  ring: "outer" | "inner";
  note: string;
  tag: "note-to-cell::outer" | "note-to-cell::inner";
}>;

export type CellToNotesCardDefinition = Readonly<{
  id: string;
  kind: "cell-to-notes";
  ring: "outer" | "inner";
  hour: number;
  notes: readonly string[];
  tag: "cell-to-notes::outer" | "cell-to-notes::inner";
}>;

export type CardDefinition =
  | IntervalCardDefinition
  | NoteToCellCardDefinition
  | CellToNotesCardDefinition;

export const INTERVAL_CARDS: readonly IntervalCardDefinition[] = [
  ...FLAT_THIRD_PAIRS.map(([innerNote, outerNote]) =>
    createIntervalCard({
      interval: "flat3",
      intervalLabel: "♭3",
      questionNote: innerNote,
      answerNote: outerNote,
      outerNote,
      innerNote,
      tag: "interval::flat3",
    }),
  ),
  ...MAJOR_THIRD_PAIRS.map(([outerNote, innerNote]) =>
    createIntervalCard({
      interval: "major3",
      intervalLabel: "Δ3",
      questionNote: outerNote,
      answerNote: innerNote,
      outerNote,
      innerNote,
      tag: "interval::major3",
    }),
  ),
];

export const NOTE_TO_CELL_CARDS: readonly NoteToCellCardDefinition[] = [
  ...POSITIONS.flatMap(({ major }) =>
    major.map((note) => createNoteToCellCard("outer", note)),
  ),
  ...POSITIONS.flatMap(({ minor }) =>
    minor.map((note) => createNoteToCellCard("inner", note)),
  ),
];

export const CELL_TO_NOTES_CARDS: readonly CellToNotesCardDefinition[] = [
  ...POSITIONS.map(({ hour, major }) =>
    createCellToNotesCard("outer", hour, major),
  ),
  ...POSITIONS.map(({ hour, minor }) =>
    createCellToNotesCard("inner", hour, minor),
  ),
];

export const CARDS: readonly CardDefinition[] = [
  ...CELL_TO_NOTES_CARDS,
  ...NOTE_TO_CELL_CARDS,
  ...INTERVAL_CARDS,
];

export function formatDisplayNote(note: string): string {
  return formatNoteName(note[0].toUpperCase() + note.slice(1));
}

function createIntervalCard(
  card: Omit<IntervalCardDefinition, "id" | "kind">,
): IntervalCardDefinition {
  return {
    kind: "interval",
    ...card,
    id: `${card.interval}-${noteSlug(card.questionNote)}`,
  };
}

function createNoteToCellCard(
  ring: NoteToCellCardDefinition["ring"],
  note: string,
): NoteToCellCardDefinition {
  return {
    id: `${ring}-note-${noteSlug(note)}`,
    kind: "note-to-cell",
    ring,
    note,
    tag: `note-to-cell::${ring}`,
  };
}

function createCellToNotesCard(
  ring: CellToNotesCardDefinition["ring"],
  hour: number,
  notes: readonly string[],
): CellToNotesCardDefinition {
  return {
    id: `${ring}-cell-${hour}`,
    kind: "cell-to-notes",
    ring,
    hour,
    notes,
    tag: `cell-to-notes::${ring}`,
  };
}

function noteSlug(note: string): string {
  const suffixes: Readonly<Record<string, string>> = {
    "": "",
    b: "-flat",
    bb: "-double-flat",
    "#": "-sharp",
    "##": "-double-sharp",
  };
  const suffix = suffixes[note.slice(1)];
  if (suffix === undefined) {
    throw new TypeError(`invalid note spelling: ${note}`);
  }
  return note[0].toLowerCase() + suffix;
}
