// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareTrees } from "./compat.mjs";
import { verifyCaptures } from "./verify.mjs";

const side = (overrides = {}) => ({
  viewport: { width: 412, height: 883, deviceScaleFactor: 2.625 },
  songs: [
    { title: "Take Five", rows: 8, chords: ["Ebm7", "Bbm7"] },
    { title: "Litha", rows: 11, chords: ["Cm7"] },
  ],
  ...overrides,
});

describe("capture verification", () => {
  it("passes when both sides drew the same charts", () => {
    assert.deepEqual(verifyCaptures(side(), side()), []);
  });

  it("catches a different window, song, row count or chord", () => {
    assert.match(verifyCaptures(side(), side({ viewport: { width: 412, height: 800, deviceScaleFactor: 2.625 } }))[0], /viewport/);

    const renamed = side();
    renamed.songs[1] = { ...renamed.songs[1], title: "Barbara" };
    assert.match(verifyCaptures(side(), renamed)[0], /song 2: "Litha" before, "Barbara" after/);

    const rewrapped = side();
    rewrapped.songs[0] = { ...rewrapped.songs[0], rows: 9 };
    assert.match(verifyCaptures(side(), rewrapped)[0], /8 rows before, 9 after/);

    const respelled = side();
    respelled.songs[0] = { ...respelled.songs[0], chords: ["Ebm7", "Bb7"] };
    assert.match(verifyCaptures(side(), respelled)[0], /chord 2 reads "Bbm7" before, "Bb7" after/);
  });

  it("stops at the first count that does not line up", () => {
    const shorter = side({ songs: [side().songs[0]] });

    assert.deepEqual(verifyCaptures(side(), shorter), ["songs: 2 before, 1 after"]);
  });

  it("checks each song's composer, key and capture viewport", () => {
    for (const [field, first, second] of [
      ["composer", "Desmond Paul", "Someone else"],
      ["key", "Eb", "C"],
      ["viewport", side().viewport, { ...side().viewport, width: 390 }],
    ]) {
      const before = side();
      const after = side();
      before.songs[0][field] = first;
      after.songs[0][field] = second;
      assert.match(verifyCaptures(before, after)[0], new RegExp(field));
    }
  });
});

describe("dependency compatibility", () => {
  it("accepts an identical tree and names every difference otherwise", () => {
    const checkout = { "pnpm-lock.yaml": "a", "packages/ireal/src/extract.js": "b" };

    assert.deepEqual(compareTrees(checkout, { ...checkout }), []);
    assert.deepEqual(compareTrees(checkout, { "pnpm-lock.yaml": "a", "packages/ireal/src/extract.js": "c", "packages/ireal/src/new.js": "d" }), [
      { file: "packages/ireal/src/extract.js", reason: "differs from the checkout" },
      { file: "packages/ireal/src/new.js", reason: "not in the checkout" },
    ]);
    assert.deepEqual(compareTrees(checkout, { "pnpm-lock.yaml": "a" }), [
      { file: "packages/ireal/src/extract.js", reason: "missing from the revision" },
    ]);
  });
});
