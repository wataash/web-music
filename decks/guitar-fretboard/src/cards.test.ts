// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import {
  CARDS,
  FRET_COUNT,
  NOTE_NAMES,
  NOTE_TO_POSITIONS_CARDS,
  NOTE_TO_POSITIONS_NOTES,
  OPEN_STRING_PITCH_CLASSES,
  POSITION_TO_NOTE_CARDS,
  STRING_COUNT,
} from "./cards";

describe("fretboard card data", () => {
  test("uses the requested flat and sharp spellings", () => {
    expect(NOTE_NAMES.both).toEqual([
      "A",
      "A♯B♭",
      "B",
      "C",
      "C♯D♭",
      "D",
      "D♯E♭",
      "E",
      "F",
      "F♯G♭",
      "G",
      "G♯A♭",
    ]);
    expect(NOTE_NAMES.flats).toEqual([
      "A",
      "B♭",
      "B",
      "C",
      "D♭",
      "D",
      "E♭",
      "E",
      "F",
      "G♭",
      "G",
      "A♭",
    ]);
    expect(NOTE_NAMES.sharps).toEqual([
      "A",
      "A♯",
      "B",
      "C",
      "C♯",
      "D",
      "D♯",
      "E",
      "F",
      "F♯",
      "G",
      "G♯",
    ]);
  });

  test("asks each accidental under its sharp, flat and both-names spellings", () => {
    expect(NOTE_TO_POSITIONS_NOTES.map(({ note }) => note)).toEqual([
      "A",
      "A♯",
      "B♭",
      "A♯B♭",
      "B",
      "C",
      "C♯",
      "D♭",
      "C♯D♭",
      "D",
      "D♯",
      "E♭",
      "D♯E♭",
      "E",
      "F",
      "F♯",
      "G♭",
      "F♯G♭",
      "G",
      "G♯",
      "A♭",
      "G♯A♭",
    ]);
    expect(
      NOTE_TO_POSITIONS_NOTES.filter(
        ({ spelling }) => spelling === "natural",
      ),
    ).toHaveLength(7);
    expect(
      NOTE_TO_POSITIONS_NOTES.filter(
        ({ spelling }) => spelling === "enharmonic",
      ),
    ).toHaveLength(5);
  });

  test("asks each direction from a deck of its own", () => {
    expect(OPEN_STRING_PITCH_CLASSES).toEqual([7, 2, 10, 5, 0, 7]);
    expect(POSITION_TO_NOTE_CARDS).toHaveLength(
      STRING_COUNT * (FRET_COUNT + 1),
    );
    expect(NOTE_TO_POSITIONS_CARDS).toHaveLength(STRING_COUNT * 22);
    expect(CARDS).toHaveLength(282);
    expect(
      POSITION_TO_NOTE_CARDS.filter(({ spelling }) => spelling === "natural"),
    ).toHaveLength(90);
    expect(
      POSITION_TO_NOTE_CARDS.filter(
        ({ spelling }) => spelling === "enharmonic",
      ),
    ).toHaveLength(60);
    expect(
      NOTE_TO_POSITIONS_CARDS.filter(({ spelling }) => spelling === "natural"),
    ).toHaveLength(42);
    expect(
      NOTE_TO_POSITIONS_CARDS.filter(({ spelling }) => spelling === "flat"),
    ).toHaveLength(30);
    expect(new Set(CARDS.map(({ id }) => id)).size).toBe(CARDS.length);
    expect(CARDS[0].id).toBe("position-to-note-string-1-fret-0");
    expect(CARDS[150].id).toBe("note-to-positions-natural-string-1-pitch-0");
  });

  test("answers a position with both names where a pitch has two", () => {
    expect(noteAt(1, 0)).toBe("E");
    expect(noteAt(1, 12)).toBe("E");
    expect(noteAt(1, 24)).toBe("E");
    expect(noteAt(2, 1)).toBe("C");
    expect(noteAt(3, 0)).toBe("G");
    expect(noteAt(3, 1)).toBe("G♯A♭");
    expect(noteAt(6, 1)).toBe("F");
    expect(noteAt(6, 2)).toBe("F♯G♭");
    expect(noteAt(7, 0)).toBeUndefined();
  });

  test("includes fret zero only when the requested note is the open string", () => {
    expect(fretsFor(1, "E")).toEqual([0, 12, 24]);
    expect(fretsFor(1, "F")).toEqual([1, 13]);
    expect(fretsFor(2, "B")).toEqual([0, 12, 24]);
    expect(fretsFor(2, "C♯")).toEqual([2, 14]);
    expect(fretsFor(2, "D♭")).toEqual([2, 14]);
    expect(fretsFor(2, "C♯D♭")).toEqual([2, 14]);
    expect(fretsFor(1, "F♭")).toBeUndefined();

    const notesWithOpenPositions = new Set(
      NOTE_TO_POSITIONS_CARDS.filter(({ frets }) => frets.includes(0)).map(
        ({ note }) => note,
      ),
    );
    expect(notesWithOpenPositions).toEqual(
      new Set(["A", "B", "D", "E", "G"]),
    );
  });
});

function noteAt(string: number, fret: number): string | undefined {
  return POSITION_TO_NOTE_CARDS.find(
    (card) => card.string === string && card.fret === fret,
  )?.note;
}

function fretsFor(
  string: number,
  note: string,
): readonly number[] | undefined {
  return NOTE_TO_POSITIONS_CARDS.find(
    (card) => card.string === string && card.note === note,
  )?.frets;
}
