// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export const GUITAR_OPEN_STRINGS = [64, 59, 55, 50, 45, 40] as const;
const MAX_FRET = 24;

export function fretPitch(tuning: readonly number[], string: number, fret: number): number | null {
  if (!Number.isInteger(string) || !Number.isInteger(fret) || fret < 0) return null;
  const open = tuning[string - 1];
  return open === undefined ? null : open + fret;
}

export function guitarSemitone(guitarString: number, fret: number): number | null {
  return fret > MAX_FRET ? null : fretPitch(GUITAR_OPEN_STRINGS, guitarString, fret);
}
