// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { parseMinorDegreeNotation, parseChordNotation, type MinorDegreeNotation } from "./diatonic-selection";
const STORAGE_KEY = "music-flashcards:minor-degree-notation";
const CHORD_STORAGE_KEY = "music-flashcards:chord-notation";
function loadChords() {
  try { return parseChordNotation(JSON.parse(localStorage.getItem(CHORD_STORAGE_KEY) ?? "{}")); }
  catch { return parseChordNotation(null); }
}
function load(): MinorDegreeNotation {
  try { return parseMinorDegreeNotation(localStorage.getItem(STORAGE_KEY)); }
  catch { return "im7"; }
}
// A notation preference, shared by the three diatonic decks, not a study range.
export const diatonicNotationPreference = $state({ value: load(), chords: loadChords() });
export function setChordNotation(key: string, value: string): void {
  diatonicNotationPreference.chords = parseChordNotation({ ...diatonicNotationPreference.chords, [key]: value });
  try { localStorage.setItem(CHORD_STORAGE_KEY, JSON.stringify(diatonicNotationPreference.chords)); }
  catch { /* The preference still applies for this session. */ }
}
export function setDiatonicNotation(value: string): void {
  diatonicNotationPreference.value = parseMinorDegreeNotation(value);
  try { localStorage.setItem(STORAGE_KEY, diatonicNotationPreference.value); }
  catch { /* The preference still applies for this session. */ }
}
