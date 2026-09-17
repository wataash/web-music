// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";

import { DEFAULT_GUITAR_TUNING, noteTuning, parseGuitarTuning, tuningStorageKey } from "./guitar-tuning";

it("reads a card's strings from its tuning field and falls back to a guitar's", () => {
  expect(noteTuning({ fields: ["id", "guitar-interval", "1", "2", "0", "", "", "", "43 38 33 28"] })).toEqual([43, 38, 33, 28]);
  expect(noteTuning({ fields: ["id", "guitar-interval", "1", "2", "0", "", "", ""] })).toEqual(DEFAULT_GUITAR_TUNING);
  expect(noteTuning({ fields: ["id", "guitar-interval", "1", "2", "0", "", "", "", "x y"] })).toEqual(DEFAULT_GUITAR_TUNING);
});

it("keeps standard guitar under the old keys and other instruments under their own", () => {
  expect(parseGuitarTuning(null)).toEqual(DEFAULT_GUITAR_TUNING);
  expect(parseGuitarTuning([43, 38, 33, 28])).toEqual([43, 38, 33, 28]);
  expect(tuningStorageKey("k", DEFAULT_GUITAR_TUNING)).toBe("k");
  expect(tuningStorageKey("k", [43, 38, 33, 28])).toBe("k:43-38-33-28");
});
