// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_TUNING, TUNING_PRESETS, defaultBassStrings, matchingPreset, fretPitch, normalizeTuning } from './tuning';
import { fretboardMarkers } from './chord-fretboard';
import { describeChord } from './chords';
import { defaultChordProgress, loadChordProgress, saveChordProgress } from './chord-progress';

afterEach(() => vi.unstubAllGlobals());
it('offers all requested string counts and preserves sounding octaves', () => {
  expect(TUNING_PRESETS.slice(0, 9).map(p => p.id)).toEqual(['guitar-6', 'guitar-7', 'guitar-8', 'guitar-9', 'bass-4', 'bass-5', 'bass-6', 'bass-7', 'bass-8']);
  expect(fretPitch(TUNING_PRESETS.find(p => p.id === 'guitar-9')!.pitches, 9, 0)).toBe(25);
  expect(fretPitch(TUNING_PRESETS.find(p => p.id === 'bass-4')!.pitches, 4, 12)).toBe(40);
  expect(fretPitch(TUNING_PRESETS.find(p => p.id === 'bass-5')!.pitches, 5, 0)).toBe(23);
  expect(fretPitch([64, 59, 55, 50, 45, 38], 6, 2)).toBe(40);
  expect(fretPitch(DEFAULT_TUNING, 7, 0)).toBeNull();
});
it('moves markers with custom pitches, including reentrant tuning and extra strings', () => {
  const tuning = [60, 67, 55, 48, 41, 36, 31, 24, 19];
  const chord = describeChord('C', 'C', 'C');
  const markers = fretboardMarkers(chord, 12, [], tuning);
  expect(markers.filter(m => m.fret === 0 && m.role === 'root').map(m => m.string)).toEqual([1, 4, 6, 8]);
  expect(markers.find(m => m.string === 9 && m.fret === 5)?.role).toBe('root');
  for (const marker of markers) expect([0, 4, 7]).toContain((fretPitch(tuning, marker.string, marker.fret)!) % 12);
  expect(fretboardMarkers(describeChord('C/D', 'C', 'C'), 12, [8], [64, 59, 55, 50, 45, 40, 35, 26])
    .find(m => m.string === 8 && m.fret === 0)?.role).toBe('bass');
});
it('rejects malformed tunings and migrates six-string settings', () => {
  for (const value of [null, [], [60], Array(13).fill(60), [60, 50, 40, -1], [60, 50, 40, 128], [60, 50, 40, 40.5], ['60', 50, 40, 30]]) expect(normalizeTuning(value)).toEqual(DEFAULT_TUNING);
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ bassStrings: [4, 5, 6] }) });
  expect(loadChordProgress().tuning).toEqual(DEFAULT_TUNING);
  expect(loadChordProgress().bassStrings).toEqual([4, 5, 6]);
});
it('persists custom tuning and validates bass strings against its string count', () => {
  let stored: string;
  vi.stubGlobal('localStorage', { getItem: () => stored, setItem: (_: string, value: string) => stored = value });
  saveChordProgress({ ...defaultChordProgress(), tuning: [64, 59, 55, 50, 45, 40, 35, 30, 25], bassStrings: [7, 8, 9] });
  expect(loadChordProgress().bassStrings).toEqual([7, 8, 9]);
  expect(loadChordProgress().tuning).toHaveLength(9);
  saveChordProgress({ ...defaultChordProgress(), tuning: [43, 38, 33, 26], bassStrings: [4, 5, 6] });
  expect(loadChordProgress().tuning).toEqual([43, 38, 33, 26]);
  expect(loadChordProgress().bassStrings).toEqual([4]);
});
it('supports Stick geometry, reentrant instruments and duplicate preset pitches', () => {
  const stick = TUNING_PRESETS.find(p => p.id === 'stick-12')!;
  expect(normalizeTuning(stick.pitches)).toEqual(stick.pitches);
  expect(fretPitch(stick.pitches, 7, 12)).toBe(36);
  expect(fretPitch(stick.pitches, 12, 12)).toBe(71);
  const markers = fretboardMarkers(describeChord('C', 'C', 'C'), 12, [], stick.pitches);
  expect(markers.find(m => m.string === 7 && m.fret === 0)?.role).toBe('root');
  expect(normalizeTuning([64, 57])).toEqual([64, 57]);
  const uke = TUNING_PRESETS.find(p => p.id === 'ukulele-high-g')!;
  expect(defaultBassStrings(uke.pitches)).toEqual([2, 3, 4]);
  expect(matchingPreset([43, 38, 33, 28], 'double-bass')?.id).toBe('double-bass');
  expect(matchingPreset([43, 38, 33, 28], 'invalid')?.id).toBe('bass-4');
  let stored: string;
  vi.stubGlobal('localStorage', { getItem: () => stored, setItem: (_: string, value: string) => stored = value });
  saveChordProgress({ ...defaultChordProgress(), tuning: stick.pitches, tuningPreset: stick.id, bassStrings: stick.bassStrings! });
  expect(loadChordProgress().tuning).toEqual(stick.pitches);
  expect(loadChordProgress().bassStrings).toEqual([7, 8, 9, 10, 11, 12]);
  expect(loadChordProgress().tuningPreset).toBe('stick-12');
  for (const preset of TUNING_PRESETS) expect(normalizeTuning(preset.pitches)).toEqual(preset.pitches);
});
