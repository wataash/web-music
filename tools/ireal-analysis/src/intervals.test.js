// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEGREES, QUALITY_INTERVALS } from "./intervals.js";

describe("QUALITY_INTERVALS", () => {
  it("names only known degrees, without repeats", () => {
    for (const [quality, intervals] of QUALITY_INTERVALS) {
      for (const interval of intervals) {
        assert.ok(
          DEGREES.has(interval),
          `${quality} names an unknown degree: ${interval}`,
        );
      }
      assert.equal(
        new Set(intervals).size,
        intervals.length,
        `${quality} repeats a degree`,
      );
    }
  });

  it("gives every quality a 3rd or a suspended 4th", () => {
    for (const [quality, intervals] of QUALITY_INTERVALS) {
      assert.ok(
        ["M3", "m3", "P4", "M2"].some((third) => intervals.includes(third)),
        `${quality} has no 3rd`,
      );
    }
  });
});
