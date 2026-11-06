// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from './fixtures';

for (const exit of ['Back', 'Escape', 'Cancel'] as const) {
  test(`restored preferences survive closing Backup with ${exit}`, async ({ page }) => {
    await page.goto('/');
    const row = page.locator('[data-deck="Diatonic Chords"]');
    await expect(row).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'BACKUP', exact: true }).click();
    const backup = { format: 'music-flashcards-backup', version: 1,
      exportedAt: new Date().toISOString(), states: [], revlog: [],
      settings: { 'music-flashcards:minor-degree-notation': 'i7' } };
    await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.getByRole('button', { name: 'RESTORE', exact: true }).click();
    await expect(page.getByRole('button', { name: 'RELOAD', exact: true })).toBeVisible();
    const reloaded = page.waitForEvent('load');
    if (exit === 'Back') await page.goBack();
    else if (exit === 'Escape') await page.keyboard.press('Escape');
    else await page.getByRole('button', { name: 'CANCEL', exact: true }).click();
    await reloaded;
    // Cancel reloads the current history entry, which can reopen Backup.
    const dialog = page.getByRole('dialog', { name: 'Backup', exact: true });
    if (await dialog.count()) await dialog.getByRole('button', { name: 'CANCEL', exact: true }).click();
    await openDeckSettings(row, 'Appearance');
    await expect(page.getByRole('radiogroup', { name: 'Minor degree', exact: true }).getByRole('radio', { name: 'i7', exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'APPLY', exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem('music-flashcards:minor-degree-notation'))).toBe('i7');
  });
}
