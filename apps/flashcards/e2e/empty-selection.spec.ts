// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from './fixtures';

for (const deck of ['II–V–I Progressions', 'Diatonic Chords']) {
  test(`${deck} stays configurable with no selected keys`, async ({ page }) => {
    await page.goto('/');
    const row = page.locator(`[data-deck="${deck}"]`);
    await expect(row).toBeVisible({ timeout: 30000 });
    await openDeckSettings(row);
    for (const button of await page.getByRole('button', { name: 'Clear', exact: true }).all()) await button.click();
    await page.getByRole('button', { name: 'APPLY', exact: true }).click();
    await expect(row).toBeVisible();
    await page.reload();
    await expect(row).toBeVisible();
    await page.getByRole('button', { name: 'CHOOSE DECKS', exact: true }).click();
    await expect(page.getByRole('dialog').getByLabel(deck, { exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'CANCEL', exact: true }).click();
    await openDeckSettings(row);
    await expect(page.getByRole('button', { name: 'C major', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'C major', exact: true }).click();
    await page.getByRole('button', { name: 'APPLY', exact: true }).click();
    await row.locator('.deck-study').click();
    await expect(page.frameLocator('iframe[title="card"]').locator('.diatonic-card')).toBeVisible();
  });
}
