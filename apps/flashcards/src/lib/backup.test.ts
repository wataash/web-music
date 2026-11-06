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
  type BackupSettings,
} from "./backup";
import type { StateRow } from "./db";
import { newEmptyCard, scheduleAnswer, serializeFsrsCard, Rating } from "./scheduler";


function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => { values.delete(key); },
    entries: () => Object.fromEntries(values),
  };
}

function state(key: string, updatedAt: number): StateRow {
  const now = new Date(updatedAt);
  const card = scheduleAnswer(newEmptyCard(now), Rating.Easy, now).card;
  return {
    key,
    fsrs: serializeFsrsCard(card),
    due: card.due.getTime(),
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
  it.each<BackupSettings>([{}, { "music-flashcards:collapsed-decks": "[]" }])(
    "restores defaults for absent settings while preserving device-local data: %j",
    (incoming) => {
      const preserved = {
        "music-flashcards:bundled-deck-versions": "bundled",
        "music-flashcards:dev-deck-versions": "dev",
        "music-flashcards:review-device-id": "mine",
        "some-other-app": "untouched",
      };
      const storage = memoryStorage({
        ...preserved,
        "music-flashcards:hidden-decks": '["Intervals"]',
        "music-flashcards:card-scales": '{"Intervals":2}',
        "music-flashcards:collapsed-decks": '["Music Staff"]',
      });

      expect(writeSettings(incoming, storage)).toBe(Object.keys(incoming).length);
      expect(readSettings(storage)).toEqual(incoming);
      expect(storage.entries()).toEqual({ ...preserved, ...incoming });
    },
  );

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
  it.each([[30, 10], [10, 30], [30, 30]])(
    "keeps only the newest incoming state for a repeated key (%s, %s)",
    (first, second) => {
      const incoming = [state("repeated", first), state("repeated", second)];
      expect(statesToWrite([], incoming)).toEqual([state("repeated", 30)]);
      expect(statesToWrite([state("repeated", 20)], incoming)).toEqual([
        state("repeated", 30),
      ]);
      expect(statesToWrite([state("repeated", 40)], incoming)).toEqual([]);
    },
  );

  it("discards database row IDs before adding incoming reviews", () => {
    const incoming = { ...review("new-event"), id: 1 };
    expect(reviewsToAdd(new Set(), [incoming])).toEqual([review("new-event")]);
    expect(incoming.id).toBe(1);
  });

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

describe("backup schedule validation", () => {
  const fields = ["due", "last_review", "state", "stability", "difficulty", "elapsed_days", "scheduled_days", "reps", "lapses"];
  it.each(fields)("rejects a schedule missing %s", (field) => {
    const row = state("note#0", 10);
    const fsrs = { ...row.fsrs };
    delete fsrs[field];
    expect(() => parseBackupDocument(document({ states: [{ ...row, fsrs }] }))).toThrow(/invalid backup study state/);
  });
  it.each([
    ["state", 9], ["state", "Review"], ["stability", 0], ["stability", NaN],
    ["difficulty", 11], ["difficulty", -1], ["elapsed_days", Infinity],
    ["scheduled_days", -1], ["reps", 0], ["reps", 1.5], ["lapses", 2],
    ["learning_steps", -1], ["last_review", null], ["last_review", 9e15],
  ])("rejects an invalid %s (%s)", (field, value) => {
    const row = state("note#0", 10);
    expect(() => parseBackupDocument(document({ states: [{ ...row, fsrs: { ...row.fsrs, [field as string]: value } }] }))).toThrow(/invalid backup study state/);
  });
  it.each([{ fsrs: {} }, { due: 1 }, { stateKind: "learning" }, { updatedAt: Infinity }, { introducedDay: 1.5 }])("rejects inconsistent state metadata: %j", (changes) => {
    expect(() => parseBackupDocument(document({ states: [{ ...state("note#0", 10), ...changes }] }))).toThrow(/invalid backup study state/);
  });
  it("accepts schedules produced by every answer and subsequent transition", () => {
    for (const first of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const) {
      for (const second of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const) {
        const now = new Date(1000);
        const initial = scheduleAnswer(newEmptyCard(now), first, now).card;
        const next = scheduleAnswer(initial, second, initial.due).card;
        for (const card of [initial, next]) {
          const row = { ...state("note#0", 10), fsrs: serializeFsrsCard(card), due: card.due.getTime(), stateKind: card.state === 2 ? "review" : "learning" };
          expect(parseBackupDocument(document({ states: [row] })).states).toEqual([row]);
        }
      }
    }
  });
  it("accepts older schedules without learning_steps", () => {
    const row = state("note#0", 10);
    const fsrs = { ...row.fsrs };
    delete fsrs.learning_steps;
    expect(parseBackupDocument(document({ states: [{ ...row, fsrs }] })).states).toHaveLength(1);
  });
  it.each([{ rating: 0 }, { rating: 5 }, { rating: 1.5 }, { ts: 9e15 }, { key: "" }])("rejects an invalid review: %j", (changes) => {
    expect(() => parseBackupDocument(document({ revlog: [{ ...review("a"), ...changes }] }))).toThrow(/invalid backup review log/);
  });
});
