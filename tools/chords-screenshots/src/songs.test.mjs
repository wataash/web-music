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

    assert.equal(songs.length, 13);
  });
});
