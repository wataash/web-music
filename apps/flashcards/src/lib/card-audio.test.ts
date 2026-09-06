// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  answerSound,
  GUITAR_INTERVAL_ROOT_FRET,
  guitarSemitone,
  pitchClassOf,
  semitoneOfPitch,
  tapSound,
  tappedAnswerSound,
} from "./card-audio";

// Enough of a note row for the mapping to read: the fields the deck writes and
// the tags that say which deck wrote them.
function note(fields: readonly string[], tags = ""): {
  fields: string[];
  tags: string;
} {
  return { fields: [...fields], tags };
}

describe("reading a note name", () => {
  it("takes the spellings the decks write, in symbols or in ASCII", () => {
    expect(pitchClassOf("C")).toBe(0);
    expect(pitchClassOf("B♯")).toBe(0);
    expect(pitchClassOf("E𝄫")).toBe(2);
    expect(pitchClassOf("Gb")).toBe(6);
    expect(pitchClassOf("H")).toBeNull();
    expect(semitoneOfPitch("C4")).toBe(60);
    expect(semitoneOfPitch("A0")).toBe(21);
    expect(semitoneOfPitch("C")).toBeNull();
  });
});

describe("a tap on the drawing", () => {
  it("plays the key it landed on", () => {
    expect(tapSound({ kind: "key", semitone: 60 })).toEqual({
      instrument: "piano",
      semitones: [60],
    });
  });

  it("plays a fretted position on a guitar", () => {
    // Fifth fret of the sixth string is A2, as a guitarist tunes by.
    expect(tapSound({ kind: "fret", string: 6, fret: 5 })).toEqual({
      instrument: "guitar",
      semitones: [45],
    });
    expect(tapSound({ kind: "fret", string: 7, fret: 0 })).toBeNull();
    expect(tapSound({ kind: "fret", string: 1, fret: 30 })).toBeNull();
  });

  // The interval board says how far a cell is from the root and never which
  // fret the root is at, so the sound puts it somewhere playable.
  it("plays a cell of the interval board from the root's own fret", () => {
    expect(tapSound({ kind: "fret-offset", string: 1, offset: 0 })).toEqual({
      instrument: "guitar",
      semitones: [guitarSemitone(1, GUITAR_INTERVAL_ROOT_FRET)],
    });
    expect(
      tapSound({ kind: "fret-offset", string: 6, offset: -6 })?.semitones,
    ).toEqual([guitarSemitone(6, GUITAR_INTERVAL_ROOT_FRET - 6)]);
  });
});

describe("the sound of an answer", () => {
  // The interval keyboard marks the answer either side of the root; the one
  // above it is the interval the card names, so that is the one it plays.
  it("plays an interval up from the root", () => {
    expect(
      answerSound(
        note(["id", "interval", "C", "M3", "C M3", "E", "basic", "", "E"]),
      ),
    ).toEqual({ instrument: "piano", semitones: [60, 64] });
    // An octave is an octave up, never the root again.
    expect(
      answerSound(
        note(["id", "interval", "C", "P5", "C P5", "G", "basic", "", "C"]),
      ),
    ).toEqual({ instrument: "piano", semitones: [60, 72] });
  });

  it("plays Bb before a correct Ab without repeating Ab", () => {
    const answer = answerSound(note(["id", "interval", "Bb", "m7", "Bb m7", "Ab", "basic", "", "Ab"]));
    expect(answer?.semitones).toEqual([70, 80]);
    for (const pitch of [68, 80]) {
      expect(tappedAnswerSound([{ kind: "key", semitone: pitch }], answer, true).semitones).toEqual([70, pitch]);
    }
    expect(tappedAnswerSound([{ kind: "key", semitone: 79 }], answer, true).semitones).toEqual([70, 79, 80]);
    expect(tappedAnswerSound([{ kind: "key", semitone: 70 }], answer, true).semitones).toEqual([70, 80]);
    expect(tappedAnswerSound([{ kind: "key", semitone: 80 }], null, true).semitones).toEqual([80]);
  });

  it("plays the pitch a staff card asks for", () => {
    expect(
      answerSound(
        note(
          ["id", "treble", "C4", "C", "4", "", "C", "", "", "", ""],
          "direction::staff-to-note",
        ),
      ),
    ).toEqual({ instrument: "piano", semitones: [60] });
  });

  it("plays the position a fretboard card asks for, or every one of them", () => {
    expect(
      answerSound(
        note(
          ["id", "naturals", "6", "5", "A", "", "", ""],
          "direction::position-to-note",
        ),
      ),
    ).toEqual({ instrument: "guitar", semitones: [45] });
    expect(
      answerSound(
        note(
          ["id", "naturals", "6", "", "A", "", "", "6-5 6-17"],
          "direction::note-to-positions",
        ),
      ),
    ).toEqual({ instrument: "guitar", semitones: [45, 57] });
  });

  it("plays the cell a guitar interval card asks for", () => {
    expect(
      answerSound(
        note(["id", "guitar-interval", "6", "5", "2", "M2", "", ""]),
      ),
    ).toEqual({
      instrument: "guitar",
      semitones: [guitarSemitone(5, GUITAR_INTERVAL_ROOT_FRET + 2)],
    });
  });

  // A card that answers with the name of a distance has no pitch of its own.
  it("stays silent where the answer is not a note", () => {
    expect(answerSound(note(["id", "circle-interval", "C", "M3"]))).toBeNull();
  });
});
