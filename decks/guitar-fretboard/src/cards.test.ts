// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import {
  CARDS,
  FRET_COUNT,
  NOTE_NAMES,
  NOTE_TO_POSITIONS_CARDS,
  OPEN_STRING_PITCH_CLASSES,
  POSITION_TO_NOTE_CARDS,
  STRING_COUNT,
  type NoteSystem,
} from "./cards";

describe("fretboard card data", () => {
  test("uses the requested flat and sharp spellings", () => {
    expect(NOTE_NAMES.naturals).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
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

  test("creates the natural subset and both complete spelling systems", () => {
    expect(OPEN_STRING_PITCH_CLASSES).toEqual([7, 2, 10, 5, 0, 7]);
    expect(POSITION_TO_NOTE_CARDS).toHaveLength(
      2 * STRING_COUNT * (FRET_COUNT + 1) + 90,
    );
    expect(NOTE_TO_POSITIONS_CARDS).toHaveLength(
      2 * STRING_COUNT * 12 + STRING_COUNT * 7,
    );
    expect(CARDS).toHaveLength(576);
    expect(
      POSITION_TO_NOTE_CARDS.filter(({ system }) => system === "naturals"),
    ).toHaveLength(90);
    expect(
      POSITION_TO_NOTE_CARDS.filter(({ system }) => system === "flats"),
    ).toHaveLength(150);
    expect(
      NOTE_TO_POSITIONS_CARDS.filter(({ system }) => system === "naturals"),
    ).toHaveLength(42);
    expect(
      NOTE_TO_POSITIONS_CARDS.filter(({ system }) => system === "flats"),
    ).toHaveLength(72);
    expect(new Set(CARDS.map(({ id }) => id)).size).toBe(CARDS.length);
  });

  test("appends natural cards without moving existing cards", () => {
    expect(CARDS[0].id).toBe("flats-string-1-fret-0");
    expect(CARDS[150].id).toBe("sharps-string-1-fret-0");
    expect(CARDS[300].id).toBe(
      "flats-note-to-positions-string-1-pitch-0",
    );
    expect(CARDS[372].id).toBe(
      "sharps-note-to-positions-string-1-pitch-0",
    );
    expect(CARDS[444].id).toBe("naturals-string-1-fret-0");
  });

  test("maps representative guitar positions and octaves correctly", () => {
    expect(noteAt("flats", 1, 0)).toBe("E");
    expect(noteAt("flats", 1, 12)).toBe("E");
    expect(noteAt("flats", 1, 24)).toBe("E");
    expect(noteAt("flats", 2, 1)).toBe("C");
    expect(noteAt("flats", 3, 1)).toBe("A♭");
    expect(noteAt("sharps", 3, 1)).toBe("G♯");
    expect(noteAt("flats", 6, 1)).toBe("F");
    expect(noteAt("sharps", 6, 2)).toBe("F♯");
    expect(noteAt("naturals", 3, 0)).toBe("G");
    expect(noteAt("naturals", 3, 1)).toBeUndefined();
  });

  test("includes fret zero only when the requested note is the open string", () => {
    expect(fretsFor("flats", 1, "E")).toEqual([0, 12, 24]);
    expect(fretsFor("flats", 1, "F")).toEqual([1, 13]);
    expect(fretsFor("sharps", 2, "B")).toEqual([0, 12, 24]);
    expect(fretsFor("sharps", 2, "C♯")).toEqual([2, 14]);
    expect(fretsFor("naturals", 1, "E")).toEqual([0, 12, 24]);
    expect(fretsFor("naturals", 1, "F♯")).toBeUndefined();

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

function noteAt(
  system: NoteSystem,
  string: number,
  fret: number,
): string | undefined {
  return POSITION_TO_NOTE_CARDS.find(
    (card) =>
      card.system === system &&
      card.string === string &&
      card.fret === fret,
  )?.note;
}

function fretsFor(
  system: NoteSystem,
  string: number,
  note: string,
): readonly number[] | undefined {
  return NOTE_TO_POSITIONS_CARDS.find(
    (card) =>
      card.system === system &&
      card.string === string &&
      card.note === note,
  )?.frets;
}
