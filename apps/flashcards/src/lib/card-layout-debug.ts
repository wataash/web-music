// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Keep only layout gestures and geometry. Never record card text, note data,
// storage contents, or coordinates outside the card's own viewport.
const KEY = "music-flashcards:layout-debug";
const MAX_ENTRIES = 160;
type Detail = Readonly<Record<string, string | number | boolean | null | undefined>>;

function storedEntries(): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

const entries = typeof sessionStorage === "undefined" ? [] : storedEntries();

export function recordCardLayoutDebug(action: string, detail: Detail = {}, persist = true): void {
  entries.push(JSON.stringify({ time: new Date().toISOString(), action, ...detail }));
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  if (!persist) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Debugging must not interrupt a gesture when storage is unavailable.
  }
}

export function cardLayoutDebugText(): string {
  const browser = typeof navigator === "undefined" ? "unknown" : navigator.userAgent;
  const viewport = typeof window === "undefined" ? "unknown" : `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`;
  return [`Browser: ${browser}`, `Viewport: ${viewport}`, ...entries].join("\n");
}
