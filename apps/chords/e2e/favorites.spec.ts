// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test('favorites built-in and imported songs, persists and filters them', async ({ page }) => {
  await page.goto('/');
  const picker = page.getByLabel('Song', { exact: true });
  const favorite = page.getByRole('button', { name: 'Add to favorites', exact: true });
  const unfavorite = page.getByRole('button', { name: 'Remove from favorites', exact: true });
  const filter = page.getByRole('button', { name: /^Favorites only/ });
  await favorite.click();
  const firstId = await picker.inputValue();
  await expect(unfavorite).toHaveAttribute('aria-pressed', 'true');
  await page.getByText('Import iReal Pro charts', { exact: true }).click();
  await page.getByLabel('Shared link / HTML').fill('irealb://' + encodeURIComponent('Favorite Example=Example==Swing=C==1r34LbKcu7C|G7==0=0'));
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 song' })).toBeVisible();
  const importedId = await picker.inputValue();
  await favorite.click();
  await filter.click();
  await expect(picker.locator('option:not(:disabled)')).toHaveCount(2);
  await page.getByLabel('Search songs', { exact: true }).fill('Favorite Example');
  await expect(picker.locator('option:not(:disabled)')).toHaveCount(1);
  await page.reload();
  await expect(picker).toHaveValue(importedId);
  await expect(unfavorite).toHaveAttribute('aria-pressed', 'true');
  await expect(filter).toHaveText('Favorites only (2)');
  await page.getByRole('button', { name: 'Reset settings and position', exact: true }).click();
  await expect(filter).toHaveText('Favorites only (2)');
  await filter.click();
  await picker.selectOption(importedId);
  await unfavorite.click();
  await expect(picker).toHaveValue(firstId);
  await expect(picker.locator('option:not(:disabled)')).toHaveCount(1);
  await unfavorite.click();
  await expect(page.getByRole('status').filter({ hasText: 'No favorites yet' })).toBeVisible();
  await expect(picker.locator('option:not(:disabled)')).toHaveCount(0);
  await filter.click();
  await expect(picker.locator(`option[value="${importedId}"]`)).toHaveCount(1);
});
