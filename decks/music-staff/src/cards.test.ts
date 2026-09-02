// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import {
  CARDS,
  CLEF_RANGES,
  CLEFS,
  diatonicIndex,
  DIRECTIONS,
  findCard,
  naturalPitchesInRange,
  parsePitch,
  pitchAtDiatonicIndex,
  type Clef,
  type Direction,
} from "./cards";

function cardsFor(direction: Direction, clef: Clef) {
  return CARDS.filter(
    (card) => card.direction === direction && card.clef === clef,
  );
}

describe("staff reading card data", () => {
  test("creates thirty-three natural notes per clef in both directions", () => {
    expect(CLEFS).toEqual(["treble", "bass", "alto", "tenor"]);
    expect(DIRECTIONS).toEqual(["staff-to-note", "note-to-staff"]);
    for (const direction of DIRECTIONS) {
      for (const clef of CLEFS) {
        expect(cardsFor(direction, clef)).toHaveLength(33);
      }
      expect(
        CARDS.filter((card) => card.direction === direction),
      ).toHaveLength(132);
    }
    expect(CARDS).toHaveLength(264);
  });

  test("runs from the lowest to the highest position of each clef", () => {
    expect(CLEF_RANGES).toEqual({
      treble: { lowest: "G2", highest: "D7" },
      bass: { lowest: "B0", highest: "F5" },
      alto: { lowest: "A1", highest: "E6" },
      tenor: { lowest: "F1", highest: "C6" },
    });
    for (const direction of DIRECTIONS) {
      for (const clef of CLEFS) {
        const cards = cardsFor(direction, clef);
        expect(cards[0].pitch).toBe(CLEF_RANGES[clef].lowest);
        expect(cards[32].pitch).toBe(CLEF_RANGES[clef].highest);
      }
    }
    const treble = cardsFor("staff-to-note", "treble").map(
      ({ pitch }) => pitch,
    );
    expect(treble.slice(0, 3)).toEqual(["G2", "A2", "B2"]);
    expect(treble.slice(-3)).toEqual(["B6", "C7", "D7"]);
    expect(treble).toContain("C4");

    expect(cardsFor("note-to-staff", "bass")[0].octave).toBe(0);
    expect(cardsFor("note-to-staff", "bass")[32].octave).toBe(5);
  });

  test("uses stable unique ids", () => {
    expect(new Set(CARDS.map(({ id }) => id)).size).toBe(264);
    expect(CARDS[0].id).toBe("staff-to-note-treble-g2");
    expect(CARDS[32].id).toBe("staff-to-note-treble-d7");
    expect(CARDS[33].id).toBe("staff-to-note-bass-b0");
    expect(CARDS[132].id).toBe("note-to-staff-treble-g2");
    expect(findCard("note-to-staff", "tenor", "C5")?.id).toBe(
      "note-to-staff-tenor-c5",
    );
    expect(findCard("staff-to-note", "tenor", "D6")).toBeUndefined();
  });

  test("keeps pitch, note, and octave consistent", () => {
    for (const card of CARDS) {
      expect(card.pitch).toBe(`${card.note}${card.octave}`);
      expect(parsePitch(card.pitch)).toEqual({
        note: card.note,
        octave: card.octave,
      });
      expect(card.id).toBe(
        `${card.direction}-${card.clef}-${card.pitch.toLowerCase()}`,
      );
    }
  });

  test("tags every card with its clef and drill direction", () => {
    expect(findCard("staff-to-note", "alto", "C4")?.tags).toEqual([
      "clef::alto",
      "direction::staff-to-note",
    ]);
    expect(findCard("note-to-staff", "alto", "C4")?.tags).toEqual([
      "clef::alto",
      "direction::note-to-staff",
    ]);
    for (const card of CARDS) {
      expect(card.tags).toEqual([
        `clef::${card.clef}`,
        `direction::${card.direction}`,
      ]);
    }
  });

  test("numbers diatonic steps so middle C is C4", () => {
    expect(diatonicIndex({ note: "C", octave: 4 })).toBe(28);
    expect(diatonicIndex({ note: "B", octave: 3 })).toBe(27);
    expect(diatonicIndex({ note: "D", octave: 4 })).toBe(29);
    expect(pitchAtDiatonicIndex(28)).toEqual({ note: "C", octave: 4 });
    expect(pitchAtDiatonicIndex(27)).toEqual({ note: "B", octave: 3 });
    expect(naturalPitchesInRange("alto")).toHaveLength(33);
  });

  test("rejects pitches that are not natural notes with an octave", () => {
    expect(() => parsePitch("H4")).toThrow('like "C4"');
    expect(() => parsePitch("C#4")).toThrow('like "C4"');
    expect(() => parsePitch("C")).toThrow('like "C4"');
    expect(() => parsePitch("c4")).toThrow('like "C4"');
  });
});
