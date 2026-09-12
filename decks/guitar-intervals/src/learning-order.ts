// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { GuitarIntervalCard } from "./cards";

// Movable voicings, strings 6 → 1, relative to the chord root's fret.
// These are teaching examples, not measured popularity rankings. null = mute.
export const CHORD_FORMS: readonly {
  name: string; level: number; root: number; frets: readonly (number | null)[];
  tones: readonly number[];
}[] = [
  { name: "E major", level: 1, root: 6, frets: [0, 2, 2, 1, 0, 0], tones: [0, 4, 7] },
  { name: "E minor", level: 1, root: 6, frets: [0, 2, 2, 0, 0, 0], tones: [0, 3, 7] },
  { name: "E7", level: 1, root: 6, frets: [0, 2, 0, 1, 0, 0], tones: [0, 4, 7, 10] },
  { name: "Emaj7", level: 1, root: 6, frets: [0, 2, 1, 1, 0, 0], tones: [0, 4, 7, 11] },
  { name: "Em7", level: 1, root: 6, frets: [0, 2, 0, 0, 0, 0], tones: [0, 3, 7, 10] },
  { name: "A major", level: 1, root: 5, frets: [null, 0, 2, 2, 2, 0], tones: [0, 4, 7] },
  { name: "A minor", level: 1, root: 5, frets: [null, 0, 2, 2, 1, 0], tones: [0, 3, 7] },
  { name: "A7", level: 1, root: 5, frets: [null, 0, 2, 0, 2, 0], tones: [0, 4, 7, 10] },
  { name: "Amaj7", level: 1, root: 5, frets: [null, 0, 2, 1, 2, 0], tones: [0, 4, 7, 11] },
  { name: "Am7", level: 1, root: 5, frets: [null, 0, 2, 0, 1, 0], tones: [0, 3, 7, 10] },
  // User's Cm9 (8,10,8,8,8,10), transposed to root fret zero.
  { name: "Cm9 (user form)", level: 2, root: 6, frets: [0, 2, 0, 0, 0, 2], tones: [0, 2, 3, 7, 10] },
  { name: "E9", level: 2, root: 6, frets: [0, 2, 0, 1, 0, 2], tones: [0, 2, 4, 7, 10] },
  { name: "Emaj9", level: 2, root: 6, frets: [0, 2, 1, 1, 0, 2], tones: [0, 2, 4, 7, 11] },
  { name: "E6", level: 2, root: 6, frets: [0, 2, 2, 1, 2, 0], tones: [0, 4, 7, 9] },
  { name: "E13", level: 2, root: 6, frets: [0, null, 0, 1, 2, 2], tones: [0, 2, 4, 9, 10] },
  { name: "Esus4", level: 2, root: 6, frets: [0, 2, 2, 2, 0, 0], tones: [0, 5, 7] },
  { name: "Eadd9", level: 2, root: 6, frets: [0, 2, 4, 1, 0, 0], tones: [0, 2, 4, 7] },
  { name: "A9", level: 2, root: 5, frets: [null, 0, -1, 0, 0, 0], tones: [0, 2, 4, 7, 10] },
  { name: "Am9", level: 2, root: 5, frets: [null, 0, -2, 0, 0, 0], tones: [0, 2, 3, 7, 10] },
  { name: "Amaj9", level: 2, root: 5, frets: [null, 0, -1, 1, 0, 0], tones: [0, 2, 4, 7, 11] },
  { name: "A6", level: 2, root: 5, frets: [null, 0, 2, 2, 2, 2], tones: [0, 4, 7, 9] },
  { name: "Asus4", level: 2, root: 5, frets: [null, 0, 2, 2, 3, 0], tones: [0, 5, 7] },
  { name: "Asus2", level: 2, root: 5, frets: [null, 0, 2, 2, 0, 0], tones: [0, 2, 7] },
  { name: "D major", level: 3, root: 4, frets: [null, null, 0, 2, 3, 2], tones: [0, 4, 7] },
  { name: "D minor", level: 3, root: 4, frets: [null, null, 0, 2, 3, 1], tones: [0, 3, 7] },
  { name: "D7", level: 3, root: 4, frets: [null, null, 0, 2, 1, 2], tones: [0, 4, 7, 10] },
  { name: "Dmaj7", level: 3, root: 4, frets: [null, null, 0, 2, 2, 2], tones: [0, 4, 7, 11] },
  { name: "Dm7", level: 3, root: 4, frets: [null, null, 0, 2, 1, 1], tones: [0, 3, 7, 10] },
  { name: "B major inversion", level: 4, root: 2, frets: [null, null, 1, -1, 0, -1], tones: [0, 4, 7] },
  { name: "G major inversion", level: 4, root: 3, frets: [null, null, 0, 0, 0, -2], tones: [0, 4, 7] },
];

