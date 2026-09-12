// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { formatInterval } from "./format";
import {
  dayNumber,
  deserializeFsrsCard,
  endOfStudyDay,
  newEmptyCard,
  Rating,
  scheduler,
  serializeFsrsCard,
  startOfStudyDay,
} from "./scheduler";

describe("day arithmetic (04:00 rollover)", () => {
  it("keeps 3:59 on the previous study day", () => {
    const lateNight = new Date(2026, 7, 15, 3, 59);
    const morning = new Date(2026, 7, 15, 4, 0);
    expect(dayNumber(lateNight)).toBe(dayNumber(new Date(2026, 7, 14, 12, 0)));
    expect(dayNumber(morning)).toBe(dayNumber(lateNight) + 1);
  });

  it("keeps the 04:00 rollover across daylight-saving changes", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      for (const [year, month, day] of [
        [2026, 2, 8],
        [2026, 10, 1],
      ]) {
        const lateNight = new Date(year, month, day, 3, 59);
        const morning = new Date(year, month, day, 4, 0);
        expect(dayNumber(lateNight)).toBe(
          dayNumber(new Date(year, month, day - 1, 12, 0)),
        );
        expect(dayNumber(morning)).toBe(dayNumber(lateNight) + 1);
      }
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });

  it("ends the study day at the next 04:00", () => {
    expect(endOfStudyDay(new Date(2026, 7, 15, 12, 0))).toEqual(
      new Date(2026, 7, 16, 4, 0),
    );
    expect(endOfStudyDay(new Date(2026, 7, 15, 3, 0))).toEqual(
      new Date(2026, 7, 15, 4, 0),
    );
  });

  it("starts the study day at the most recent 04:00", () => {
    expect(startOfStudyDay(new Date(2026, 7, 15, 3, 59))).toEqual(
      new Date(2026, 7, 14, 4, 0),
    );
    expect(startOfStudyDay(new Date(2026, 7, 15, 4, 0))).toEqual(
      new Date(2026, 7, 15, 4, 0),
    );
  });
});

describe("fsrs card serialization", () => {
  it("round-trips through JSON-safe form", () => {
    const now = new Date("2026-08-15T10:00:00Z");
    const rated = scheduler.repeat(newEmptyCard(now), now)[Rating.Good].card;
    const roundTripped = deserializeFsrsCard(serializeFsrsCard(rated));
    expect(roundTripped.due).toEqual(rated.due);
    expect(roundTripped.state).toBe(rated.state);
    expect(roundTripped.stability).toBe(rated.stability);
    expect(roundTripped.last_review).toEqual(rated.last_review);
  });
});

describe("formatInterval", () => {
  it("formats AnkiDroid-style labels", () => {
    expect(formatInterval(30_000)).toBe("<1m");
    expect(formatInterval(10 * 60_000)).toBe("10m");
    expect(formatInterval(23 * 3_600_000)).toBe("23h");
    expect(formatInterval(3 * 86_400_000)).toBe("3d");
    expect(formatInterval(75 * 86_400_000)).toBe("2.5mo");
    expect(formatInterval(365 * 86_400_000)).toBe("1y");
  });
});
