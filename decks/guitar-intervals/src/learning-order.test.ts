// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { GUITAR_INTERVAL_CARDS } from "./cards";
import { CHORD_FORMS, difficultyLevels, formIncludes } from "./learning-order";

const levels = difficultyLevels(GUITAR_INTERVAL_CARDS);

describe("guitar interval learning priorities", () => {
  it("includes the complete Cm9 form by level 2, including the high-string ninth", () => {
    for (const id of ["r6-s5-f2", "r6-s4-0", "r6-s3-0", "r6-s2-0", "r6-s1-f2"]) {
      expect(levels.get(id), id).toBeLessThanOrEqual(2);
    }
    expect(levels.get("r6-s1-f2")).toBe(2);
  });

  it("keeps each complete teaching voicing within its promised level", () => {
    // Independently verify the pitches and completeness of the fixture forms.
    const open = [40, 45, 50, 55, 59, 64];
    for (const form of CHORD_FORMS) {
      expect(form.frets).toHaveLength(6);
      expect(form.frets[6 - form.root]).toBe(0);
      const pitches = form.frets.flatMap((fret, i) => fret === null ? [] :
        [((open[i] + fret - open[6 - form.root]) % 12 + 12) % 12]);
      expect([...new Set(pitches)].sort((a,b) => a-b), form.name).toEqual(form.tones);
      const cards = GUITAR_INTERVAL_CARDS.filter(card => formIncludes(form, card));
      expect(cards.length, form.name).toBe(pitches.length - 1);
      for (const card of cards) expect(levels.get(card.id), `${form.name}: ${card.id}`).toBeLessThanOrEqual(form.level);
    }
  });

  it("covers all shapes deterministically without sudden late jumps", () => {
    expect(levels.size).toBe(462);
    expect(difficultyLevels([...GUITAR_INTERVAL_CARDS].reverse())).toEqual(levels);
    for (const window of [{left:3,right:3}, {left:6,right:6}, {left:1,right:3}]) {
      const counts = Array.from({length:10}, (_, i) => GUITAR_INTERVAL_CARDS.filter(card =>
        card.fretOffset >= -window.left && card.fretOffset <= window.right && levels.get(card.id)! <= i+1).length);
      expect(counts[0]).toBeGreaterThanOrEqual(25);
      expect(counts[0]).toBeLessThanOrEqual(55);
      expect(counts[9]).toBe(GUITAR_INTERVAL_CARDS.filter(card => card.fretOffset >= -window.left && card.fretOffset <= window.right).length);
      for (let i=1;i<10;i++) {
        expect(counts[i]).toBeGreaterThan(counts[i-1]);
        expect(counts[i]-counts[i-1]).toBeLessThanOrEqual(55);
      }
    }
  });
});
