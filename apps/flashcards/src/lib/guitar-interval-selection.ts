// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// `Guitar Intervals` draws the neck around the root rather than at a fret
// number, so how far the board reaches either way is the reader's: it decides
// both how wide the card is drawn and which cells the deck may ask about.

import type { NoteRow } from "./db";

const GUITAR_INTERVALS_DECK = "Guitar Intervals";

// The drawing the deck ships holds six frets each way; a window can ask for
// any part of it.
export const MAX_FRET_REACH = 6;

export type FretWindow = Readonly<{ left: number; right: number }>;
export type FretWindowSide = keyof FretWindow;
export type GuitarOverrides = Readonly<Record<string, boolean>>;

export function parseGuitarOverrides(value: unknown): GuitarOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, enabled]) =>
    /^r[1-6]-s[1-6]-(?:0|[fb][1-6])$/.test(key) && typeof enabled === "boolean",
  ));
}

export const DEFAULT_FRET_WINDOW: FretWindow = { left: 3, right: 3 };

export const DEFAULT_GUITAR_DIFFICULTY = 10;

export function guitarDifficultyLabel(difficulty: number): string {
  return [
    "Basic chord forms and reference notes",
    "9ths, suspensions and chord extensions",
    "More root positions and voicings",
    "Inversions and chord-tone connections",
    "Chord tones across the fretboard",
    "Melodic connections and extensions",
    "More extensions and altered intervals",
    "Altered intervals across positions",
    "Less familiar positions",
    "All shapes",
  ][parseGuitarDifficulty(difficulty) - 1];
}

export function parseGuitarDifficulty(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_GUITAR_DIFFICULTY;
  return Math.max(1, Math.min(DEFAULT_GUITAR_DIFFICULTY, Math.round(value)));
}

// The deck generator owns the classification. Older imports without the
// metadata remain available at All shapes until their bundled update arrives.
export function guitarIntervalLevel(note: { tags?: string }): number {
  const match = note.tags?.match(/(?:^|\s)learning-level::([1-9]|10)(?=\s|$)/);
  return match ? parseGuitarDifficulty(Number(match[1])) : DEFAULT_GUITAR_DIFFICULTY;
}

export function clampFretReach(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 3;
  return Math.min(MAX_FRET_REACH, Math.max(0, Math.round(value)));
}

export function parseFretWindow(value: unknown): FretWindow {
  if (typeof value !== "object" || value === null) return DEFAULT_FRET_WINDOW;
  const stored = value as Partial<Record<FretWindowSide, unknown>>;
  return {
    left: clampFretReach(stored.left),
    right: clampFretReach(stored.right),
  };
}

// How many cells a window can ask about: every string at every fret in it,
// less the root's own cell.
export function fretWindowCellCount(window: FretWindow): number {
  return 6 * (window.left + window.right + 1) - 1;
}

export function isGuitarIntervalCard(note: Pick<NoteRow, "fields">): boolean {
  return note.fields[1] === "guitar-interval";
}

export function includesGuitarIntervalCard(
  note: Pick<NoteRow, "fields"> & Partial<Pick<NoteRow, "tags">>,
  window: FretWindow,
  difficulty: number = DEFAULT_GUITAR_DIFFICULTY,
  overrides: GuitarOverrides = {},
): boolean {
  if (!isGuitarIntervalCard(note)) return true;
  if (!(overrides[note.fields[0]] ?? (guitarIntervalLevel(note) <= parseGuitarDifficulty(difficulty)))) return false;
  const offset = Number(note.fields[4]);
  if (!Number.isInteger(offset)) return true;
  return offset >= -window.left && offset <= window.right;
}

// The card's own CSS crops the board to these and slides it so the root's
// fret stays where the reader put it.
export function fretWindowVariables(
  window: FretWindow,
): Readonly<Record<string, string>> {
  return {
    "--fret-left": String(window.left),
    "--fret-right": String(window.right),
  };
}

export function guitarIntervalDeckSetting(
  deckName: string,
): Readonly<{ deckLabel: string }> | null {
  return deckName === GUITAR_INTERVALS_DECK
    ? { deckLabel: deckName }
    : null;
}
