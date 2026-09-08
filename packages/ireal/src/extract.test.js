// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { extractIreal } from "@web-music/ireal";

const html = music => `<a href="irealb://${encodeURIComponent("Example===Swing=C==1r34LbKcu7" + music + "==0=0")}">import</a>`;

test("handles shorthand, bass-only chords, N.C. and unmapped qualities", () => {
  const result = extractIreal(html("[*AT44C-7 W/G|n|F7alt]"));
  assert.deepEqual(result.chords, ["Cm7", "Cm7/G", "N.C.", "F7alt"]);
  assert.deepEqual(result.unmappedSymbols, ["F7alt"]);
  assert.equal(result.originalKey, "C");
});

test("does not turn comments or repeat symbols into additional chords", () => {
  assert.deepEqual(extractIreal(html("{C^7|x|Kcl<3x>}<D.S. al Coda>")).chords, ["CM7"]);
});

test("preserves sections and attaches before/after-chord iReal comments to the right chord", () => {
  const result = extractIreal(html("*A<solo>C7<*33soft>|*BG7"));
  assert.deepEqual(result.annotations, [
    { chordIndex: 0, section: "A", comments: [] },
    { chordIndex: 0, comments: ["solo"] },
    { chordIndex: 0, comments: ["soft"] },
    { chordIndex: 1, section: "B", comments: [] },
  ]);
  assert.deepEqual(result.chords, ["C7", "G7"]);
});

test("preserves iReal symbols, compressed cells, comment offsets and playback settings", () => {
  const raw = "T44{C XyQ|N1G<*33solo>}N2fC|KclU";
  const { score } = extractIreal(html(raw));
  const tokens = score.blocks.flat();
  assert.equal(tokens.map(token => token.raw).join(""), raw);
  assert.equal(tokens.filter(token => token.kind === "space").length, 5);
  for (const text of ["4/4", "𝄆", "𝄇", "⌜1.", "⌜2.", "𝄐", "％", "END"]) assert.ok(tokens.some(token => token.text === text), text);
  assert.equal(tokens.find(token => token.kind === "comment").position, 33);
  assert.ok(score.fields.some(field => field.label === "テンポ (BPM)" && field.value === "0"));
  assert.ok(score.fields.some(field => field.label === "コーラス数" && field.value === "0"));
  const repeat = score.blocks.find(block => block.some(token => token.text === "％"));
  assert.ok(!repeat.some(token => token.kind === "chord"), "compressed repeat belongs to its own measure");
});

test("rejects malformed or ambiguous input", () => {
  assert.throws(() => extractIreal("irealb://%ZZ"), URIError);
  assert.throws(() => extractIreal(html("C") + html("G")), /exactly one/);
  assert.throws(() => extractIreal(html("C?")), /Unrecognized/);
  assert.throws(() => extractIreal(html("W/G")), /preceding chord/);
});
