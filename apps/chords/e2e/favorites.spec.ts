// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test('favorites built-in and imported songs, persists and filters them', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  const picker = page.getByLabel('Song', { exact: true });
  const favorite = page.getByRole('button', { name: 'Add to favorites', exact: true });
  const unfavorite = page.getByRole('button', { name: 'Remove from favorites', exact: true });
  const filter = page.getByRole('button', { name: /^Favorites only/ });
  await page.getByRole('button', { name: 'Close song library' }).click();
  await favorite.click();
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();

  const firstId = await picker.getAttribute('data-selected');
  await expect(unfavorite).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
  await page.getByLabel('Shared link / HTML').fill('irealb://' + encodeURIComponent('Favorite Example=Example==Swing=C==1r34LbKcu7C|G7==0=0'));
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 song' })).toBeVisible();
  const importedId = await picker.getAttribute('data-selected');
  await page.getByRole('button', { name: 'Close song library' }).click();
  await favorite.click();
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await filter.click();
  await expect(picker.locator('button:not(:disabled)')).toHaveCount(2);
  await page.getByLabel('Search songs', { exact: true }).fill('Favorite Example');
  await expect(picker.locator('button:not(:disabled)')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await expect(picker).toHaveAttribute('data-selected', importedId);
  await expect(unfavorite).toHaveAttribute('aria-pressed', 'true');
  await expect(filter).toHaveText('Favorites only (2)');
  await page.getByRole('button', { name: 'Close song library' }).click();
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Reset settings and position', exact: true }).click();
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();

  await expect(filter).toHaveText('Favorites only (2)');
  await filter.click();
  await picker.locator(`button[value="${importedId}"]`).click();
  await unfavorite.click();
  await expect(picker).toHaveAttribute('data-selected', firstId);
  await expect(picker.locator('button:not(:disabled)')).toHaveCount(1);
  await unfavorite.click();
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'No favorites yet' })).toBeVisible();
  await expect(picker.locator('button:not(:disabled)')).toHaveCount(0);
  await filter.click();
  await expect(picker.locator(`button[value="${importedId}"]`)).toHaveCount(1);
});
