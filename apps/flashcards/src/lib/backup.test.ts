// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFilename,
  parseBackupDocument,
  readSettings,
  reviewsToAdd,
  statesToWrite,
  writeSettings,
  type BackupReview,
} from "./backup";
import type { StateRow } from "./db";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    entries: () => Object.fromEntries(values),
  };
}

function state(key: string, updatedAt: number): StateRow {
  return {
    key,
    fsrs: { due: updatedAt },
    due: updatedAt,
    stateKind: "review",
    introducedDay: 0,
    updatedAt,
    updatedBy: `test:${key}:${updatedAt}`,
  };
}

function review(eventId: string): BackupReview {
  return { eventId, deviceId: "test", key: "note#0", rating: 3, ts: 1 };
}

function document(overrides: Record<string, unknown> = {}) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: "2026-09-02T03:04:05.678Z",
    states: [state("note#0", 10)],
    revlog: [review("a")],
    settings: { "music-flashcards:hidden-decks": "[]" },
    ...overrides,
  };
}

describe("backup settings", () => {
  it("takes the app's own settings and leaves the rest of the origin alone", () => {
    const storage = memoryStorage({
      "music-flashcards:hidden-decks": '["Intervals"]',
      "music-flashcards:card-scales": "{}",
      "some-other-app": "x",
    });
    expect(readSettings(storage)).toEqual({
      "music-flashcards:hidden-decks": '["Intervals"]',
      "music-flashcards:card-scales": "{}",
    });
  });

  it("leaves out what describes this browser rather than the reader", () => {
    const storage = memoryStorage({
      "music-flashcards:bundled-deck-versions": "{}",
      "music-flashcards:dev-deck-versions": "{}",
      "music-flashcards:review-device-id": "device-1",
      "music-flashcards:collapsed-decks": "[]",
    });
    expect(readSettings(storage)).toEqual({
      "music-flashcards:collapsed-decks": "[]",
    });
  });

  it("refuses to restore those, or anything outside the app, from a file", () => {
    const storage = memoryStorage({ "music-flashcards:review-device-id": "mine" });
    const written = writeSettings(
      {
        "music-flashcards:hidden-decks": "[]",
        "music-flashcards:review-device-id": "theirs",
        "some-other-app": "x",
      },
      storage,
    );
    expect(written).toBe(1);
    expect(storage.entries()).toEqual({
      "music-flashcards:review-device-id": "mine",
      "music-flashcards:hidden-decks": "[]",
    });
  });
});

describe("parsing a backup file", () => {
  it("accepts one this app wrote", () => {
    const parsed = parseBackupDocument(document());
    expect(parsed.states).toHaveLength(1);
    expect(parsed.revlog).toHaveLength(1);
    expect(parsed.exportedAt).toBe("2026-09-02T03:04:05.678Z");
  });

  it("rejects another app's JSON, and a version it cannot read", () => {
    expect(() => parseBackupDocument({ hello: "world" })).toThrow(
      /not a Music Flashcards backup/,
    );
    expect(() => parseBackupDocument(document({ version: 2 }))).toThrow(
      /unsupported backup version 2/,
    );
  });

  it("rejects rows that would put nonsense into the schedule", () => {
    expect(() =>
      parseBackupDocument(document({ states: [{ key: "note#0" }] })),
    ).toThrow(/invalid backup study state/);
    expect(() =>
      parseBackupDocument(document({ revlog: [{ eventId: "a" }] })),
    ).toThrow(/invalid backup review log/);
  });

  it("keeps only the settings that are strings", () => {
    const parsed = parseBackupDocument(
      document({
        settings: { "music-flashcards:hidden-decks": "[]", broken: 7 },
      }),
    );
    expect(parsed.settings).toEqual({ "music-flashcards:hidden-decks": "[]" });
  });
});

describe("merging a backup into what is already here", () => {
  it("writes the cards the file knows better, and keeps the newer local ones", () => {
    const local = [state("kept", 20), state("replaced", 5)];
    const incoming = [
      state("kept", 10),
      state("replaced", 30),
      state("added", 1),
    ];
    expect(statesToWrite(local, incoming).map(({ key }) => key)).toEqual([
      "replaced",
      "added",
    ]);
  });

  it("adds only the answers this browser has not seen, once each", () => {
    const added = reviewsToAdd(new Set(["a"]), [
      review("a"),
      review("b"),
      review("b"),
    ]);
    expect(added.map(({ eventId }) => eventId)).toEqual(["b"]);
  });
});

describe("backup filenames", () => {
  it("names the file after the moment it was written", () => {
    expect(backupFilename("2026-09-02T03:04:05.678Z")).toBe(
      "music-flashcards-2026-09-02-030405.json",
    );
  });
});
