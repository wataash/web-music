// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { NoteRow } from "./db";
import { DIATONIC_ROOT, DIATONIC_DIRECTIONS, DIATONIC_VARIANTS, diatonicDegreeLabel, diatonicChord, chordQualityLabel, DEFAULT_CHORD_NOTATION, contextSelected, type ChordNotation, type MinorDegreeNotation, type DiatonicContext, type DiatonicDirection, type DiatonicSelections } from "../../../../decks/music-staff/src/diatonic";
export * from "../../../../decks/music-staff/src/diatonic";
export const DIATONIC_SELECTION_KEY = "music-flashcards:diatonic-selections";
export function diatonicDisplayFields(note: Pick<NoteRow, "tags" | "fields">, notation: MinorDegreeNotation, chords: ChordNotation = DEFAULT_CHORD_NOTATION): Record<string, string> {
  const direction = diatonicDirection(note);
  if (!direction) return {};
  try {
    const context: DiatonicContext = JSON.parse(note.fields[7])[0];
    const variant = DIATONIC_VARIANTS.find(v => v.id === context.variant);
    if (!variant) return {};
    const chord = diatonicChord(context.fifths, variant, notation, chords);
    return { Chord: chord.notes[0] + chordQualityLabel(variant.quality, chords),
      Degree: diatonicDegreeLabel(variant, notation, chords), RelativeDegree: chord.relative };
  } catch { return {}; }
}
export function diatonicDirection(note: Pick<NoteRow, "tags" | "fields">): DiatonicDirection | null {
  if (!note.tags.split(/\s+/).includes("diatonic-chords")) return null;
  return DIATONIC_DIRECTIONS.find(d => d === note.fields[1]) ?? null;
}
export function includesDiatonicCard(note: Pick<NoteRow, "tags" | "fields">, selections: DiatonicSelections): boolean {
  const direction = diatonicDirection(note);
  if (!direction) return true;
  try {
    const contexts: DiatonicContext[] = JSON.parse(note.fields[7]);
    return Array.isArray(contexts) && contexts.some(c => contextSelected(c, selections[direction]));
  } catch { return false; }
}
export function diatonicDeckSetting(name: string): Readonly<{ deckLabel: string; directions: readonly DiatonicDirection[] }> | null {
  return name === DIATONIC_ROOT ? { deckLabel: DIATONIC_ROOT, directions: DIATONIC_DIRECTIONS } : null;
}
