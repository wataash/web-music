// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  ALL_FRETBOARD_NOTES,
  DEFAULT_FRETBOARD_NOTE_SELECTION,
  fretboardEdgeId,
  fretboardEdgeKey,
  fretboardNotesForPreset,
  includesFretboardNoteCard,
  isFretboardNoteToPositionsCard,
  parseFretboardNotes,
  presetForFretboardNotes,
} from "./fretboard-card";
import type { CardRow, NoteRow } from "./db";

const card: CardRow = {
  id: 1,
  key: "original",
  nid: 1,
  did: 1,
  ord: 0,
  newOrder: 1,
  pkg: "Guitar Fretboard",
};

function fretboardNote(id: string, string: number, tuning: string): NoteRow {
  const noteToPositions = id.startsWith("note-to-positions");
  return {
    id: string,
    guid: id,
    mid: 1,
    fields: [
      id,
      "natural",
      String(string),
      noteToPositions ? "" : "5",
      "E",
      "",
      "",
      "",
      tuning,
    ],
    tags: `spelling::natural direction::${noteToPositions ? "note-to-positions" : "position-to-note"}`,
    pkg: "Guitar Fretboard",
  };
}

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

describe("shared outside strings", () => {
  it("groups both directions when the outside strings have the same note name", () => {
    const tuning = "64 59 55 50 45 40";
    const positions = [1, 6].map((string) =>
      fretboardNote(`position-to-note-string-${string}-fret-5`, string, tuning),
    );
    const notes = [1, 6].map((string) =>
      fretboardNote(
        `note-to-positions-natural-string-${string}-pitch-7`,
        string,
        tuning,
      ),
    );

    expect(positions.map(fretboardEdgeId)).toEqual([
      "position-to-note-edge-fret-5",
      "position-to-note-edge-fret-5",
    ]);
    expect(notes.map((note) => fretboardEdgeKey(card, note))).toEqual([
      'fretboard-edge:["Guitar Fretboard",1,"note-to-positions-natural-edge-pitch-7",0]',
      'fretboard-edge:["Guitar Fretboard",1,"note-to-positions-natural-edge-pitch-7",0]',
    ]);
  });

  it("does not group inner matches or unequal outside strings", () => {
    const dropD = "64 59 55 50 45 38";
    expect(
      fretboardEdgeId(
        fretboardNote("position-to-note-string-4-fret-5", 4, dropD),
      ),
    ).toBeNull();
    expect(
      fretboardEdgeId(
        fretboardNote("position-to-note-string-6-fret-5", 6, dropD),
      ),
    ).toBeNull();
  });

  it("keeps another matching tuning's progress separate", () => {
    const custom = "62 57 53 50";
    const edge = fretboardNote("position-to-note-string-4-fret-5", 4, custom);
    expect(fretboardEdgeKey(card, edge)).toBe(
      'fretboard-edge:["Guitar Fretboard",1,"position-to-note-edge-fret-5",0,"62-57-53-50"]',
    );
  });
});
