// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { extractChordWiki } from "@web-music/chordwiki";

test("extracts ChordWiki metadata and ignores annotations and lyric text", () => {
  const result = extractChordWiki("{title:Example}{subtitle:歌：Example Band　作詞：Someone}{Key:Ab}{c:Practice [C]}\n[Verse][|][AbM7]歌詞[--][G7(b9)/B][N.C.][>]");
  assert.equal(result.title, "Example");
  assert.equal(result.artist, "Example Band");
  assert.equal(result.originalKey, "Ab");
  assert.deepEqual(result.chords, ["AbM7", "G7(b9)/B", "N.C."]);
});

test("preserves ChordWiki comments at their positions without changing the chord sequence", () => {
  const result = extractChordWiki("{c:BPM=100}[C]{ci:Solo}[G7]{comment:Quiet}[Am]");
  assert.deepEqual(result.comments, ["BPM=100"]);
  assert.deepEqual(result.annotations, [
    { chordIndex: 1, comments: ["Solo"] },
    { chordIndex: 2, comments: ["Quiet"] },
  ]);
  assert.deepEqual(result.chords, ["C", "G7", "Am"]);
});

test("preserves lyrics, credit, rhythm, empty measures and trailing directions without loss", () => {
  const raw = "{title:Example}\n{subtitle:歌：Band 作詞：Writer 作曲：Composer}\n{custom:extra}\n|[C]歌(うた)[>==] | ---- |\n\n(2/4)[G7]--\n(Repeat & F.O)\n";
  const { score } = extractChordWiki(raw);
  assert.equal(score.blocks.flat().map(token => token.raw).join(""), raw);
  assert.ok(score.fields.some(field => field.label === "Vocals / lyrics / music" && field.value.includes("Composer")));
  assert.ok(score.fields.some(field => field.label === "custom" && field.value === "extra"));
  assert.equal(score.blocks.flat().filter(token => token.kind === "chord").length, 2);
});

test("rejects text without chords", () => assert.throws(() => extractChordWiki("text"), /No chords/));
