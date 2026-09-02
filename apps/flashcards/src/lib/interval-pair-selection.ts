// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// `Intervals` is one flat deck of every root/degree pair, so what it asks is
// narrowed by picking pairs out of a grid rather than by studying a subdeck.
// The grid is laid out by how often iReal Pro's Jazz 1460 playlist names each
// pair, most-used first, and a threshold turns on everything at or above a
// count.

import { fifthsForMajorNote, formatNoteName } from "@circle-of-fifths/core";

import type { NoteRow } from "./db";
import { irealPairCount } from "./ireal-frequency";

const INTERVALS_DECK = "Intervals";
const IDENTIFICATION_DECK = "Interval Identification";
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const ACCIDENTALS = ["", "b", "#", "bb", "##"] as const;

export type IntervalDegreeRow = Readonly<{
  id: string;
  label: string;
  // How far the degree moves along the circle of fifths. The deck spells its
  // answers with at most a double accidental, so a pair only has a card when
  // the root's own position plus this stays inside that range — which is what
  // decides whether a cell in the grid is a card or a gap.
  fifths: number;
}>;

export type IntervalRootRow = Readonly<{
  note: string;
  label: string;
}>;

export type IntervalPairCell = Readonly<{
  key: string;
  root: string;
  degree: string;
  count: number;
  // False where the answer would need a triple accidental: no card exists.
  available: boolean;
}>;

export type IntervalDeckSetting = Readonly<{ deckLabel: string }>;

// Learning-priority order, matching `INTERVALS` in decks/intervals.
const DEGREES: readonly IntervalDegreeRow[] = [
  { id: "P5", label: "P5", fifths: 1 },
  { id: "M3", label: "M3", fifths: 4 },
  { id: "m3", label: "m3", fifths: -3 },
  { id: "P4", label: "P4", fifths: -1 },
  { id: "M2", label: "M2", fifths: 2 },
  { id: "m2", label: "m2", fifths: -5 },
  { id: "m7", label: "m7", fifths: -2 },
  { id: "M7", label: "M7", fifths: 5 },
  { id: "M6", label: "M6", fifths: 3 },
  { id: "m6", label: "m6", fifths: -4 },
  { id: "d7", label: "d7", fifths: -9 },
  { id: "d5", label: "d5", fifths: -6 },
  { id: "A4", label: "A4", fifths: 6 },
  { id: "A5", label: "A5", fifths: 8 },
  { id: "9", label: "9", fifths: 2 },
  { id: "13", label: "13", fifths: 3 },
  { id: "11", label: "11", fifths: -1 },
  { id: "b9", label: "♭9", fifths: -5 },
  { id: "#9", label: "♯9", fifths: 9 },
  { id: "#11", label: "♯11", fifths: 6 },
  { id: "b13", label: "♭13", fifths: -4 },
];

const ROOTS: readonly string[] = ACCIDENTALS.flatMap((accidental) =>
  LETTERS.map((letter) => `${letter}${accidental}`),
).sort((left, right) => fifthsForMajorNote(left) - fifthsForMajorNote(right));

// The lowest and highest spellings the deck writes: F𝄫 through B𝄪.
const LOWEST_FIFTHS = fifthsForMajorNote(ROOTS[0]);
const HIGHEST_FIFTHS = fifthsForMajorNote(ROOTS[ROOTS.length - 1]);

function hasCard(root: string, degree: IntervalDegreeRow): boolean {
  const fifths = fifthsForMajorNote(root) + degree.fifths;
  return fifths >= LOWEST_FIFTHS && fifths <= HIGHEST_FIFTHS;
}

// Columns run from the degree jazz standards name most often to the one they
// name least; degrees the playlist never names keep their learning order.
export const INTERVAL_DEGREE_ROWS: readonly IntervalDegreeRow[] = [...DEGREES]
  .map((degree, order) => ({
    degree,
    order,
    total: ROOTS.reduce(
      (sum, root) => sum + irealPairCount(root, degree.id),
      0,
    ),
  }))
  .sort((left, right) => right.total - left.total || left.order - right.order)
  .map(({ degree }) => degree);

// Rows are ordered the same way, and roots the playlist never uses — the 𝄫 and
// 𝄪 spellings, and E♯, B♯, F♭ — fall to the bottom in circle-of-fifths order.
export const INTERVAL_ROOT_ROWS: readonly IntervalRootRow[] = [...ROOTS]
  .map((note, order) => ({
    note,
    order,
    total: DEGREES.reduce(
      (sum, degree) => sum + irealPairCount(note, degree.id),
      0,
    ),
  }))
  .sort((left, right) => right.total - left.total || left.order - right.order)
  .map(({ note }) => ({ note, label: formatNoteName(note) }));

