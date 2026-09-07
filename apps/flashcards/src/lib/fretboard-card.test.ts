// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  ALL_FRETBOARD_NOTES,
  DEFAULT_FRETBOARD_NOTE_SELECTION,
  fretboardNotesForPreset,
  includesFretboardNoteCard,
  isFretboardNoteToPositionsCard,
  parseFretboardNotes,
  presetForFretboardNotes,
} from "./fretboard-card";

describe("fretboard card direction", () => {
  it("identifies Note to Positions cards", () => {
    expect(
      isFretboardNoteToPositionsCard({
        tags: " spelling::natural direction::note-to-positions ",
      }),
    ).toBe(true);
  });

  it("rejects Position to Note cards", () => {
    expect(
      isFretboardNoteToPositionsCard({
        tags: "spelling::natural direction::position-to-note",
      }),
    ).toBe(false);
  });
});

describe("fretboard note selection", () => {
  it("asks each accidental under three spellings", () => {
    expect(ALL_FRETBOARD_NOTES).toHaveLength(22);
    expect(ALL_FRETBOARD_NOTES.slice(0, 4).map(({ note }) => note)).toEqual([
      "A",
      "A♯",
      "B♭",
      "A♯B♭",
    ]);
  });

  it("ships asking only for the naturals", () => {
    expect(DEFAULT_FRETBOARD_NOTE_SELECTION).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]);
    expect(presetForFretboardNotes(DEFAULT_FRETBOARD_NOTE_SELECTION)).toBe(
      "naturals",
    );
    expect(presetForFretboardNotes(fretboardNotesForPreset("all"))).toBe("all");
    expect(presetForFretboardNotes(["A"])).toBe("custom");
  });

  it("keeps only notes the deck asks for, in its own order", () => {
    expect(parseFretboardNotes(["B♭", "A♯B♭", "H", "A"])).toEqual([
      "A",
      "B♭",
      "A♯B♭",
    ]);
    expect(parseFretboardNotes("nonsense")).toEqual(
      DEFAULT_FRETBOARD_NOTE_SELECTION,
    );
  });

  it("filters Note to Positions cards by their written note", () => {
    const card = (note: string) => ({
      fields: ["id", "enharmonic", "1", "", note, "", "", "1-5 1-17"],
      tags: "spelling::enharmonic direction::note-to-positions",
    });
    const selected = new Set(["A♯B♭"]);

    expect(includesFretboardNoteCard(card("A♯B♭"), selected)).toBe(true);
    expect(includesFretboardNoteCard(card("A♯"), selected)).toBe(false);
    // Cards from other directions and other decks are left alone.
    expect(
      includesFretboardNoteCard(
        {
          fields: ["id", "enharmonic", "3", "1", "G♯A♭"],
          tags: "spelling::enharmonic direction::position-to-note",
        },
        selected,
      ),
    ).toBe(true);
  });
});
