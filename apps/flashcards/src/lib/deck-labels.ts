// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Display labels leave the stored names used by progress and settings intact.

const EXPERIMENTAL_DECK_NAMES: ReadonlySet<string> = new Set([
  "Music Staff (with Octave Numbers)",
  "Music Staff (Movable Do)",
  "Chord Tones (Triads)",
  "Chord Tones (Four-note Chords)",
  "Intervals",
  "Interval Identification",
]);

const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "(Experimental) Circle of Fifths": "Circle of Fifths",
  "(Experimental) Circle of Fifths::Cell → All Notes": "(Experimental) Cell → All Notes",
};

export function deckLabel(name: string): string {
  if (DISPLAY_NAMES[name]) return DISPLAY_NAMES[name];
  const baseName = name.split("::").at(-1) ?? name;
  return EXPERIMENTAL_DECK_NAMES.has(name)
    ? `(Experimental) ${baseName}`
    : baseName;
}

export function deckPathLabel(name: string): string {
  const parts = name.split("::");
  return parts.map((_, index) => DISPLAY_NAMES[parts.slice(0, index + 1).join("::")] ?? parts[index]).join("::");
}
