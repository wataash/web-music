// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import type { NoteRow } from "./db";
import { CHORD_TONE_DECKS, chordToneLabel } from "../../../../decks/music-staff/src/chord-tones";
import type { ChordNotation } from "./diatonic-selection";
export { CHORD_TONE_DECKS };
export function isChordToneCard(note:Pick<NoteRow,"tags">):boolean { return note.tags.split(/\s+/).includes("chord-tones"); }
export function chordToneDisplayFields(note:Pick<NoteRow,"tags"|"fields">, notation:ChordNotation):Record<string,string> {
  return isChordToneCard(note) ? {Chord:chordToneLabel(note.fields[2],note.fields[3],notation)} : {};
}
