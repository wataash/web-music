// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export const GUITAR_OPEN_STRINGS = [64, 59, 55, 50, 45, 40] as const;
const MAX_FRET = 24;

export function guitarSemitone(guitarString: number, fret: number): number | null {
  const open = GUITAR_OPEN_STRINGS[guitarString - 1];
  if (open === undefined) return null;
  if (!Number.isInteger(fret) || fret < 0 || fret > MAX_FRET) return null;
  return open + fret;
}