export const INTERVAL_PAIR_CELLS: readonly (readonly IntervalPairCell[])[] =
  INTERVAL_ROOT_ROWS.map(({ note }) =>
    INTERVAL_DEGREE_ROWS.map((degree) => ({
      key: `${note} ${degree.id}`,
      root: note,
      degree: degree.id,
      count: irealPairCount(note, degree.id),
      available: hasCard(note, degree),
    })),
  );

const ALL_CELLS = INTERVAL_PAIR_CELLS.flat().filter(({ available }) => available);

export const ALL_INTERVAL_PAIRS: readonly string[] = ALL_CELLS.map(
  ({ key }) => key,
);

// Every count a pair actually has, so one drag of the threshold slider always
// lands on a selection that differs from the last.
export const INTERVAL_PAIR_THRESHOLDS: readonly number[] = [
  ...new Set(ALL_CELLS.map(({ count }) => count)),
].sort((left, right) => left - right);

// A selected cell is shaded by how much of the playlist it accounts for, on
// five buckets rather than a continuous scale: the counts span four orders of
// magnitude and 364 of the 646 pairs sit at zero, so a linear wash would leave
// everything but the top row looking the same. Each bucket is a step of one
// blue ramp, lightest to darkest on a light theme and the reverse on a dark
// one.
export const INTERVAL_HEAT_BUCKETS: readonly Readonly<{
  level: number;
  from: number;
  label: string;
}>[] = [
  { level: 0, from: 0, label: "0" },
  { level: 1, from: 1, label: "1" },
  { level: 2, from: 100, label: "100" },
  { level: 3, from: 500, label: "500" },
  { level: 4, from: 2000, label: "2,000+" },
];

export function heatLevel(count: number): number {
  let level = 0;
  for (const bucket of INTERVAL_HEAT_BUCKETS) {
    if (count >= bucket.from) level = bucket.level;
  }
  return level;
}

export function pairsAtLeast(threshold: number): readonly string[] {
  return ALL_CELLS.filter(({ count }) => count >= threshold).map(
    ({ key }) => key,
  );
}

// The threshold the slider sits at for a selection it could have produced,
// or null when the reader has picked cells by hand.
export function thresholdForPairs(pairs: ReadonlySet<string>): number | null {
  for (const threshold of INTERVAL_PAIR_THRESHOLDS) {
    const candidate = pairsAtLeast(threshold);
    if (
      candidate.length === pairs.size &&
      candidate.every((key) => pairs.has(key))
    ) {
      return threshold;
    }
  }
  return null;
}

// The naturals, every degree: what the deck asked before the grid existed.
export const DEFAULT_INTERVAL_PAIR_SELECTION: readonly string[] =
  ALL_INTERVAL_PAIRS.filter((key) => key.split(" ")[0].length === 1);

export function parseIntervalPairs(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return DEFAULT_INTERVAL_PAIR_SELECTION;
  const requested = new Set(
    value.filter((key): key is string => typeof key === "string"),
  );
  return ALL_INTERVAL_PAIRS.filter((key) => requested.has(key));
}

const ROOT_BY_LABEL = new Map(
  INTERVAL_ROOT_ROWS.map(({ note, label }) => [label, note]),
);
const DEGREE_BY_LABEL = new Map(DEGREES.map(({ id, label }) => [label, id]));

// Every interval card draws a keyboard under the question, whichever way round
// it asks: a tap on it can stand in for SHOW ANSWER, and how large it is drawn
// is the reader's to set.
const INTERVAL_AXES: readonly string[] = ["interval", "identification"];

export function isIntervalCard(note: Pick<NoteRow, "fields">): boolean {
  return INTERVAL_AXES.includes(note.fields[1]);
}

// The note the card's keyboard marks as the answer. The front template has no
// field for it — that is what keeps it off the card — so a reader who asks to
// see it on the front is handed it by the app instead.
export function intervalAnswerNote(note: Pick<NoteRow, "fields">): string {
  return note.fields[8] ?? "";
}

export function includesIntervalPairCard(
  note: Pick<NoteRow, "fields">,
  pairs: ReadonlySet<string>,
): boolean {
  if (!isIntervalCard(note)) return true;
  const root = ROOT_BY_LABEL.get(note.fields[2]);
  const degree = DEGREE_BY_LABEL.get(note.fields[3]);
  if (root === undefined || degree === undefined) return true;
  return pairs.has(`${root} ${degree}`);
}

export function intervalDeckSetting(
  deckName: string,
): IntervalDeckSetting | null {
  if (deckName === INTERVALS_DECK || deckName === IDENTIFICATION_DECK) {
    return { deckLabel: deckName };
  }
  return null;
}
