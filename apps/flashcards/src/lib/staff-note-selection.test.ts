// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  ALL_STAFF_NOTES,
  DEFAULT_STAFF_NOTE_SELECTION,
  includesStaffNoteCard,
  parseStaffNoteSelection,
  presetForClefSelection,
  selectionForPreset,
  staffCardVariables,
  staffNoteDeckSetting,
  parseMovableDoStaffSelections,
  loadMovableDoStaffSelections,
  MOVABLE_DO_STAFF_SELECTION_KEY,
  staffSelectionForNote,
} from "./staff-note-selection";

function staffNote(clef: string, pitch: string, direction = "staff-to-note") {
  return {
    fields: ["id", clef, pitch, pitch[0], pitch.slice(1), "", "", ""],
    tags: `clef::${clef} direction::${direction}`,
  };
}

describe("staff note selection", () => {
  it("migrates the shared range once and keeps each key independent", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const wide = selectionForPreset("esoteric");
    const migrated = loadMovableDoStaffSelections(storage, wide);
    expect(Object.keys(migrated)).toHaveLength(15);
    expect(migrated[-1]).toEqual(wide);
    const changed = { ...migrated, [-1]: { ...wide, treble: ["A4"] } };
    storage.setItem(MOVABLE_DO_STAFF_SELECTION_KEY, JSON.stringify(changed));
    const loaded = loadMovableDoStaffSelections(storage, DEFAULT_STAFF_NOTE_SELECTION);
    expect(loaded[-1].treble).toEqual(["A4"]);
    expect(loaded[-2]).toEqual(wide);
    expect(loaded[0]).toEqual(wide);
    expect(loaded[-1].bass).toEqual(wide.bass);
  });

  it("uses the card's key for filtering and cropping independently of regular staff", () => {
    const regular = selectionForPreset("esoteric");
    const ranges = parseMovableDoStaffSelections({
      [-1]: { ...regular, treble: ["A4"] },
      [-2]: { ...regular, treble: ["C5"] },
    });
    const keyed = (fifths: number, pitch: string) => ({
      fields: ["id", "treble", pitch, String(fifths)],
      tags: "clef::treble mode::major",
    });
    expect(staffSelectionForNote(staffNote("treble", "A4"), regular, ranges)).toBe(regular);
    expect(includesStaffNoteCard(keyed(-1, "A4"), staffSelectionForNote(keyed(-1, "A4"), regular, ranges))).toBe(true);
    expect(includesStaffNoteCard(keyed(-2, "A4"), staffSelectionForNote(keyed(-2, "A4"), regular, ranges))).toBe(false);
    const narrow = staffCardVariables(keyed(-1, "A4"), ranges[-1], ["treble"]);
    const wide = staffCardVariables(keyed(-1, "A4"), regular, ["treble"]);
    expect(Number(narrow["--staff-clip-top"])).toBeGreaterThan(Number(wide["--staff-clip-top"]));
    expect(Number(narrow["--staff-clip-bottom"])).toBeGreaterThan(Number(wide["--staff-clip-bottom"]));
  });

  it("validates stored per-key ranges without losing intentionally empty selections", () => {
    const parsed = parseMovableDoStaffSelections({
      [-1]: { ...DEFAULT_STAFF_NOTE_SELECTION, treble: ["A4", "A4", "invalid"] },
      [-2]: { ...DEFAULT_STAFF_NOTE_SELECTION, treble: [] },
      0: "invalid",
    });
    expect(parsed[-1].treble).toEqual(["A4"]);
    expect(parsed[-2].treble).toEqual([]);
    expect(parsed[0]).toEqual(DEFAULT_STAFF_NOTE_SELECTION);
    const failedStorage = { getItem: () => "not json", setItem: () => {} };
    expect(loadMovableDoStaffSelections(failedStorage, ALL_STAFF_NOTES)).toEqual(parseMovableDoStaffSelections(null));
  });
  it("offers six ledger lines either side of every clef", () => {
    for (const clef of ["treble", "bass", "alto", "tenor"] as const) {
      expect(ALL_STAFF_NOTES[clef]).toHaveLength(33);
    }
    expect(ALL_STAFF_NOTES.treble[0]).toBe("G2");
    expect(ALL_STAFF_NOTES.treble[32]).toBe("D7");
    expect(ALL_STAFF_NOTES.bass[0]).toBe("B0");
    expect(ALL_STAFF_NOTES.bass[32]).toBe("F5");
  });

  it("builds cumulative presets from the ledger lines a note needs", () => {
    const basic = selectionForPreset("basic").treble;
    expect(basic[0]).toBe("G3");
    expect(basic[basic.length - 1]).toBe("D6");
    expect(basic).toContain("C4");
    expect(basic).not.toContain("E6");

    const advanced = selectionForPreset("advanced").treble;
    expect(advanced).toContain("E6");
    expect(advanced).toContain("A6");
    expect(advanced).not.toContain("B6");
    expect(selectionForPreset("esoteric").treble).toContain("D7");

    // Every clef spans the same positions, so the tiers are the same size.
    for (const clef of ["treble", "bass", "alto", "tenor"] as const) {
      expect(selectionForPreset("basic")[clef]).toHaveLength(19);
      expect(selectionForPreset("advanced")[clef]).toHaveLength(27);
      expect(selectionForPreset("esoteric")[clef]).toEqual(
        ALL_STAFF_NOTES[clef],
      );
    }
  });

  it("starts every clef on Basic", () => {
    expect(DEFAULT_STAFF_NOTE_SELECTION).toEqual(selectionForPreset("basic"));
    expect(presetForClefSelection(DEFAULT_STAFF_NOTE_SELECTION, "treble")).toBe(
      "basic",
    );
    expect(DEFAULT_STAFF_NOTE_SELECTION.treble).toHaveLength(19);
    expect(DEFAULT_STAFF_NOTE_SELECTION.treble).not.toContain("D7");
    expect(presetForClefSelection(selectionForPreset("basic"), "bass")).toBe(
      "basic",
    );
    expect(
      presetForClefSelection(selectionForPreset("advanced"), "alto"),
    ).toBe("advanced");
    expect(
      presetForClefSelection(
        { ...ALL_STAFF_NOTES, alto: ["C4"] },
        "alto",
      ),
    ).toBe("custom");
  });

  it("keeps only known pitches when reading stored settings", () => {
    // Anything unreadable falls back to the default rather than to nothing.
    expect(parseStaffNoteSelection(null)).toEqual(
      DEFAULT_STAFF_NOTE_SELECTION,
    );
    expect(parseStaffNoteSelection({ treble: ["C4"] })).toEqual(
      DEFAULT_STAFF_NOTE_SELECTION,
    );
    expect(
      parseStaffNoteSelection({
        treble: ["G4", "C4", "nonsense", 7],
        bass: [],
        alto: [],
        tenor: [],
      }),
    ).toEqual({ treble: ["C4", "G4"], bass: [], alto: [], tenor: [] });
  });

  it("filters cards by clef and pitch in both directions", () => {
    const selection = { ...ALL_STAFF_NOTES, treble: ["G4"] };

    expect(includesStaffNoteCard(staffNote("treble", "G4"), selection)).toBe(
      true,
    );
    expect(
      includesStaffNoteCard(
        staffNote("treble", "G4", "note-to-staff"),
        selection,
      ),
    ).toBe(true);
    expect(includesStaffNoteCard(staffNote("treble", "A4"), selection)).toBe(
      false,
    );
    // A different clef keeps its own selection.
    expect(includesStaffNoteCard(staffNote("bass", "A3"), selection)).toBe(
      true,
    );
  });

  it("passes cards from other decks through untouched", () => {
    expect(
      includesStaffNoteCard(
        { fields: ["id", "enharmonic", "3", "1"], tags: "spelling::enharmonic" },
        selectionForPreset("basic"),
      ),
    ).toBe(true);
  });

  it("puts a gear on every clef deck in both directions", () => {
    expect(staffNoteDeckSetting("Music Staff (Movable Do)::Staff → Solfege::Bass Clef")).toEqual({ clef: "bass", deckLabel: "Bass Clef", movableDo: true });
    expect(
      staffNoteDeckSetting("Music Staff::Staff → Note::Treble Clef"),
    ).toEqual({ clef: "treble", deckLabel: "Treble Clef" });
    expect(
      staffNoteDeckSetting("Music Staff::Note → Staff::Tenor Clef"),
    ).toBeNull();
    expect(
      staffNoteDeckSetting(
        "Music Staff (with Octave Numbers)::Staff → Note::Bass Clef",
      ),
    ).toEqual({ clef: "bass", deckLabel: "Bass Clef" });
    expect(
      staffNoteDeckSetting(
        "Music Staff (with Octave Numbers)::Note → Staff::Alto Clef",
      ),
    ).toEqual({ clef: "alto", deckLabel: "Alto Clef" });
    expect(staffNoteDeckSetting("Music Staff")).toBeNull();
    expect(staffNoteDeckSetting("Music Staff::Staff → Note")).toBeNull();
    expect(staffNoteDeckSetting("Music Staff::Staff → Note::Nope")).toBeNull();
    expect(
      staffNoteDeckSetting("Guitar Fretboard::Position → Note"),
    ).toBeNull();
  });
});

