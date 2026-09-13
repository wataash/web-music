// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "./fixtures";

test("migrates guitar shapes, rotates variants, and shares reset, undo and restored history", async ({ page }) => {
  await page.route("**/shape-check", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Shape check</title>" }));
  await page.goto("/shape-check");
  const result = await page.evaluate(async () => {
    const dbPath = "/src/lib/db.ts", studyPath = "/src/lib/study.ts", backupPath = "/src/lib/backup.ts", undoPath = "/src/lib/undo.ts";
    const { db, importDeckData } = await import(dbPath);
    const { nextCard, answerCard, Rating, resetPreview, resetDeckProgress, extraStudyAvailability, listDecksWithCounts } = await import(studyPath);
    const { undo, redo } = await import(undoPath);
    const { restoreBackup, createBackup } = await import(backupPath);
    const { deck } = await (await fetch("/__dev_deck/guitar-intervals")).json();
    const notes = ["r1-s2-0", "r3-s4-0", "r4-s5-0", "r5-s6-0"].map(id => deck.notes.find(n => n.fields[0] === id));
    const keys = notes.map(n => `${n.guid}#0`);
    const now = new Date("2026-09-13T03:00:00Z");
    const state = (key: string, ts: number, reps: number) => ({ key, fsrs: { due: now.getTime(), stability: 5, difficulty: 5, elapsed_days: 1, scheduled_days: 1, learning_steps: 0, reps, lapses: 0, state: 2, last_review: ts }, due: now.getTime(), stateKind: "review", introducedDay: 20000, updatedAt: ts, updatedBy: `event-${ts}` });
    const old = state(keys[0], now.getTime() - 2000, 2);
    const latest = state(keys[1], now.getTime() - 1000, 5);
    const logs = [old, latest].map(s => ({ eventId: s.updatedBy, deviceId: "legacy", key: s.key, rating: 1, ts: s.updatedAt }));
    // Create the actual version-3 schema and raw, ungrouped deck content.
    const opened = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("music-flashcards", 30);
      request.onupgradeneeded = () => {
        const database = request.result;
        for (const [name, keyPath, indexes] of [
          ["decks", "did", ["name", "pkg"]], ["models", "mid", ["pkg"]], ["notes", "id", ["guid", "pkg"]],
          ["cards", "id", ["key", "did", "pkg"]], ["media", "filename", ["pkg"]],
          ["states", "key", ["due", "introducedDay"]], ["revlog", "id", ["eventId", "key", "ts"]], ["syncMeta", "key", []],
        ] as const) {
          const store = database.createObjectStore(name, { keyPath, autoIncrement: name === "revlog" });
          for (const index of indexes) store.createIndex(index, index, { unique: index === "eventId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const pkg = "Guitar Intervals";
    await new Promise<void>((resolve, reject) => {
      const tx = opened.transaction(["decks", "models", "notes", "cards", "states", "revlog"], "readwrite");
      for (const table of ["decks", "models", "notes"] as const) for (const row of deck[table]) tx.objectStore(table).put({ ...row, pkg });
      for (const card of deck.cards) tx.objectStore("cards").put({ ...card, pkg, key: `${deck.notes.find(n => n.id === card.nid).guid}#${card.ord}` });
      for (const row of [old, latest]) tx.objectStore("states").put(row);
      for (const row of logs) tx.objectStore("revlog").put(row);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    opened.close();
    await db.open();
    const migrated = await db.states.toArray();
    const migratedLogs = await db.revlog.toArray();
    const full = await resetPreview(pkg);
    const includeNote = n => notes.some(member => member.guid === n.guid);
    const options = { includeNote };
    const item = await nextCard(pkg, now, options);
    const counts = await listDecksWithCounts(now, options);
    const extra = await extraStudyAvailability(pkg, new Set(), now, options);
    await answerCard(item, Rating.Easy, now);
    const reviewed = (await db.states.toArray())[0];
    const next = await nextCard(pkg, new Date(reviewed.due), options);
    await undo();
    const undone = await nextCard(pkg, now, options);
    await redo();
    await resetDeckProgress(pkg);
    const cleared = [await db.states.count(), await db.revlog.count()];
    await undo();
    const restoredReset = [await db.states.count(), await db.revlog.count()];
    const backup = await createBackup(now);
    await restoreBackup({ ...backup, states: [old, latest], revlog: logs });
    await restoreBackup({ ...backup, states: [old, latest], revlog: logs });
    const afterOldBackup = await db.states.toArray();
    await importDeckData(deck);
    const afterImport = await db.states.toArray();
    const window = await extraStudyAvailability(pkg, new Set(), now, { includeNote: n => Math.abs(Number(n.fields[4])) <= 3 });
    return { migrated, migratedLogs, full, counts, extra,
      sharedKey: item.card.key === next.card.key, changedString: item.note.fields[2] !== next.note.fields[2],
      undoSameString: item.note.fields[2] === undone.note.fields[2], cleared, restoredReset,
      reviewed, afterOldBackup, afterImport, window,
      expectedFsrs: latest.fsrs, finalLogCount: await db.revlog.count() };
  });
  expect(result.migrated).toHaveLength(1);
  expect(result.migrated[0].fsrs).toEqual(result.expectedFsrs);
  expect(result.migratedLogs).toHaveLength(2);
  expect(new Set(result.migratedLogs.map(log => log.key)).size).toBe(1);
  expect(result.full).toMatchObject({ totalCount: 220, studiedCount: 1, reviewCount: 2 });
  expect(result.counts[0]).toMatchObject({ newCount: 0, dueCount: 1 });
  expect(result.extra).toMatchObject({ newRemaining: 0 });
  expect(result.extra.forgottenTodayKeys).toHaveLength(1);
  expect(result.sharedKey).toBe(true);
  expect(result.changedString).toBe(true);
  expect(result.undoSameString).toBe(true);
  expect(result.cleared).toEqual([0, 0]);
  expect(result.restoredReset).toEqual([1, 3]);
  expect(result.afterOldBackup).toEqual([result.reviewed]);
  expect(result.afterImport).toEqual([result.reviewed]);
  expect(result.finalLogCount).toBe(3);
  expect(result.window.newRemaining).toBe(117);
});

test("restores old guitar schedules before deck import and accepts a newer legacy review", async ({ page }) => {
  await page.route("**/shape-restore-check", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Restore check</title>" }));
  await page.goto("/shape-restore-check");
  const result = await page.evaluate(async () => {
    const dbPath = "/src/lib/db.ts", backupPath = "/src/lib/backup.ts";
    const { db, importDeckData } = await import(dbPath);
    const { restoreBackup, BACKUP_FORMAT, BACKUP_VERSION } = await import(backupPath);
    const { deck } = await (await fetch("/__dev_deck/guitar-intervals")).json();
    const keys = ["r1-s2-0", "r3-s4-0"].map(id => `${deck.notes.find(n => n.fields[0] === id).guid}#0`);
    const state = (key: string, updatedAt: number) => ({ key, fsrs: { reps: updatedAt }, due: updatedAt + 1000, stateKind: "review", introducedDay: 10, updatedAt, updatedBy: String(updatedAt) });
    const backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: "", states: [state(keys[0], 10), state(keys[1], 20)], revlog: [], settings: {} };
    await restoreBackup(backup);
    const beforeImport = await db.states.count();
    await importDeckData(deck);
    const imported = await db.states.toArray();
    await restoreBackup({ ...backup, states: [state(keys[0], 30), state(keys[1], 15)] });
    const newer = await db.states.toArray();
    await restoreBackup(backup);
    return { beforeImport, imported, newer, afterOlder: await db.states.toArray() };
  });
  expect(result.beforeImport).toBe(2);
  expect(result.imported).toHaveLength(1);
  expect(result.imported[0].updatedAt).toBe(20);
  expect(result.newer).toHaveLength(1);
  expect(result.newer[0].updatedAt).toBe(30);
  expect(result.newer[0].key).toBe(result.imported[0].key);
  expect(result.afterOlder).toEqual(result.newer);
});
