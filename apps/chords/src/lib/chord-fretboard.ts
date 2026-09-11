// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { GUITAR_OPEN_STRINGS } from "@web-music/practice-ui/guitar";
import type { ChordDescription } from "./chords";

export const DEFAULT_FRET_COUNT = 24;
export const MAX_FRET_COUNT = 24;
export const CHORD_BOARD_NUT_X = 54;
export const CHORD_BOARD_FRET_WIDTH = 48;
export const CHORD_BOARD_HEIGHT = 282;
export const DEFAULT_BASS_STRINGS: readonly number[] = [4, 5, 6];

export type FretboardMarker = Readonly<{
  string: number;
  fret: number;
  label: string;
  role: "root" | "tone" | "bass";
}>;

export function clampFretCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_FRET_COUNT;
  }
  return Math.min(MAX_FRET_COUNT, Math.max(1, Math.round(value)));
}

export function fretboardMarkers(
  chord: ChordDescription,
  fretCount = DEFAULT_FRET_COUNT,
  bassStrings: readonly number[] = DEFAULT_BASS_STRINGS,
): readonly FretboardMarker[] {
  const visibleFretCount = clampFretCount(fretCount);
  const labels = new Map<
    number,
    Readonly<{ label: string; role: FretboardMarker["role"] }>
  >();
  for (const tone of chord.tones) {
    labels.set(tone.pitchClass, {
      label: tone.interval,
      role: tone.interval === "R" ? "root" : "tone",
    });
  }
  return GUITAR_OPEN_STRINGS.flatMap((openPitch, stringIndex) =>
    Array.from({ length: visibleFretCount + 1 }, (_, fret) => {
      const pitchClass = (openPitch + fret) % 12;
      const marker = chord.bass?.pitchClass === pitchClass && bassStrings.includes(stringIndex + 1)
        ? { label: labels.get(pitchClass)?.label ?? "B", role: "bass" as const }
        : labels.get(pitchClass);
      return marker
        ? {
            string: stringIndex + 1,
            fret,
            label: marker.label,
            role: marker.role,
          }
        : null;
    }).filter((marker): marker is FretboardMarker => marker !== null),
  );
}
