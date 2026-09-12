// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test('imports valid links alongside malformed ones and reports total failure separately', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await page.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
  const input = page.getByLabel('Shared link / HTML');
  const button = page.getByRole('button', { name: 'Import', exact: true });
  const good = 'irealb://' + encodeURIComponent('Import Example=Example==Swing=C==1r34LbKcu7C|G7==0=0');
  await input.fill('irealb://%ZZ\n' + good + '\nirealbook://%');
  await button.click();
  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 song. 2 items could not be imported.' })).toBeVisible();
  const picker = page.getByLabel('Song', { exact: true });
  await expect(picker.locator('button[aria-pressed="true"]')).toHaveAccessibleName('Import Example · Example');
  const selected = await picker.getAttribute('data-selected');
  await input.fill('irealb://%ZZ');
  await button.click();
  await expect(page.getByRole('status').filter({ hasText: 'Import failed.' })).toBeVisible();
  await expect(picker).toHaveAttribute('data-selected', selected);
});
