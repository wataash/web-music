// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import type { NoteRow } from "./db";
import { MAJOR_KEYS } from "@web-music/music-staff-core";
import { iiVIProgression, progressionLine, PROGRESSION_ROOT, type ProgressionSelection } from "../../../../decks/music-staff/src/progression";
import type { MinorDegreeNotation, ChordNotation } from "./diatonic-selection";
export * from "../../../../decks/music-staff/src/progression";
export const PROGRESSION_SELECTION_KEY = "music-flashcards:ii-v-i-keys";
export function isProgressionCard(note: Pick<NoteRow, "tags">): boolean { return note.tags.split(/\s+/).includes("ii-v-i"); }
export function isProgressionDeck(name: string): boolean { return name === PROGRESSION_ROOT; }
export function includesProgressionCard(note: Pick<NoteRow, "tags" | "fields">, selection: Pick<ProgressionSelection, "majorKeys" | "minorKeys">): boolean {
  if (!isProgressionCard(note)) return true;
  const keys = note.fields[1] === "major" ? selection.majorKeys : note.fields[1] === "minor" ? selection.minorKeys : [];
  return keys.includes(Number(note.fields[2]));
}
export function progressionDisplayFields(note: Pick<NoteRow, "tags" | "fields">, minor: MinorDegreeNotation, chords: ChordNotation): Record<string, string> {
  if (!isProgressionCard(note) || !["major", "minor"].includes(note.fields[1])) return {};
  const fifths = Number(note.fields[2]);
  if (!MAJOR_KEYS.some(key => key.fifths === fifths)) return {};
  const result = iiVIProgression(fifths, note.fields[1] as "major" | "minor", minor, chords);
  return { Degree: progressionLine(result.degrees), Chords: progressionLine(result.chords), RelativeDegree: result.relative };
}
