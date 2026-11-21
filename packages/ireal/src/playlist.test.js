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

test("keeps apostrophes in HTML and pasted song links", () => {
  const url = link(song("It's You", "G7"));
  for (const input of [url, `<a href="${url}">Song</a>`]) {
    const result = extractIrealPlaylist(input);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.songs.map(song => song.title), ["It's You"]);
  }
});

test("keeps a parenthesized no-chord marker separate from chord modifiers", () => {
  const result = extractIrealPlaylist(link(song("Alternatives", "C(n)G7(b9,#11)")));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.songs[0].chords, ["C", "N.C.", "G7(b9,#11)"]);
});

test("decodes character references once in HTML attributes only", () => {
  const url = link(song("Don't", "C"));
  for (const ref of ["&#39;", "&#x27;", "&apos;"]) {
    const html = `<a href='${url.replace("'", ref)}'>song</a>`;
    assert.equal(extractIrealPlaylist(html).songs[0].title, "Don't");
  }
  const literal = url.replace("'", "&amp;");
  assert.equal(extractIrealPlaylist(literal).songs[0].title, "Don&amp;t");
  assert.equal(extractIrealPlaylist(`<a href="${literal.replace("&", "&amp;")}">song</a>`).songs[0].title, "Don&amp;t");
});

test("reads spacing controls adjacent to chord qualities", () => {
  const raw = "C7sG7susadd3lF7altsDadd9/A";
  const result = extractIrealPlaylist(link(song("Spacing", raw)));
  assert.deepEqual(result.errors, []);
  const [chart] = result.songs;
  assert.deepEqual(chart.chords, ["C7", "G7susadd3", "F7alt", "Dadd9/A"]);
  const tokens = chart.score.blocks.flat();
  assert.deepEqual(tokens.filter(t => t.kind === "size").map(t => t.raw), ["s", "l", "s"]);
  assert.deepEqual(tokens.filter(t => t.kind === "chord").map(t => Boolean(t.narrow)), [false, true, false, true]);
  assert.equal(tokens.map(t => t.raw).join(""), raw);
});

test("accepts mixed-case schemes in pasted links and HTML without changing song text", () => {
  for (const url of [link(song("MiXeD", "G7")).replace("irealb:", "IRealB:"), "IRealBook://MiXeD=Writer=Swing=C=n=G7"]) {
    for (const input of [url, `<a href="${url}">song</a>`]) {
      const result = extractIrealPlaylist(input);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.songs.map(song => [song.title, song.chords]), [["MiXeD", ["G7"]]]);
    }
  }
});

test("reports incomplete links without taking the next playlist's name", () => {
  const urls = ["irealbook://Broken=Writer=Swing=C", "irealb://", "irealbook://Good=Writer=Swing=C=n=G7=Practice"];
  for (const text of [urls.join("\n"), urls.map(url => `<a href="${url}">Import</a>`).join("")]) {
    const result = extractIrealPlaylist(text);
    assert.equal(result.name, "Practice");
    assert.deepEqual(result.songs.map(song => [song.title, song.playlist]), [["Good", "Practice"]]);
    assert.deepEqual(result.errors.map(error => error.title), ["Broken", "Link 2"]);
  }
});

test("only takes the collection name from a playlist with an imported song", () => {
  const broken = link(song("Broken chart", "C?") + "===Rejected set");
  const good = link(song("Good chart", "F7") + "===Practice");
  const result = extractIrealPlaylist([broken, good].join("\n"));
  assert.deepEqual(result.errors.map(error => error.title), ["Broken chart"]);
  assert.deepEqual(result.songs.map(song => [song.title, song.playlist]), [["Good chart", "Practice"]]);
  assert.equal(result.name, "Practice");
  assert.equal(extractIrealPlaylist(broken).name, "");
});
