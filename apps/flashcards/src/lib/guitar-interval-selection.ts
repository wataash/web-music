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

export const DEFAULT_FRET_WINDOW: FretWindow = { left: 3, right: 3 };

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
  note: Pick<NoteRow, "fields">,
  window: FretWindow,
): boolean {
  if (!isGuitarIntervalCard(note)) return true;
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
