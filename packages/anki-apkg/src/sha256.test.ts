// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { sha256Base64Url, sha256Hex } from "./sha256";

describe("sha256", () => {
  it("matches node:crypto on the inputs the generators hash", () => {
    const inputs = [
      "",
      "abc",
      "guitar-intervals:r1-s2-f3",
      "guitar-fretboard:new-card-order:note-to-positions-flat-string-6-pitch-10",
      // Exactly one block, then one byte over, then the padding boundary.
      "a".repeat(55),
      "a".repeat(56),
      "a".repeat(64),
      "a".repeat(1000),
      "♭9 ♯11 𝄫",
    ];
    for (const input of inputs) {
      const node = createHash("sha256").update(input);
      expect(sha256Hex(input), input).toBe(node.digest("hex"));
      expect(sha256Base64Url(input), input).toBe(
        createHash("sha256").update(input).digest("base64url"),
      );
    }
  });
});
