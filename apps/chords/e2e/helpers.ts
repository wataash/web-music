// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import type { Page } from '@playwright/test';

export const openLibrary = (page: Page) => page.getByRole('button', { name: 'Choose song', exact: true }).click();
export const closeLibrary = (page: Page) => page.getByRole('button', { name: 'Close song library' }).click();

// Pastes a shared link into the open library's import dialog.
export async function importLink(page: Page, link: string): Promise<void> {
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await page.getByRole('radio', { name: 'iReal Pro' }).check();
  await page.getByLabel('Shared link / HTML').fill(link);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

// Pastes a chart in ChordWiki notation into the open library's import dialog.
export async function importChordWiki(page: Page, chart: string): Promise<void> {
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await page.getByRole('radio', { name: 'ChordWiki' }).check();
  await page.getByLabel('ChordWiki text', { exact: true }).fill(chart);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}
