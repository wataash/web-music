// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { optionalKeyboardRange } from "./optional-keyboard";
import { MAJOR_KEYS } from "./key-signature";

describe("optional keyboard range", () => {
  it("centres each key count on the tonic octave for every major key", () => {
    const pitchClasses = [0, 7, 2, 9, 4, 11, 6, 5, 10, 3, 8, 1, 1, 6, 11];
    for (const [index, key] of MAJOR_KEYS.entries()) {
      for (let count = 13; count <= 49; count += 2) {
        const range = optionalKeyboardRange(key.tonic, count);
        expect(range.focusFirst).toBe(60 + pitchClasses[index]);
        expect(range.focusLast - range.focusFirst).toBe(12);
        expect(range.last - range.first + 1).toBe(count);
        expect(range.focusFirst - range.first).toBe((count - 13) / 2);
        expect(range.last - range.focusLast).toBe((count - 13) / 2);
      }
    }
  });

  it("defaults to 25 keys for a tonic and 13 for other reference keyboards", () => {
    expect(optionalKeyboardRange("F", NaN)).toEqual({ first: 59, last: 83, focusFirst: 65, focusLast: 77 });
    expect(optionalKeyboardRange("", NaN)).toEqual({ first: 60, last: 72, focusFirst: 60, focusLast: 72 });
    expect(optionalKeyboardRange("F", 100)).toEqual(optionalKeyboardRange("F", 25));
  });
});
