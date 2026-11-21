// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { extractIrealPlaylist } from '@web-music/ireal';
import { closeLibrary, importLink, openLibrary } from './helpers';

test('exports each playlist in its imported order and uses the chosen playlist for a single song', async ({ page }) => {
  const link = (titles: string[], name: string) => 'irealb://' + encodeURIComponent(
    [...titles.map(title => title + '=Example==Swing=C==1r34LbKcu7C7Z'), name].join('==='));
  const morning = ['First', 'Second', 'Third'];
  const evening = ['First', 'Third', 'Second', 'First'];
  await page.goto('/');
  await openLibrary(page);
  await importLink(page, [link(morning, 'Morning'), link(evening, 'Evening')].join('\n'));
  await expect(page.getByRole('status').filter({ hasText: 'Added 3 songs' })).toBeVisible();
  await importLink(page, link(["First"], "Evening"));
  await expect(page.getByRole("status").filter({ hasText: "Added 1 song" })).toBeVisible();
  await closeLibrary(page);
  await page.reload();
  await openLibrary(page);
  await page.getByLabel('Playlist', { exact: true }).selectOption('playlist:Evening');
  await closeLibrary(page);
  async function openExport() {
    await page.getByRole('button', { name: 'Chord practice settings' }).click();
    await page.getByRole('button', { name: 'Export current chart', exact: true }).click();
  }
  async function checkDownload(button: string, playlist: string, titles: string[]) {
    await openExport();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: button, exact: true }).click();
    const parsed = extractIrealPlaylist(await readFile((await (await pending).path())!, 'utf8'));
    expect(parsed.name).toBe(playlist);
    expect(parsed.songs.map(song => song.title)).toEqual(titles);
  }
  await checkDownload('Export song: First', 'Evening', ['First']);
  await checkDownload('Export playlist: Morning (3)', 'Morning', morning);
  await checkDownload('Export playlist: Evening (4)', 'Evening', evening);
  for (let attempt = 0; attempt < 2; attempt++) {
    await openLibrary(page);
    await importLink(page, link(['Fourth', 'Fifth', 'First'], 'Evening'));
    await expect(page.getByRole('status').filter({ hasText: 'Added 3 songs' })).toBeVisible();
    await closeLibrary(page);
    await page.reload();
    await checkDownload('Export playlist: Evening (6)', 'Evening', ['Fourth', 'Third', 'Second', 'First', 'Fifth', 'First']);
  }
});
