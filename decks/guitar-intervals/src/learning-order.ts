// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { GuitarIntervalCard } from "./cards";

const POWER_CHORD_ANCHORS = new Set([
  "r6-s5-f2", "r5-s4-f2", "r6-s4-f2", "r5-s3-f2",
]);
const MAJOR_THIRD_ANCHORS = new Set(["r6-s5-b1", "r5-s4-b1"]);
const ANCHOR_EXTENSIONS = new Set([
  "r4-s3-f2", "r3-s2-f3", "r2-s1-f2",
  "r4-s2-f3", "r3-s1-f3",
  "r4-s3-b1", "r3-s2-0", "r2-s1-b1",
  "r6-s1-0", "r1-s6-0",
]);

// Teach useful reference shapes before the rest of the board. The package
// shuffles within each group, keeping a run of identical shapes from becoming
// the answer cue. Do not sort the source cards: their array positions set IDs.
export function learningOrderGroup(card: GuitarIntervalCard): number {
  if (POWER_CHORD_ANCHORS.has(card.id)) return 0;
  if (MAJOR_THIRD_ANCHORS.has(card.id)) return 1;
  if (ANCHOR_EXTENSIONS.has(card.id)) return 2;

  const stringDistance = Math.abs(card.rootString - card.targetString);
  const fretDistance = Math.abs(card.fretOffset);
  if (stringDistance <= 2 && fretDistance <= 3) {
    if ([0, 7, 4].includes(card.semitones)) return 3;
    if ([3, 5].includes(card.semitones)) return 4;
    if ([10, 11].includes(card.semitones)) return 5;
    return 6;
  }
  if (stringDistance === 0 && fretDistance <= 4) return 7;
  if (fretDistance <= 3) return 8;
  return 9;
}
