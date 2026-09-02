// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  addToDailyNewLimit,
  clearDailyNewLimits,
  dailyNewLimit,
  DEFAULT_NEW_PER_DAY,
  exportDailyLimits,
  mergeDailyLimits,
} from "./daily-limits";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("today-only new-card limits", () => {
  it("adds to the default limit for one deck scope", () => {
    const storage = new MemoryStorage();
    const now = new Date(2026, 7, 15, 12);
    expect(dailyNewLimit("Deck", now, storage)).toBe(DEFAULT_NEW_PER_DAY);
    expect(addToDailyNewLimit("Deck", 10, now, storage)).toBe(30);
    expect(dailyNewLimit("Deck", now, storage)).toBe(30);
    expect(dailyNewLimit("Other", now, storage)).toBe(DEFAULT_NEW_PER_DAY);
  });

  it("expires at the 04:00 study-day boundary", () => {
    const storage = new MemoryStorage();
    addToDailyNewLimit("Deck", 5, new Date(2026, 7, 15, 3, 59), storage);
    expect(dailyNewLimit("Deck", new Date(2026, 7, 15, 3, 59), storage)).toBe(
      25,
    );
    expect(dailyNewLimit("Deck", new Date(2026, 7, 15, 4), storage)).toBe(20);
  });

  it("ignores negative increments and rounds down fractional ones", () => {
    const storage = new MemoryStorage();
    const now = new Date(2026, 7, 15, 12);
    expect(addToDailyNewLimit("Deck", -10, now, storage)).toBe(20);
    expect(addToDailyNewLimit("Deck", 2.9, now, storage)).toBe(22);
  });

  it("merges synced limits without lowering an existing allowance", () => {
    const storage = new MemoryStorage();
    mergeDailyLimits(
      { Deck: { day: 100, newLimit: 30 } },
      storage,
    );
    mergeDailyLimits(
      {
        Deck: { day: 100, newLimit: 25 },
        Other: { day: 101, newLimit: 40 },
      },
      storage,
    );
    expect(exportDailyLimits(storage)).toEqual({
      Deck: { day: 100, newLimit: 30 },
      Other: { day: 101, newLimit: 40 },
    });
  });
});

describe("clearing a scope's limits", () => {
  it("drops the deck and its subdecks, keeping the rest", () => {
    const storage = new MemoryStorage();
    mergeDailyLimits(
      {
        "Music Staff": { day: 100, newLimit: 30 },
        "Music Staff::Treble Clef": { day: 100, newLimit: 25 },
        "Music Stafford": { day: 100, newLimit: 40 },
        Intervals: { day: 100, newLimit: 50 },
      },
      storage,
    );

    clearDailyNewLimits("Music Staff", storage);

    expect(exportDailyLimits(storage)).toEqual({
      "Music Stafford": { day: 100, newLimit: 40 },
      Intervals: { day: 100, newLimit: 50 },
    });
  });
});
