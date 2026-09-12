// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from '@playwright/test';
test('navigates, saves the position and resets in single and list modes', async ({ page }) => {
  await page.goto('/');
  const number = page.getByLabel('Chord number', { exact: true });
  await expect(number).toHaveValue('1');
  await page.getByRole('button', { name: 'Next screen', exact: true }).click();
  await expect(number).toHaveValue('2');
  await page.reload();
  await expect(number).toHaveValue('2');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Chord list', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Reset settings and position', exact: true }).click();
  await expect(number).toHaveValue('1');
});
