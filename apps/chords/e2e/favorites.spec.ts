// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { closeLibrary, importLink, openLibrary } from './helpers';

test('favorites built-in and imported songs, lists them first and persists them', async ({ page }) => {
  await page.goto('/');
  await openLibrary(page);
  const picker = page.getByLabel('Song', { exact: true });
  const favorite = page.getByRole('button', { name: 'Add to favorites', exact: true });
  const unfavorite = page.getByRole('button', { name: 'Remove from favorites', exact: true });
  const results = picker.locator('button:not(:disabled)');
  const favoritesHeading = picker.getByRole('heading', { name: /^★ Favorites/ });
  await closeLibrary(page);
  await favorite.click();
  await openLibrary(page);

  const firstId = await picker.getAttribute('data-selected');
  await expect(unfavorite).toHaveAttribute('aria-pressed', 'true');
  await expect(favoritesHeading).toHaveText('★ Favorites (1)');
  await importLink(page, 'irealb://' + encodeURIComponent('Favorite Example=Example==Swing=C==1r34LbKcu7C|G7==0=0'));
  await expect(page.getByRole('status').filter({ hasText: 'Added 1 song' })).toBeVisible();
  const importedId = await picker.getAttribute('data-selected');
  await closeLibrary(page);
  await favorite.click();
  await openLibrary(page);
  // Two favorites first, then every song, so a favorite is listed twice.
  await expect(favoritesHeading).toHaveText('★ Favorites (2)');
  await expect(picker.getByRole('heading', { name: 'All songs (4)' })).toBeVisible();
  await expect(results).toHaveCount(6);
  await expect(picker.locator('.row-star')).toHaveCount(4);
  await page.getByLabel('Search songs', { exact: true }).fill('Favorite Example');
  await expect(results).toHaveCount(2);
  await page.reload();
  await openLibrary(page);
  await expect(picker).toHaveAttribute('data-selected', importedId);
  await expect(unfavorite).toHaveAttribute('aria-pressed', 'true');
  await expect(favoritesHeading).toHaveText('★ Favorites (2)');
  await closeLibrary(page);
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Reset settings and position', exact: true }).click();
  await openLibrary(page);

  await expect(favoritesHeading).toHaveText('★ Favorites (2)');
  await picker.locator(`button[value="${importedId}"]`).first().click();
  await unfavorite.click();
  await expect(picker).toHaveAttribute('data-selected', importedId);
  await openLibrary(page);
  await expect(favoritesHeading).toHaveText('★ Favorites (1)');
  await picker.locator(`button[value="${firstId}"]`).first().click();
  await unfavorite.click();
  await openLibrary(page);
  await expect(favoritesHeading).toHaveCount(0);
  await expect(picker.locator('.row-star')).toHaveCount(0);
  await expect(results).toHaveCount(4);
});
