// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEGREES } from "./intervals.js";
import { spellDegree } from "./notes.js";

const spell = (root, degree) => spellDegree(root, DEGREES.get(degree));

describe("spellDegree", () => {
  it("keeps the letter the degree's size asks for", () => {
    assert.equal(spell("C", "M3"), "E");
    assert.equal(spell("C", "d5"), "Gb");
    assert.equal(spell("C", "A4"), "F#");
    assert.equal(spell("A", "13"), "F#");
  });

  it("spells double accidentals rather than their enharmonic equivalents", () => {
    assert.equal(spell("Ab", "d7"), "Gbb");
    assert.equal(spell("Eb", "d5"), "Bbb");
    assert.equal(spell("E", "#9"), "F##");
    assert.equal(spell("A#", "M3"), "C##");
  });

  it("has no spelling that would need a triple accidental", () => {
    assert.equal(spell("Cb", "d7"), null);
  });

  it("rejects a root it cannot read", () => {
    assert.throws(() => spell("H", "P5"), TypeError);
    assert.throws(() => spell("Cx", "P5"), TypeError);
  });
});
