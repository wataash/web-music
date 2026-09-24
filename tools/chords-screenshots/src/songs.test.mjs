// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { parseSongs, songFile } from "./songs.mjs";

describe("songs", () => {
  it("reads a song as the library lists it", () => {
    const songs = parseSongs('[{"title":"Take Five","composer":"Desmond Paul"}]', "songs.json");

    assert.deepEqual(songs, [{ title: "Take Five", composer: "Desmond Paul", label: "Take Five · Desmond Paul" }]);
  });

  it("rejects a list it cannot capture from", () => {
    assert.throws(() => parseSongs("[]", "songs.json"), /non-empty array/);
    assert.throws(() => parseSongs('[{"title":"Litha"}]', "songs.json"), /song 1 needs a "title" and a "composer"/);
    assert.throws(() => parseSongs('[{"title":"A","composer":"B"},{"title":"A","composer":"C"}]', "songs.json"), /"A" is listed twice/);
    assert.throws(() => parseSongs("{", "songs.json"), /songs.json/);
  });

  it("names a file after the song's place and title", () => {
    assert.equal(songFile({ title: "Señor Blues" }, 12), "13-senor-blues.png");
    assert.equal(songFile({ title: "Brazil (Aquarela Do Brasil)" }, 6), "07-brazil-aquarela-do-brasil.png");
    assert.equal(songFile({ title: "Bat, The" }, 2), "03-bat-the.png");
  });

  it("ships a song list the tool can read", async () => {
    const file = new URL("../songs.json", import.meta.url);
    const songs = parseSongs(await readFile(file, "utf8"), "songs.json");

    assert.equal(songs.length, 50);
    assert.equal(songs[0].title, "It Could Happen To You");
  });

  it("covers the catalog's keys, meters, row endings and notation extremes", async () => {
    const songs = parseSongs(await readFile(new URL("../songs.json", import.meta.url), "utf8"), "songs.json");
    const catalog = JSON.parse(await readFile(new URL("../../ireal-analysis/jazz-1460-chart-features.json", import.meta.url), "utf8")).songs;
    const selected = songs.map(song => {
      const matches = catalog.filter(entry => entry.title === song.title && entry.composer === song.composer);
      assert.equal(matches.length, 1, song.label);
      return matches[0];
    });
    for (const field of ["key", "timeSignature", "lastRowMeasures", "maxMainChordsPerMeasure"]) {
      assert.deepEqual(new Set(selected.map(song => song[field])), new Set(catalog.map(song => song[field])), field);
    }
    for (const field of ["rows", "measures", "mainChords", "alternateChords", "slashChords", "narrowChords", "endRepeats", "repeatPreviousMeasure", "repeatPreviousTwoMeasures", "repeatPreviousChord", "segno", "coda", "fermata", "playbackEnd", "notes", "timeSignatureChanges", "rowGaps"]) {
      assert.equal(Math.max(...selected.map(song => song[field])), Math.max(...catalog.map(song => song[field])), field);
    }
    assert.ok(selected.some(song => song.endingSpansRows));
    assert.deepEqual(new Set(selected.flatMap(song => song.endingNumbers)), new Set(catalog.flatMap(song => song.endingNumbers)));
  });
});
