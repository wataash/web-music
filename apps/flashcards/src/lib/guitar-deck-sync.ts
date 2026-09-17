// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createWebDeck as createGuitarIntervalsDeck } from "guitar-intervals-anki/web-deck";
import { createWebDeck as createGuitarFretboardDeck } from "guitar-fretboard-anki/web-deck";

import { db, importDeckData } from "./db";
import type { DeckData } from "./deck-data";
import { noteTuning, sameTuning, type Tuning } from "./guitar-tuning";

export const GUITAR_PACKAGES: readonly Readonly<{
  pkg: string;
  generate: (tuning: Tuning) => DeckData;
}>[] = [
  { pkg: "Guitar Intervals", generate: (tuning) => createGuitarIntervalsDeck(tuning) },
  { pkg: "Guitar Fretboard", generate: (tuning) => createGuitarFretboardDeck(tuning) },
];

// Bring the guitar packages in the database to the reader's instrument. The
// bundled import writes the standard decks, so this runs after it as well as
// when the setting changes; a package that is not there yet is left to the
// import that brings it. Returns the packages that were replaced.
export async function retuneGuitarDecks(tuning: Tuning): Promise<readonly string[]> {
  const replaced: string[] = [];
  for (const { pkg, generate } of GUITAR_PACKAGES) {
    const note = await db.notes.where("pkg").equals(pkg).first();
    if (note === undefined || sameTuning(noteTuning(note), tuning)) continue;
    await importDeckData(generate(tuning));
    replaced.push(pkg);
  }
  return replaced;
}