describe("cropping the staff image to the notes in play", () => {
  it("includes the displayed note even outside the selected range", () => {
    for (const pitch of ["G2", "D3", "D7"]) {
      const note = staffNote("treble", pitch);
      expect(staffCardVariables(note, DEFAULT_STAFF_NOTE_SELECTION)).toEqual(
        staffCardVariables(note, {
          ...DEFAULT_STAFF_NOTE_SELECTION,
          treble: [...DEFAULT_STAFF_NOTE_SELECTION.treble, pitch],
        }),
      );
    }
  });

  it("keeps only the room the chosen notes need, where they sit in the image", () => {
    const card = staffNote("treble", "C4");
    const basic = staffCardVariables(card, DEFAULT_STAFF_NOTE_SELECTION);
    const everything = staffCardVariables(card, ALL_STAFF_NOTES);

    // The deck frames every clef for six ledger lines either way; two ledger
    // lines need well under half of that, and reach as far above the staff as
    // below, so the same band comes off each end. 56 of the image's 304 rows,
    // against the 260 it is drawn across.
    expect(basic["--staff-clip-top"]).toBe("0.2154");
    expect(basic["--staff-clip-bottom"]).toBe("0.2154");
    // The whole image is the whole image, so there is nothing to cut.
    expect(everything["--staff-clip-top"]).toBe("0");
    expect(everything["--staff-clip-bottom"]).toBe("0");
  });

  it("looks where the notes are when they are all high or all low", () => {
    const high = staffCardVariables(staffNote("treble", "C6"), {
      ...ALL_STAFF_NOTES,
      treble: ["C6", "D6", "E6", "F6", "G6", "A6", "B6", "C7", "D7"],
    });
    const low = staffCardVariables(staffNote("treble", "G2"), {
      ...ALL_STAFF_NOTES,
      treble: ["G2", "A2", "B2", "C3"],
    });

    // High notes reach the top of the frame, low ones the bottom, so the cut
    // is all at the other end.
    expect(high["--staff-clip-top"]).toBe("0");
    expect(high["--staff-clip-bottom"]).toBe("0.2917");
    expect(low["--staff-clip-top"]).toBe("0.2966");
    expect(low["--staff-clip-bottom"]).toBe("0");
  });

  it("frames every clef the deck asks alike, so the staff stays put", () => {
    // Treble taken out to four ledger lines, bass left at two.
    const selection = {
      ...DEFAULT_STAFF_NOTE_SELECTION,
      treble: selectionForPreset("advanced").treble,
    };
    const asked = ["treble", "bass"] as const;
    const treble = staffCardVariables(staffNote("treble", "C4"), selection, asked);
    const bass = staffCardVariables(staffNote("bass", "C4"), selection, asked);

    // A deck asking both puts one in front of the other, so both are framed
    // for the room the treble notes need.
    expect(bass).toEqual(treble);
    expect(treble["--staff-clip-top"]).toBe("0.0923");
    expect(treble["--staff-clip-bottom"]).toBe("0.0923");

    // A deck asking the bass clef alone keeps the tighter framing.
    const alone = staffCardVariables(staffNote("bass", "C4"), selection, [
      "bass",
    ]);
    expect(alone["--staff-clip-top"]).toBe("0.2154");
  });

  it("leaves a card it does not recognise alone", () => {
    expect(
      staffCardVariables(
        { fields: ["id", "enharmonic", "3", "1"], tags: "spelling::enharmonic" },
        DEFAULT_STAFF_NOTE_SELECTION,
      ),
    ).toEqual({});
  });
});
