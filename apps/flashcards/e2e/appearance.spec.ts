// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from './fixtures';

test.use({ viewport: { width: 411, height: 841 } });

test('Appearance previews notation without changing the study card until Apply', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('[data-deck="Diatonic Chords"]');
  await expect(row).toBeVisible({ timeout: 30000 });
  await row.locator('.deck-study').click();
  const card = page.frameLocator('iframe[title="card"]');
  await expect(card.locator('.diatonic-degree')).toHaveText('IΔ7');
  await page.getByRole('button', { name: 'Deck actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Appearance', exact: true });
  const preview = page.frameLocator('iframe[title="Appearance preview"]');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.matches(':modal'))).toBe(true);
  await dialog.getByRole('radiogroup', { name: 'Major seventh', exact: true }).getByRole('radio', { name: 'maj7', exact: true }).check();
  await expect(preview.locator('.diatonic-degree')).toHaveText('Imaj7');
  await expect(card.locator('.diatonic-degree')).toHaveText('IΔ7');
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(preview.locator('.diatonic-answer')).toHaveText('Cmaj7');
  const answer = await preview.locator('.diatonic-answer').boundingBox();
  const bounds = await page.locator('iframe[title="Appearance preview"]').boundingBox();
  expect(answer!.y + answer!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(card.locator('.diatonic-degree')).toHaveText('IΔ7');
  await page.getByRole('button', { name: 'Deck actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  await dialog.getByRole('radiogroup', { name: 'Major seventh', exact: true }).getByRole('radio', { name: 'maj7', exact: true }).check();
  await dialog.getByRole('button', { name: 'APPLY', exact: true }).click();
  await expect(card.locator('.diatonic-degree')).toHaveText('Imaj7');
  await expect(card.locator('.diatonic-answer')).toBeHidden();
  await page.getByRole('button', { name: 'Deck actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'What to ask', exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Major seventh', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Relative-major degree', { exact: true })).toHaveCount(0);
  await expect(page.locator('.wheel')).toHaveCount(2);
});

test('deck-list Appearance previews and resets fonts, cancels on Escape, and never records study progress', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('[data-deck="Music Staff::Staff → Note::Treble Clef"]');
  await expect(row).toBeVisible({ timeout: 30000 });
  await openDeckSettings(row, 'Appearance');
  const dialog = page.getByRole('dialog', { name: 'Appearance', exact: true });
  const frame = page.frameLocator('iframe[title="Appearance preview"]');
  await expect(frame.locator('#card-style')).toHaveCount(1);
  const initial = await frame.locator('#card-style').textContent();
  await dialog.getByLabel('Note font', { exact: true }).selectOption('roboto');
  await expect.poll(() => frame.locator('#card-style').textContent()).not.toBe(initial);
  expect(await page.evaluate(() => localStorage.getItem('music-flashcards:note-font'))).toBeNull();
  await dialog.getByRole('button', { name: 'Reset Note font to default', exact: true }).click();
  await expect(dialog.getByLabel('Note font', { exact: true })).toHaveValue('termes');
  await dialog.getByLabel('Note font', { exact: true }).selectOption('heros');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await openDeckSettings(row, 'Appearance');
  await expect(dialog.getByLabel('Note font', { exact: true })).toHaveValue('termes');
  await dialog.getByLabel('Note font', { exact: true }).selectOption('heros');
  await dialog.getByRole('button', { name: 'APPLY', exact: true }).click();
  await page.reload();
  await openDeckSettings(row, 'Appearance');
  await expect(dialog.getByLabel('Note font', { exact: true })).toHaveValue('heros');
  expect(await page.evaluate(async () => { const path = '/src/lib/db.ts'; const { db } = await import(path); return [await db.states.count(), await db.revlog.count()]; })).toEqual([0, 0]);
});
