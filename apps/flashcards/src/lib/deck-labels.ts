// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Display labels leave the stored names used by progress and settings intact.

const EXPERIMENTAL_DECK_NAMES: ReadonlySet<string> = new Set([
  "Music Staff (Movable Do)",
  "Intervals",
  "Interval Identification",
]);

export function deckLabel(name: string): string {
  const baseName = name.split("::").at(-1) ?? name;
  return EXPERIMENTAL_DECK_NAMES.has(name)
    ? `(Experimental) ${baseName}`
    : baseName;
}
