// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { POSITIONS } from "@circle-of-fifths/core";
import { describe, expect, test } from "vitest";

import {
  CARDS,
  CELL_TO_NOTES_CARDS,
  formatDisplayNote,
  INTERVAL_CARDS,
  NOTE_TO_CELL_CARDS,
} from "./cards";

describe("Anki card data", () => {
  test("contains twenty flat thirds and twenty-one major thirds", () => {
    expect(INTERVAL_CARDS).toHaveLength(41);
    expect(
      INTERVAL_CARDS.filter(({ interval }) => interval === "flat3"),
    ).toHaveLength(20);
    expect(
      INTERVAL_CARDS.filter(({ interval }) => interval === "major3"),
    ).toHaveLength(21);
  });

  test("creates note-to-cell cards for every spelling", () => {
    const outerNotes = NOTE_TO_CELL_CARDS.filter(
      ({ ring }) => ring === "outer",
    ).map(({ note }) => note);
    const innerNotes = NOTE_TO_CELL_CARDS.filter(
      ({ ring }) => ring === "inner",
    ).map(({ note }) => note);

    expect(outerNotes).toEqual(POSITIONS.flatMap(({ major }) => major));
    expect(innerNotes).toEqual(POSITIONS.flatMap(({ minor }) => minor));
    expect(outerNotes).toHaveLength(35);
    expect(innerNotes).toHaveLength(35);
    expect(CARDS).toHaveLength(135);
  });

  test("creates a cell-to-notes card with every spelling in each cell", () => {
    expect(CELL_TO_NOTES_CARDS).toHaveLength(24);
    expect(
      CELL_TO_NOTES_CARDS.filter(({ ring }) => ring === "outer"),
    ).toHaveLength(12);
    expect(
      CELL_TO_NOTES_CARDS.filter(({ ring }) => ring === "inner"),
    ).toHaveLength(12);
    expect(
      CELL_TO_NOTES_CARDS.map(({ ring, hour, notes }) => ({
        key: `${ring}:${hour}`,
        notes,
      })),
    ).toEqual([
      ...POSITIONS.map(({ hour, major }) => ({
        key: `outer:${hour}`,
        notes: major,
      })),
      ...POSITIONS.map(({ hour, minor }) => ({
        key: `inner:${hour}`,
        notes: minor,
      })),
    ]);
  });

  test("uses unique ids and interval questions", () => {
    expect(new Set(CARDS.map(({ id }) => id)).size).toBe(CARDS.length);
    expect(
      new Set(
        INTERVAL_CARDS.map(
          ({ questionNote, interval }) => `${interval}:${questionNote}`,
        ),
      ).size,
    ).toBe(INTERVAL_CARDS.length);
  });

  test("uses only notes present in the diagram", () => {
    const availableNotes = new Set<string>(
      POSITIONS.flatMap(({ major, minor }) => [...major, ...minor]),
    );

    for (const card of CARDS) {
      const notes =
        card.kind === "interval"
          ? [card.outerNote, card.innerNote]
          : card.kind === "note-to-cell"
            ? [card.note]
            : card.notes;
      for (const note of notes) {
        expect(availableNotes.has(note), card.id).toBe(true);
      }
    }
  });

  test("formats accidentals for display", () => {
    expect(formatDisplayNote("cb")).toBe("C♭");
    expect(formatDisplayNote("c##")).toBe("C𝄪");
    expect(formatDisplayNote("bbb")).toBe("B𝄫");
  });
});
