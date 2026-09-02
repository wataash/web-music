// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { DEFAULT_CIRCLE_NOTE_SELECTION } from "./circle-note-selection";
import { DEFAULT_FRET_WINDOW } from "./guitar-interval-selection";
import { DEFAULT_INTERVAL_PAIR_SELECTION } from "./interval-pair-selection";
import { deckSettingsTarget, includesSelectedNote } from "./note-selection";
import {
  ALL_STAFF_NOTES,
  DEFAULT_STAFF_NOTE_SELECTION,
} from "./staff-note-selection";

const selections = {
  circle: {
    noteToCell: DEFAULT_CIRCLE_NOTE_SELECTION,
    intervals: DEFAULT_CIRCLE_NOTE_SELECTION,
  },
  fretWindow: DEFAULT_FRET_WINDOW,
  intervalPairs: new Set(DEFAULT_INTERVAL_PAIR_SELECTION),
  staff: DEFAULT_STAFF_NOTE_SELECTION,
};

describe("note selection", () => {
  it("applies every deck's own filter and passes the rest through", () => {
    const staffCard = {
      fields: ["id", "treble", "G4", "G", "4", "", "", ""],
      tags: "clef::treble direction::staff-to-note",
    };
    const fretboardCard = {
      fields: ["id", "flats", "3", "1", "A♭"],
      tags: "system::flats direction::position-to-note",
    };

    expect(includesSelectedNote(staffCard, selections)).toBe(true);
    expect(includesSelectedNote(fretboardCard, selections)).toBe(true);
    expect(
      includesSelectedNote(
        { fields: ["id", "interval", "C", "m3"], tags: "" },
        { ...selections, intervalPairs: new Set(["C M3"]) },
      ),
    ).toBe(false);
    expect(
      includesSelectedNote(
        { fields: ["id", "identification", "C♭", "M3"], tags: "" },
        selections,
      ),
    ).toBe(false);
    expect(
      includesSelectedNote(staffCard, {
        ...selections,
        staff: { ...ALL_STAFF_NOTES, treble: ["A4"] },
      }),
    ).toBe(false);
  });

  it("routes each deck's gear to its own panel", () => {
    expect(
      deckSettingsTarget(
        "Music Staff (with Octave Numbers)::Note → Staff::Alto Clef",
      ),
    ).toEqual({
      kind: "staff",
      setting: { clef: "alto", deckLabel: "Alto Clef" },
    });
    expect(
      deckSettingsTarget(
        "(Experimental) Circle of Fifths::Note → Cell::Note → Outer (Major) Cell",
      )?.kind,
    ).toBe("circle");
    expect(deckSettingsTarget("Intervals")).toEqual({
      kind: "interval",
      setting: { deckLabel: "Intervals" },
    });
    expect(deckSettingsTarget("Interval Identification")).toEqual({
      kind: "interval",
      setting: { deckLabel: "Interval Identification" },
    });
    expect(deckSettingsTarget("Guitar Fretboard")).toBeNull();
  });
});
