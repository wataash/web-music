// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { extractIrealPlaylist, scramble } from "./extract.js";

const song = (title, raw, key = "C") => `${title}===Swing=${key}==1r34LbKcu7${scramble(raw)}==120=2`;
const link = payload => `irealb://${encodeURIComponent(payload)}`;

test("reads playlists without splitting empty composer fields", () => {
  const result = extractIrealPlaylist(link(song("One", "C|G7") + "===" + song("Two", "A-7", "A-") + "===Practice"));
  assert.equal(result.name, "Practice");
  assert.deepEqual(result.songs.map(s => s.title), ["One", "Two"]);
  assert.deepEqual(result.songs[1].chords, ["Am7"]);
  assert.deepEqual(result.errors, []);
});

test("reads multiple HTML links and legacy single songs/playlists", () => {
  const result = extractIrealPlaylist(`<a href="${link(song("One", "C"))}">one</a><a href="irealbook://${encodeURIComponent("Two=Writer=Swing=D-=n=D-7(A7b9)=Three=Writer=Swing=G=n=G^7=Collection")}">two</a>`);
  assert.deepEqual(result.songs.map(s => s.title), ["One", "Two", "Three"]);
  assert.deepEqual(result.songs[1].chords, ["Dm7", "A7(b9)"]);
  assert.equal(result.name, "Collection");
});

test("preserves custom qualities and alternative chord parentheses", () => {
  const raw = "{C*-^* (G*7us*)|Fmaj(add4) Dmin^13Z}";
  const result = extractIrealPlaylist(link(song("Custom", raw)));
  assert.deepEqual(result.songs[0].chords, ["C*-^*", "G*7us*", "Fmaj(add4)", "Dmin^13"]);
  assert.equal(result.songs[0].score.blocks.flat().map(t => t.raw).join(""), raw);
});

test("reports a broken song while keeping other songs", () => {
  const result = extractIrealPlaylist(link(song("Bad", "C?") + "===" + song("Good", "G") + "===Collection"));
  assert.deepEqual(result.songs.map(s => s.title), ["Good"]);
  assert.equal(result.errors[0].title, "Bad");
  assert.throws(() => extractIrealPlaylist("nothing here"), /共有リンク/);
});

test("skips malformed links before, between and after valid links", () => {
  const result = extractIrealPlaylist([
    'irealb://%ZZ', link(song('One', 'C')),
    'irealbook://%E0%A4', link(song('Two', 'G7')), 'irealb://%',
  ].join('\n'));
  assert.deepEqual(result.songs.map(song => song.title), ['One', 'Two']);
  assert.deepEqual(result.errors.map(error => error.title), ['Link 1', 'Link 3', 'Link 5']);
  assert.ok(result.errors.every(error => error.message));
  const invalid = extractIrealPlaylist('irealb://%ZZ');
  assert.deepEqual(invalid.songs, []);
  assert.equal(invalid.errors.length, 1);
});
