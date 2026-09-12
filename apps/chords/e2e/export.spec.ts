// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { scramble, extractIrealPlaylist } from '@web-music/ireal';
import { readFileSync } from 'node:fs';

test('downloads original-key charts and imports the playlist on another browser context', async ({ page, browser }) => {
  const song = (name: string, raw: string) => `${name}=Writer==Swing=C-==1r34LbKcu7${scramble(raw)}==120=2`;
  const link = 'irealb://' + encodeURIComponent(song('First Example', '*A[C-7XyQ|xXyQZ') + '===' + song('Second Example', '[G7XyQZ') + '===Export Examples');
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await page.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
  await page.getByLabel('Shared link / HTML').fill(link);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.locator('.song-title')).toHaveText('First Example');
  await page.getByRole('button', { name: 'Close song library' }).click();
  await page.getByLabel('Song key', { exact: true }).selectOption('D');
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  for (const scope of ['song', 'playlist']) {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('dialog', { name: 'Export iReal charts' }).getByRole('button', { name: new RegExp('^Export ' + scope + ':') }).click();
    const download = await downloadPromise;
    const path = (await download.path())!;
    const decoded = extractIrealPlaylist(readFileSync(path, 'utf8'));
    expect(decoded.errors).toEqual([]);
    expect(decoded.songs).toEqual(extractIrealPlaylist(link).songs.slice(0, scope === 'song' ? 1 : 2));
    expect(download.suggestedFilename()).toMatch(/\.html$/);
    if (scope === 'playlist') {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
      const other = await context.newPage();
      await other.goto('http://localhost:17382');
      await other.getByRole('button', { name: 'Choose song', exact: true }).click();
      await other.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
      await other.getByLabel('HTML file', { exact: true }).setInputFiles(path);
      await expect(other.getByRole('status').filter({ hasText: 'Imported 2 songs' })).toBeVisible();
      await expect(other.locator('.song-title')).toHaveText('First Example');
      await context.close();
    }
  }
});