export function formIncludes(form: typeof CHORD_FORMS[number], card: GuitarIntervalCard): boolean {
  return card.rootString === form.root && form.frets[6 - card.targetString] === card.fretOffset;
}

function isReference(card: GuitarIntervalCard): boolean {
  return (Math.abs(card.rootString - card.targetString) <= 2 && Math.abs(card.fretOffset) <= 3
    && [0, 4, 7].includes(card.semitones))
    || ([1, 6].includes(card.rootString) && [1, 6].includes(card.targetString) && card.fretOffset === 0);
}

// Reasons are also used by the local review report. Each source card retains
// its original position (numeric IDs depend on it).
export function learningReason(card: GuitarIntervalCard): string {
  const forms = CHORD_FORMS.filter(form => formIncludes(form, card));
  if (forms.length) return forms.map(form => form.name).join(", ");
  if (isReference(card)) return "Octave, fifth or major-third reference";
  if ([0, 3, 4, 7, 10, 11].includes(card.semitones)) return "Chord tones across roots and voicings";
  if ([2, 5, 9].includes(card.semitones)) return "9/11/13 and melodic connections";
  return "Altered intervals and remaining positions";
}

function priority(card: GuitarIntervalCard): number {
  const chordTone = [0, 3, 4, 7, 10, 11].includes(card.semitones);
  const natural = [2, 5, 9].includes(card.semitones);
  // Musical role before distance: a high-string tone over a bass root need
  // not wait behind every adjacent-string interval.
  return (chordTone ? 0 : natural ? 100 : 200)
    + (card.rootString >= 5 ? 0 : card.rootString === 4 ? 20 : 40)
    + Math.abs(card.fretOffset) * 2 + Math.abs(card.rootString - card.targetString);
}

export function difficultyLevels(cards: readonly GuitarIntervalCard[]): ReadonlyMap<string, number> {
  const levels = new Map<string, number>();
  for (const card of cards) {
    const deadlines = CHORD_FORMS.filter(form => formIncludes(form, card)).map(form => form.level);
    if (isReference(card)) deadlines.push(1);
    if (deadlines.length) levels.set(card.id, Math.min(...deadlines));
  }
  for (const nearby of [true, false]) {
    const band = cards.filter(card => (Math.abs(card.fretOffset) <= 3) === nearby);
    const core = band.filter(card => levels.get(card.id) === 1).length;
    const remaining = band.filter(card => !levels.has(card.id))
      .sort((a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id));
    let next = 0;
    // Wide stretches start later unless a named form explicitly needs them.
    const start = nearby ? 2 : 3;
    for (let level = start; level <= 10; level++) {
      const target = core + Math.ceil((band.length - core) * (level - start + 1) / (11 - start));
      const already = band.filter(card => (levels.get(card.id) ?? 11) <= level).length;
      for (let count = already; count < target && next < remaining.length; count++) {
        levels.set(remaining[next++].id, level);
      }
    }
  }
  return levels;
}
