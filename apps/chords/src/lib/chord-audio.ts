// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { ChordDescription } from "./chords";

// One close voicing for hearing the answer, rather than sounding every
// occurrence of each pitch across the neck. Slash basses sit below the root.
export function chordSemitones(chord: ChordDescription): readonly number[] {
  if (chord.noChord || chord.tones.length === 0) return [];
  const root = chord.tones[0].pitchClass;
  const tones = chord.tones.map(({ pitchClass }) => 48 + root + (pitchClass - root + 12) % 12);
  return chord.bass ? [36 + chord.bass.pitchClass, ...tones] : tones;
}
