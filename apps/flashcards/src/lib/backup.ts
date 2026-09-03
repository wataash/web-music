// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Everything the reader built up lives in this browser, under this origin: the
// FSRS schedule and the answers behind it in IndexedDB, the deck settings in
// localStorage. Another browser — or the same app served from another domain —
// starts empty. A backup carries that across. Deck content stays out of it:
// the app downloads the decks again on its own, and study state is keyed by
// note guid, so it lands back on the same cards.

import { clearUndoQueue } from "./undo";
import { db, type RevlogRow, type StateRow } from "./db";

export const BACKUP_FORMAT = "music-flashcards-backup";
export const BACKUP_VERSION = 1;

const SETTINGS_PREFIX = "music-flashcards:";

// Settings that describe this browser rather than what the reader chose:
// which deck files it has already imported, and the id it signs its answers
// with. Carried over, the first would skip the import the new browser still
// needs, and the second would leave two devices reviewing under one name.
const LOCAL_ONLY_SETTINGS: ReadonlySet<string> = new Set([
  `${SETTINGS_PREFIX}bundled-deck-versions`,
  `${SETTINGS_PREFIX}dev-deck-versions`,
  `${SETTINGS_PREFIX}review-device-id`,
]);

// The row id is IndexedDB's own auto-increment counter, meaningless in another
// database; `eventId` is what identifies a review wherever it ends up.
export type BackupReview = Omit<RevlogRow, "id">;

export type BackupSettings = Readonly<Record<string, string>>;

export type BackupDocument = Readonly<{
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  states: readonly StateRow[];
  revlog: readonly BackupReview[];
  settings: BackupSettings;
}>;

export type RestoreSummary = Readonly<{
  statesWritten: number;
  statesKept: number;
  reviewsAdded: number;
  settingsWritten: number;
}>;

type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "key" | "length"
>;

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

export function readSettings(
  storage: StorageLike | undefined = browserStorage(),
): BackupSettings {
  if (!storage) return {};
  const settings: Record<string, string> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key === null) continue;
    if (!key.startsWith(SETTINGS_PREFIX) || LOCAL_ONLY_SETTINGS.has(key)) {
      continue;
    }
    const value = storage.getItem(key);
    if (value !== null) settings[key] = value;
  }
  return settings;
}

export function writeSettings(
  settings: BackupSettings,
  storage: StorageLike | undefined = browserStorage(),
): number {
  if (!storage) return 0;
  let written = 0;
  for (const [key, value] of Object.entries(settings)) {
    if (!key.startsWith(SETTINGS_PREFIX) || LOCAL_ONLY_SETTINGS.has(key)) {
      continue;
    }
    storage.setItem(key, value);
    written += 1;
  }
  return written;
}

export async function createBackup(
  now: Date = new Date(),
): Promise<BackupDocument> {
  const [states, revlog] = await Promise.all([
    db.states.toArray(),
    db.revlog.toArray(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    states,
    revlog: revlog.map((review) => ({
      eventId: review.eventId,
      deviceId: review.deviceId,
      key: review.key,
      rating: review.rating,
      ts: review.ts,
    })),
    settings: readSettings(),
  };
}

export function parseBackupDocument(value: unknown): BackupDocument {
  if (!isRecord(value)) throw new Error("invalid backup file");
  if (value.format !== BACKUP_FORMAT) {
    throw new Error("this file is not a Music Flashcards backup");
  }
  if (value.version !== BACKUP_VERSION) {
    throw new Error(
      `unsupported backup version ${String(value.version)} (expected ${BACKUP_VERSION})`,
    );
  }
  if (!Array.isArray(value.states) || !value.states.every(isStateRow)) {
    throw new Error("invalid backup study state");
  }
  if (!Array.isArray(value.revlog) || !value.revlog.every(isBackupReview)) {
    throw new Error("invalid backup review log");
  }
  const settings = isRecord(value.settings) ? value.settings : {};
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt:
      typeof value.exportedAt === "string" ? value.exportedAt : "",
    states: value.states,
    revlog: value.revlog,
    settings: Object.fromEntries(
      Object.entries(settings).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  };
}

// A restore merges rather than replaces: the browser being restored into may
// have studied since the backup was written, and the two histories are both
// worth keeping. `updatedAt` decides a card the two disagree on — the same
// rule a sync between two devices would need.
export function statesToWrite(
  local: readonly StateRow[],
  incoming: readonly StateRow[],
): readonly StateRow[] {
  const localByKey = new Map(local.map((state) => [state.key, state]));
  return incoming.filter((state) => {
    const mine = localByKey.get(state.key);
    return mine === undefined || state.updatedAt > mine.updatedAt;
  });
}

export function reviewsToAdd(
  knownEventIds: ReadonlySet<string>,
  incoming: readonly BackupReview[],
): readonly BackupReview[] {
  const seen = new Set(knownEventIds);
  return incoming.filter((review) => {
    if (seen.has(review.eventId)) return false;
    seen.add(review.eventId);
    return true;
  });
}

export async function restoreBackup(
  backup: BackupDocument,
): Promise<RestoreSummary> {
  // The rows the undo queue holds before-images of are about to be written
  // from elsewhere, and undoing to them afterwards would put the reader back
  // somewhere they never were.
  clearUndoQueue();
  let statesWritten = 0;
  let reviewsAdded = 0;
  await db.transaction("rw", [db.states, db.revlog], async () => {
    const writable = statesToWrite(await db.states.toArray(), backup.states);
    await db.states.bulkPut([...writable]);
    statesWritten = writable.length;

    const known = new Set(
      (await db.revlog.toArray()).map(({ eventId }) => eventId),
    );
    const added = reviewsToAdd(known, backup.revlog);
    await db.revlog.bulkAdd([...added]);
    reviewsAdded = added.length;
  });
  return {
    statesWritten,
    statesKept: backup.states.length - statesWritten,
    reviewsAdded,
    settingsWritten: writeSettings(backup.settings),
  };
}

export function backupFilename(exportedAt: string): string {
  // Colons are no good in a filename on Windows, and the seconds are enough to
  // tell two backups of the same day apart.
  const stamp = exportedAt.slice(0, 19).replace("T", "-").replaceAll(":", "");
  return `music-flashcards-${stamp}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStateRow(value: unknown): value is StateRow {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    isRecord(value.fsrs) &&
    typeof value.due === "number" &&
    (value.stateKind === "learning" || value.stateKind === "review") &&
    typeof value.introducedDay === "number" &&
    typeof value.updatedAt === "number" &&
    typeof value.updatedBy === "string"
  );
}

function isBackupReview(value: unknown): value is BackupReview {
  return (
    isRecord(value) &&
    typeof value.eventId === "string" &&
    typeof value.deviceId === "string" &&
    typeof value.key === "string" &&
    typeof value.rating === "number" &&
    typeof value.ts === "number"
  );
}
