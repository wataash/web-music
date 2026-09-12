// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { afterEach, expect, it, vi } from "vitest";
import { CHORD_SONGS } from "./chord-songs";
import { defaultChordProgress, loadChordProgress, saveChordProgress } from "./chord-progress";

afterEach(() => vi.unstubAllGlobals());

it("restores song positions and modes and resets them to defaults", () => {
  let value: string | null = null;
  vi.stubGlobal("localStorage", { getItem: () => value, setItem: (_: string, next: string) => { value = next; } });
  const progress = { ...defaultChordProgress(), songId: CHORD_SONGS[1].id,
    positions: { [CHORD_SONGS[0].id]: 1, [CHORD_SONGS[1].id]: 2 },
    listMode: true, uniqueChordsOnly: true, uniqueBySection: true, insertBlankBoards: true, revealed: false,
    bassStrings: [], fretCount: 12, keys: { [CHORD_SONGS[1].id]: "C" },
    views: { source: { open: true }, scroll: { x: 33, y: 1700 } } };
  saveChordProgress(progress);
  expect(loadChordProgress()).toEqual(progress);
  saveChordProgress(defaultChordProgress());
  expect(loadChordProgress()).toEqual(defaultChordProgress());
});

it("validates saved positions and tolerates invalid or unavailable storage", () => {
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ songId: "removed", positions: {
    [CHORD_SONGS[0].id]: 99999, [CHORD_SONGS[1].id]: -3, [CHORD_SONGS[2].id]: "12",
  }, listMode: "true" }) });
  expect(loadChordProgress()).toEqual({ ...defaultChordProgress(), positions: {
    [CHORD_SONGS[0].id]: CHORD_SONGS[0].chords.length - 1, [CHORD_SONGS[1].id]: 0,
  } });
  vi.stubGlobal("localStorage", { getItem: () => "{broken" });
  expect(loadChordProgress()).toEqual(defaultChordProgress());
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("full"); } });
  expect(loadChordProgress()).toEqual(defaultChordProgress());
  expect(() => saveChordProgress(defaultChordProgress())).not.toThrow();
});

it("sanitizes saved display settings and preserves an empty bass selection", () => {
  vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ bassStrings: [1, 1, 3, 9, "4"], fretCount: 99,
    keys: { [CHORD_SONGS[0].id]: "invalid" }, views: { scroll: { x: -1, y: 45 }, detail: { open: "yes" } } }) });
  const progress = loadChordProgress();
  expect(progress.bassStrings).toEqual([1, 3]);
  expect(progress.fretCount).toBe(24);
  expect(progress.keys).toEqual({});
  expect(progress.views).toEqual({ scroll: { y: 45 }, detail: {} });
});

it('migrates original chord positions and restores positions inside expanded repeats', async () => {
  const { extractIreal, scramble } = await import('@web-music/ireal');
  const { setImportedMetadata } = await import('./chord-metadata');
  const source = extractIreal('irealb://' + encodeURIComponent('Repeat=Example==Swing=C==1r34LbKcu7' + scramble('[C7XyQ|xXyQ|D7XyQ|xXyQZ') + '==0=0'));
  const song = { ...CHORD_SONGS[0], id: 'repeat', chords: source.chords };
  setImportedMetadata([{ id: song.id, metadata: source }]);
  try {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ positions: { repeat: 1 } }) });
    expect(loadChordProgress([song]).positions.repeat).toBe(2);
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ sequenceVersion: 1, positions: { repeat: 3 } }) });
    expect(loadChordProgress([song]).positions.repeat).toBe(3);
  } finally { setImportedMetadata([]); }
});
