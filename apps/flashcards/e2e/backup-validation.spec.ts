// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from './fixtures';
import type { BackupDocument } from '../src/lib/backup';

test('rejects a broken schedule without changing progress or settings, then accepts a real backup', async ({ page }) => {
  const imported = page.waitForEvent('console', { predicate: message => message.text().startsWith('[Music Flashcards] automatically imported') });
  await page.goto('/');
  await imported;
  const row = page.locator('[data-deck="II–V–I Progressions"]');
  await expect(row).toBeVisible({ timeout: 30000 });
  await row.locator('.deck-study').click();
  await expect(page.frameLocator('iframe[title="card"]').locator('.diatonic-card')).toBeVisible();
  await page.getByRole('button', { name: 'SHOW ANSWER', exact: true }).click();
  await page.getByRole('button', { name: /GOOD/ }).click();
  await expect(page.getByRole('button', { name: 'SHOW ANSWER', exact: true })).toBeVisible();
  await page.goBack();
  const snapshot = () => page.evaluate(async () => {
    const path = '/src/lib/backup.ts';
    const { createBackup } = await import(path);
    return await createBackup(new Date(0));
  });
  const good: BackupDocument = await snapshot();
  expect(good.states).toHaveLength(1);
  const bad = { ...good, states: good.states.map(state => ({ ...state, fsrs: {}, updatedAt: state.updatedAt + 1 })), settings: { 'music-flashcards:note-font': 'heros' } };
  await page.getByRole('button', { name: 'BACKUP', exact: true }).click();
  const upload = (value: unknown) => page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await upload(bad);
  await expect(page.getByRole('alert')).toHaveText('invalid backup study state');
  await expect(page.getByRole('button', { name: 'RESTORE', exact: true })).toHaveCount(0);
  expect(await snapshot()).toEqual(good);
  const oversized = {
    ...good,
    states: good.states.map(state => ({ ...state, updatedAt: state.updatedAt + 1 })),
    revlog: good.revlog.map(review => ({ ...review, eventId: 'quota-' + review.eventId })),
    settings: { 'music-flashcards:note-font': 'heros', 'music-flashcards:quota-test': 'x'.repeat(6 * 1024 * 1024) },
  };
  await upload(oversized);
  await page.getByRole('button', { name: 'RESTORE', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/quota/i);
  expect(await snapshot()).toEqual(good);
  const undoPath = '/src/lib/undo.ts';
  expect(await page.evaluate(async path => (await import(path)).undoStatus().undo, undoPath)).toBe('answerCard');
  // Abort after localStorage was written, to cover a failed database commit.
  const aborted = await page.evaluate(async backup => {
    const dbPath = '/src/lib/db.ts';
    const backupPath = '/src/lib/backup.ts';
    const { db } = await import(dbPath);
    const { restoreBackup } = await import(backupPath);
    const original = db.transaction;
    db.transaction = function (...args: unknown[]) {
      const body = args.pop() as (tx: { abort(): void }) => Promise<void>;
      return Reflect.apply(original, db, [...args, async (tx: { abort(): void }) => {
        await body(tx);
        tx.abort();
      }]);
    };
    try {
      await restoreBackup({ ...backup, settings: { 'music-flashcards:note-font': 'heros' } });
      return false;
    } catch {
      return true;
    } finally {
      db.transaction = original;
    }
  }, good);
  expect(aborted).toBe(true);
  expect(await snapshot()).toEqual(good);
  await upload(good);
  await page.getByRole('button', { name: 'RESTORE', exact: true }).click();
  await expect(page.getByRole('button', { name: 'RELOAD', exact: true })).toBeVisible();
  expect(await snapshot()).toEqual(good);
});
