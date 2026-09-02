// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const CHILD_ORDER_BY_PARENT = new Map<string, readonly string[]>([
  // The empty prefix is the parent of every top-level deck.
  [
    "",
    [
      "Music Staff",
      "Music Staff (with Octave Numbers)",
      "Intervals",
      "Interval Identification",
      "Guitar Fretboard",
      "Guitar Intervals",
      "(Experimental) Circle of Fifths",
    ],
  ],
  [
    "(Experimental) Circle of Fifths",
    [
      "Note → Cell",
      "Cell → All Notes",
      "(Experimental) Intervals",
    ],
  ],
  [
    "(Experimental) Circle of Fifths::Note → Cell",
    ["Note → Outer (Major) Cell", "Note → Inner (Minor) Cell"],
  ],
  [
    "(Experimental) Circle of Fifths::Cell → All Notes",
    ["Outer (Major) Cell → Notes", "Inner (Minor) Cell → Notes"],
  ],
  [
    "(Experimental) Circle of Fifths::(Experimental) Intervals",
    ["♭3", "Δ3"],
  ],
  ["Music Staff", ["Staff → Note"]],
  [
    "Music Staff (with Octave Numbers)",
    ["Staff → Note", "Note → Staff"],
  ],
  [
    "Music Staff::Staff → Note",
    ["Treble Clef", "Bass Clef", "Alto Clef", "Tenor Clef"],
  ],
  [
    "Music Staff (with Octave Numbers)::Staff → Note",
    ["Treble Clef", "Bass Clef", "Alto Clef", "Tenor Clef"],
  ],
  [
    "Music Staff (with Octave Numbers)::Note → Staff",
    ["Treble Clef", "Bass Clef", "Alto Clef", "Tenor Clef"],
  ],
]);

export function compareDeckNames(left: string, right: string): number {
  const leftParts = left.split("::");
  const rightParts = right.split("::");
  const sharedLength = Math.min(leftParts.length, rightParts.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (leftParts[index] === rightParts[index]) continue;
    const parentName = leftParts.slice(0, index).join("::");
    const childOrder = CHILD_ORDER_BY_PARENT.get(parentName);
    const leftOrder = childOrder?.indexOf(leftParts[index]) ?? -1;
    const rightOrder = childOrder?.indexOf(rightParts[index]) ?? -1;
    if (leftOrder >= 0 && rightOrder >= 0) return leftOrder - rightOrder;
    return leftParts[index].localeCompare(rightParts[index]);
  }
  return leftParts.length - rightParts.length;
}
