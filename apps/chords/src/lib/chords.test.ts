// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  clampFretCount,
  fretboardMarkers,
} from "./chord-fretboard";
import {
  describeChord,
  omittedChordIntervals,
  parseChordSymbol,
  transposeChordSymbol,
} from "./chords";

it.each([
  ["C7", []],
  ["C9", ["P5"]],
  ["C13", ["P5", "R"]],
  ["Cm11", ["P5", "R"]],
  ["C13/C", ["P5", "M9"]],
  ["C9(13)/C", ["P5"]],
  ["C7(b9)", ["P5"]],
  ["F#7/C#", []],
  ["C9/G", ["R"]],
  ["Caug7(b9)/D", ["R"]],
  ["N.C.", []],
])("marks optional tones in %s without omitting defining tones or slash bass", (symbol, expected) => {
  for (const key of ["C", "F#"]) {
    expect([...omittedChordIntervals(describeChord(symbol, "C", key))]).toEqual(expected);
  }
});

describe("chord tones", () => {
  it("describes the dominant extensions used by the iReal editions", () => {
    expect(describeChord("E11", "A", "A").tones.map(({ note }) => note))
      .toEqual(["E", "G#", "B", "D", "F#", "A"]);
    expect(describeChord("G#13", "F#", "F#").tones)
      .toEqual(describeChord("G#9(13)", "F#", "F#").tones);
    expect(transposeChordSymbol("G#13", "F#", "C")).toBe("D13");
  });
  it("spells BM7 from its interval formula", () => {
    expect(describeChord("BM7", "F#", "F#")).toMatchObject({
      symbol: "BM7",
      tones: [
        { interval: "R", note: "B", pitchClass: 11 },
        { interval: "M3", note: "D#", pitchClass: 3 },
        { interval: "P5", note: "F#", pitchClass: 6 },
        { interval: "M7", note: "A#", pitchClass: 10 },
      ],
    });
  });

  it("marks every matching position from open strings through fret 24", () => {
    const markers = fretboardMarkers(describeChord("BM7", "F#", "F#"));
    expect(markers).toContainEqual({
      string: 1,
      fret: 2,
      label: "P5",
      role: "tone",
    });
    expect(markers).toContainEqual({
      string: 1,
      fret: 7,
      label: "R",
      role: "root",
    });
    expect(markers.every(({ fret }) => fret >= 0 && fret <= 24)).toBe(true);
  });

  it("limits positions to the selected fret count", () => {
    const markers = fretboardMarkers(
      describeChord("BM7", "F#", "F#"),
      5,
    );
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.every(({ fret }) => fret <= 5)).toBe(true);
    expect(markers).not.toContainEqual(
      expect.objectContaining({ string: 1, fret: 7 }),
    );
  });

  it("clamps invalid fret counts to the supported range", () => {
    expect(clampFretCount(0)).toBe(1);
    expect(clampFretCount(12.6)).toBe(13);
    expect(clampFretCount(25)).toBe(24);
    expect(clampFretCount(Number.NaN)).toBe(24);
  });

  it("keeps a slash bass distinct when it is not a chord tone", () => {
    const chord = describeChord("C#/B", "F#", "F#");
    expect(chord.bass).toEqual({ note: "B", pitchClass: 11 });
    const markers = fretboardMarkers(chord);
    expect(markers).toContainEqual({
      string: 6,
      fret: 7,
      label: "B",
      role: "bass",
    });
    const bassStrings = markers
      .filter(({ role }) => role === "bass")
      .map(({ string }) => string);
    expect([...new Set(bassStrings)]).toEqual([4, 5, 6]);
    const custom = fretboardMarkers(chord, 24, [1, 3]);
    expect([...new Set(custom.filter(({ role }) => role === "bass").map(({ string }) => string))])
      .toEqual([1, 3]);
    expect(custom.filter(({ role }) => role !== "bass"))
      .toEqual(markers.filter(({ role }) => role !== "bass"));
    expect(fretboardMarkers(chord, 24, []).some(({ role }) => role === "bass"))
      .toBe(false);
  });

  it("highlights a chord-tone slash bass only on selected bass strings", () => {
    const chord = describeChord("F#7/C#", "F#", "F#");
    const markers = fretboardMarkers(chord);
    expect(markers).toContainEqual({ string: 5, fret: 4, label: "P5", role: "bass" });
    expect(markers).toContainEqual({ string: 2, fret: 2, label: "P5", role: "tone" });
    const custom = fretboardMarkers(chord, 24, [2]);
    expect(custom).toContainEqual({ string: 2, fret: 2, label: "P5", role: "bass" });
    expect(custom).toContainEqual({ string: 5, fret: 4, label: "P5", role: "tone" });
    expect(fretboardMarkers(chord, 24, [])).toEqual(fretboardMarkers(describeChord("F#7", "F#", "F#")));
  });

  it("leaves N.C. without tones or markers", () => {
    const chord = describeChord("N.C.", "F#", "Gb");
    expect(chord).toEqual({
      symbol: "N.C.",
      tones: [],
      bass: null,
      noChord: true,
    });
    expect(fretboardMarkers(chord)).toEqual([]);
  });

  it("supports minor, half-diminished and diminished seventh chords", () => {
    expect(describeChord("Bm", "A", "A").tones.map(({ interval }) => interval))
      .toEqual(["R", "m3", "P5"]);
    expect(
      describeChord("D#m7b5", "A", "A").tones.map(({ interval }) => interval),
    ).toEqual(["R", "m3", "d5", "m7"]);
    expect(
      describeChord("Abdim7", "C", "C").tones.map(({ interval, note }) => [
        interval,
        note,
      ]),
    ).toEqual([
      ["R", "Ab"],
      ["m3", "Cb"],
      ["d5", "Ebb"],
      ["d7", "Gbb"],
    ]);
  });
});

describe("key changes", () => {
  it("respells F# as Gb instead of only changing accidentals", () => {
    expect(transposeChordSymbol("BM7", "F#", "Gb")).toBe("CbM7");
    expect(describeChord("BM7", "F#", "Gb")).toMatchObject({
      symbol: "CbM7",
      tones: [
        { interval: "R", note: "Cb" },
        { interval: "M3", note: "Eb" },
        { interval: "P5", note: "Gb" },
        { interval: "M7", note: "Bb" },
      ],
    });
  });

  it("transposes both halves of a slash chord", () => {
    expect(transposeChordSymbol("C#sus4/A#", "F#", "Gb")).toBe(
      "Dbsus4/Bb",
    );
  });
});
