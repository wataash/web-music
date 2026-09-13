// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { importLink, openLibrary } from './helpers';

test('imports valid links alongside malformed ones and reports total failure separately', async ({ page }) => {
  await page.goto('/');
  await openLibrary(page);
  const good = 'irealb://' + encodeURIComponent('Import Example=Example==Swing=C==1r34LbKcu7C|G7==0=0');
  await importLink(page, 'irealb://%ZZ\n' + good + '\nirealbook://%');
  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 song. 2 items could not be imported.' })).toBeVisible();
  const picker = page.getByLabel('Song', { exact: true });
  await expect(picker.locator('button[aria-pressed="true"]')).toHaveAccessibleName('Import Example · Example');
  const selected = await picker.getAttribute('data-selected');
  // The dialog stays open, so the next attempt reuses it.
  await page.getByLabel('Shared link / HTML').fill('irealb://%ZZ');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Import failed.' })).toBeVisible();
  await expect(picker).toHaveAttribute('data-selected', selected);
});
