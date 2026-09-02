// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzePlaylist } from "./analyze.js";

const playlist = {
  name: "Fixture",
  songs: [
    {
      title: "Same title",
      key: "C",
      music: { measures: [["C7", "G-7", "D7/F#"], [null, "C7"]] },
    },
    {
      title: "Same title",
      key: "Bb",
      music: { measures: [["Bb^7", "C7", "C+"]] },
    },
  ],
};

describe("analyzePlaylist", () => {
  it("counts chords, roots, qualities, families, and chart entries", () => {
    const result = analyzePlaylist(playlist);

    assert.equal(result.playlist, "Fixture");
    assert.equal(result.songs, 2);
    assert.equal(result.measures, 3);
    assert.equal(result.occurrences, 7);
    assert.equal(result.uniqueExactChords, 5);
    assert.equal(result.uniqueQualities, 4);
    assert.equal(result.slashChords, 1);
    assert.deepEqual(result.roots[0], { name: "C", count: 4, songs: 2 });
    assert.deepEqual(result.qualities[0], {
      name: "7",
      count: 4,
      songs: 2,
    });
    assert.deepEqual(result.families[0], {
      name: "dominant/sus",
      count: 4,
      songs: 2,
    });
    assert.deepEqual(result.basses, [{ name: "F#", count: 1 }]);
    assert.deepEqual(result.keySignatures, [
      { name: "Bb", count: 1 },
      { name: "C", count: 1 },
    ]);
  });

  it("counts the intervals each chord symbol names, per root", () => {
    const result = analyzePlaylist(playlist);

    // C7 x3 and C+ each name a major 3rd above C, and C+ also names an
    // augmented 5th, which no other quality here does.
    assert.deepEqual(result.noteIntervals[0], {
      name: "C M3",
      count: 4,
      songs: 2,
    });
    assert.deepEqual(
      result.noteIntervals.find(({ name }) => name === "C A5"),
      { name: "C A5", count: 1, songs: 1 },
    );
    assert.deepEqual(result.intervals[0], { name: "M3", count: 6, songs: 2 });
    assert.deepEqual(
      result.noteIntervals.filter(({ name }) => name.startsWith("Bb ")),
      [
        { name: "Bb M3", count: 1, songs: 1 },
        { name: "Bb M7", count: 1, songs: 1 },
        { name: "Bb P5", count: 1, songs: 1 },
      ],
    );
  });

  it("spells the note each named degree lands on", () => {
    const result = analyzePlaylist(playlist);

    // Bb^7 names D, F and A above Bb; C+ names the augmented 5th as G#,
    // not as the Ab a semitone-only reading would give.
    assert.equal(result.unspelledTones, 0);
    assert.deepEqual(
      result.tones.filter(({ name }) => ["A", "G#"].includes(name)),
      [
        { name: "A", count: 2, songs: 2 },
        { name: "G#", count: 1, songs: 1 },
      ],
    );
  });

  it("can limit the exact-chord ranking without changing unique counts", () => {
    const result = analyzePlaylist(playlist, { exactLimit: 2 });

    assert.equal(result.exact.length, 2);
    assert.equal(result.uniqueExactChords, 5);
  });

  it("rejects malformed input", () => {
    assert.throws(
      () => analyzePlaylist({ songs: [{ music: { measures: [["H7"]] } }] }),
      /unparsed chord: H7/,
    );
    assert.throws(
      () => analyzePlaylist({ songs: [{ music: { measures: [["C7b6"]] } }] }),
      /unmapped chord quality: 7b6/,
    );
    assert.throws(
      () => analyzePlaylist({ songs: [] }, { exactLimit: -1 }),
      /exactLimit must be a non-negative integer/,
    );
  });
});
