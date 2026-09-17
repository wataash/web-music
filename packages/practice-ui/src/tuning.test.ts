// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";

import { DEFAULT_TUNING, describeTuning, isStandardGuitarTuning, tuningSlug } from "./tuning";

it("names standard guitar with the empty slug and every other tuning by its pitches", () => {
  expect(isStandardGuitarTuning([...DEFAULT_TUNING])).toBe(true);
  expect(tuningSlug(DEFAULT_TUNING)).toBe("");
  expect(tuningSlug([43, 38, 33, 28])).toBe("43-38-33-28");
  expect(tuningSlug([64, 59, 55, 50, 45, 38])).toBe("64-59-55-50-45-38");
  expect(describeTuning([43, 38, 33, 28])).toBe("4-string bass");
  expect(describeTuning([64, 59, 55, 50, 45, 38])).toBe("Custom 6-string tuning");
});
