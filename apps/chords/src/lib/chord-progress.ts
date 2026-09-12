// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { practiceEntries } from "./chord-metadata";
import { DEFAULT_TUNING, normalizeTuning, matchingPreset } from "./tuning";
import { CHORD_SONGS, type ChordSong } from "./chord-songs";
import { PRACTICE_KEYS } from "./chords";
import { clampFretCount, DEFAULT_BASS_STRINGS, DEFAULT_FRET_COUNT } from "./chord-fretboard";

export type ChordView = { open?: boolean; x?: number; y?: number };

const STORAGE_KEY = "chord-practice-progress";

export function defaultChordProgress() {
  return { minorNotation: '-' as '-' | 'm', highlightAnnotations: false, chartZoom: 1, sequenceVersion: 1, songId: CHORD_SONGS[0].id, positions: {} as Record<string, number>,
    listMode: false, uniqueChordsOnly: false, uniqueBySection: false, insertBlankBoards: false,
    tuning: [...DEFAULT_TUNING], tuningPreset: 'guitar-6', revealed: true, separator: false, bassStrings: [...DEFAULT_BASS_STRINGS], fretCount: DEFAULT_FRET_COUNT,
    keys: {} as Record<string, string>, views: {} as Record<string, ChordView> };
}

export function loadChordProgress(songs: readonly ChordSong[] = CHORD_SONGS): ReturnType<typeof defaultChordProgress> {
  const progress = defaultChordProgress();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!stored || typeof stored !== "object") return progress;
    if (songs.some(song => song.id === stored.songId)) progress.songId = stored.songId;
    for (const song of songs) {
      const index = stored.positions?.[song.id];
      if (Number.isInteger(index)) {
        const entries = practiceEntries(song.id, song.chords.length);
        const position = stored.sequenceVersion === 1 ? index : entries.findIndex(entry => entry.chordIndex === index);
        progress.positions[song.id] = Math.max(0, Math.min(entries.length - 1, position < 0 ? index : position));
      }
      if (PRACTICE_KEYS.includes(stored.keys?.[song.id])) progress.keys[song.id] = stored.keys[song.id];
    }
    if (stored.minorNotation === 'm') progress.minorNotation = 'm';
    if (typeof stored.highlightAnnotations === 'boolean') progress.highlightAnnotations = stored.highlightAnnotations;
    if ([1, 1.25, 1.5, 2].includes(stored.chartZoom)) progress.chartZoom = stored.chartZoom;
    progress.tuning = normalizeTuning(stored.tuning);
    progress.tuningPreset = matchingPreset(progress.tuning, stored.tuningPreset)?.id ?? '';
    if (Array.isArray(stored.bassStrings)) progress.bassStrings = [...new Set<number>(stored.bassStrings.filter((n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= progress.tuning.length))];
    progress.fretCount = clampFretCount(stored.fretCount);
    for (const [key, view] of Object.entries(stored.views ?? {})) {
      if (!view || typeof view !== "object") continue;
      const valid: ChordView = {};
      if ("open" in view && typeof view.open === "boolean") valid.open = view.open;
      for (const axis of ["x", "y"] as const) {
        const value = (view as Record<string, unknown>)[axis];
        if (typeof value === "number" && Number.isFinite(value) && value >= 0) valid[axis] = value;
      }
      progress.views[key] = valid;
    }
    for (const key of ["listMode", "uniqueChordsOnly", "uniqueBySection", "insertBlankBoards", "revealed", "separator"] as const) {
      if (typeof stored[key] === "boolean") progress[key] = stored[key];
    }
    if (!progress.insertBlankBoards) { progress.revealed = true; progress.separator = false; }
    if ((progress.positions[progress.songId] ?? 0) !== 0) progress.separator = false;
  } catch { /* Storage may be unavailable or contain invalid JSON. */ }
  return progress;
}

export function saveChordProgress(progress: ReturnType<typeof defaultChordProgress>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch { /* Practice remains usable when storage is unavailable. */ }
}
