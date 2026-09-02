// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

// AnkiDroid-style compact interval labels shown above the answer buttons:
// "<1m", "10m", "23h", "3d", "2.5mo", "1.2y".
export function formatInterval(ms: number): string {
  if (ms < MINUTE) return "<1m";
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  if (ms < MONTH) return `${Math.round(ms / DAY)}d`;
  if (ms < YEAR) return `${trimmed(ms / MONTH)}mo`;
  return `${trimmed(ms / YEAR)}y`;
}

// "1 card", "2 cards" — for the counts written into a sentence rather than a
// column.
export function counted(amount: number, noun: string): string {
  return `${amount} ${noun}${amount === 1 ? "" : "s"}`;
}

function trimmed(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
