// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { dayNumber } from "./scheduler";

export const DEFAULT_NEW_PER_DAY = 20;

const STORAGE_KEY = "music-flashcards:daily-study-limits";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type StoredDailyLimit = Readonly<{
  day: number;
  newLimit: number;
}>;

export type StoredDailyLimits = Record<string, StoredDailyLimit>;

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function readStoredLimits(storage: StorageLike | undefined): StoredDailyLimits {
  if (!storage) return {};
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as StoredDailyLimits;
  } catch {
    return {};
  }
}

export function dailyNewLimit(
  scopeName: string,
  now: Date = new Date(),
  storage: StorageLike | undefined = browserStorage(),
): number {
  const stored = readStoredLimits(storage)[scopeName];
  if (
    !stored ||
    stored.day !== dayNumber(now) ||
    !Number.isSafeInteger(stored.newLimit)
  ) {
    return DEFAULT_NEW_PER_DAY;
  }
  return Math.max(DEFAULT_NEW_PER_DAY, stored.newLimit);
}

export function addToDailyNewLimit(
  scopeName: string,
  amount: number,
  now: Date = new Date(),
  storage: StorageLike | undefined = browserStorage(),
): number {
  const increment = Math.max(0, Math.floor(amount));
  const nextLimit = dailyNewLimit(scopeName, now, storage) + increment;
  if (!storage || increment === 0) return nextLimit;

  // Keep only entries for the current study day, so this item does not grow
  // indefinitely. The 04:00 rollover is encoded in dayNumber().
  const today = dayNumber(now);
  const current = readStoredLimits(storage);
  const next: StoredDailyLimits = Object.fromEntries(
    Object.entries(current).filter(([, value]) => value.day === today),
  );
  next[scopeName] = { day: today, newLimit: nextLimit };
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return nextLimit;
}

// Clearing a deck's progress clears the raised limits it earned, for the deck
// and for everything under it.
export function clearDailyNewLimits(
  scopeName: string,
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  const current = readStoredLimits(storage);
  const kept = Object.fromEntries(
    Object.entries(current).filter(
      ([scope]) => scope !== scopeName && !scope.startsWith(`${scopeName}::`),
    ),
  );
  storage.setItem(STORAGE_KEY, JSON.stringify(kept));
}

// What the undo queue keeps and puts back: the item as it stands, rather than
// one deck's entry, since a limit that was never raised has no entry at all.
export function dailyLimitsSnapshot(
  storage: StorageLike | undefined = browserStorage(),
): string | null {
  return storage?.getItem(STORAGE_KEY) ?? null;
}

export function restoreDailyLimits(
  value: string | null,
  storage: StorageLike | undefined = browserStorage(),
): void {
  // An item that was not there reads the same as one holding no limits.
  storage?.setItem(STORAGE_KEY, value ?? "{}");
}

export function exportDailyLimits(
  storage: StorageLike | undefined = browserStorage(),
): StoredDailyLimits {
  return readStoredLimits(storage);
}

export function mergeDailyLimits(
  remote: StoredDailyLimits,
  storage: StorageLike | undefined = browserStorage(),
): StoredDailyLimits {
  const local = readStoredLimits(storage);
  const merged: StoredDailyLimits = { ...local };
  for (const [scope, candidate] of Object.entries(remote)) {
    if (
      !Number.isSafeInteger(candidate.day) ||
      !Number.isSafeInteger(candidate.newLimit) ||
      candidate.newLimit < DEFAULT_NEW_PER_DAY
    ) {
      continue;
    }
    const current = merged[scope];
    if (
      !current ||
      candidate.day > current.day ||
      (candidate.day === current.day &&
        candidate.newLimit > current.newLimit)
    ) {
      merged[scope] = candidate;
    }
  }
  storage?.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}
