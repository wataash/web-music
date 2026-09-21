// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { MAJOR_KEYS_BY_SIGNATURE } from "@web-music/music-staff-core";
import { createMovableDoWebDeckData, MAJOR_KEYS, movableDoAnswer } from "./movable-do";

describe("movable-do major-key deck", () => {
  it("covers all fifteen conventional major-key signatures", () => {
    expect(MAJOR_KEYS).toHaveLength(15);
    expect(MAJOR_KEYS.map((key) => key.fifths)).toEqual([0, 1, 2, 3, 4, 5, 6, -1, -2, -3, -4, -5, 7, -6, -7]);
    expect(MAJOR_KEYS_BY_SIGNATURE.map((key) => key.fifths)).toEqual([7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7]);
  });

  it("uses the tonic letter for do and the key signature for sounding pitch", () => {
    expect(movableDoAnswer("C5", "C", 0)).toEqual({ solfege: "Do", soundingPitch: "C5" });
    expect(movableDoAnswer("F4", "G", 1)).toEqual({ solfege: "Ti", soundingPitch: "F♯4" });
    expect(movableDoAnswer("B3", "B♭", -2)).toEqual({ solfege: "Do", soundingPitch: "B♭3" });
    expect(movableDoAnswer("E4", "B♭", -2)).toEqual({ solfege: "Fa", soundingPitch: "E♭4" });
    expect(movableDoAnswer("F4", "F♯", 6)).toEqual({ solfege: "Do", soundingPitch: "F♯4" });
    expect(movableDoAnswer("B4", "C♯", 7)).toEqual({ solfege: "Ti", soundingPitch: "B♯4" });
    expect(movableDoAnswer("C4", "C♭", -7)).toEqual({ solfege: "Do", soundingPitch: "C♭4" });
  });

  it("generates four clefs and preserves pitch at field index two for selection", () => {
    const deck = createMovableDoWebDeckData();
    expect(deck.notes).toHaveLength(4 * 15 * 33);
    expect(deck.cards).toHaveLength(deck.notes.length);
    expect(new Set(deck.cards.map((card) => card.newOrder)).size).toBe(deck.cards.length);
    expect(new Set(deck.notes.map((note) => note.guid)).size).toBe(deck.notes.length);
    expect(deck.notes[0].fields.slice(1, 3)).toEqual(["treble", "G2"]);
    const originalBass = deck.notes.find((note) => note.fields[1] === "bass" && note.fields[3] === "0" && note.fields[2] === "B0");
    expect(originalBass?.id).toBe(1_787_951_100_000 + 12 * 33);
    expect(deck.notes.find((note) => note.fields[3] === "7")?.id).toBe(1_787_951_100_000 + 4 * 12 * 33);
    expect(deck.notes.some((note) => note.fields[3] === "-6")).toBe(true);
    expect(deck.notes.some((note) => note.fields[3] === "-7")).toBe(true);
    const fMajorB3 = deck.notes.find((note) =>
      note.fields[1] === "treble" && note.fields[2] === "B3" && note.fields[3] === "-1",
    );
    expect(fMajorB3?.fields).toEqual([
      expect.any(String), "treble", "B3", "-1", "F", "Fa", "B♭3", "treble|B3",
    ]);
    expect(deck.decks).toHaveLength(6);
    expect(deck.models[0].templates[0].qfmt).toContain("data-major-fifths");
    expect(deck.models[0].templates[0].qfmt).toContain('"bass":{"sharp":');
    expect(deck.models[0].templates[0].qfmt).toContain("viewBox[2] = '320'");
    expect(deck.models[0].css).toContain("font-size:64px");
    expect(deck.models[0].css).toContain('/fonts/NotoMusic-Regular.ttf');
    expect(deck.models[0].css).toContain("dominant-baseline:alphabetic");
    expect(deck.models[0].fieldNames).toEqual(["Id", "Clef", "Pitch", "Fifths", "Key", "Solfege", "SoundingPitch", "Staff"]);
    expect(deck.models[0].templates[0].afmt).toContain('data-sounding-pitch="{{SoundingPitch}}"');
    expect(deck.models[0].templates[0].afmt).toContain("navigator.language");
    expect(deck.models[0].templates[0].afmt).toContain('"Fa":"ファ"');
  });
});
