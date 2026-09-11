// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';
import { extractIrealPlaylist, scramble } from '@web-music/ireal';

import { readFileSync } from 'node:fs';

const localSong = process.env.IREAL_LAYOUT_PATH ? extractIrealPlaylist(readFileSync(process.env.IREAL_LAYOUT_PATH, 'utf8')).songs.find(song => song.title === process.env.IREAL_LAYOUT_SONG) : undefined;
if (process.env.IREAL_LAYOUT_PATH && !localSong) throw new Error('The requested local layout fixture was not found');
const raw = localSong?.score.blocks.flat().map(token => token.raw).join('') ?? '*A[T44' + 'F-7XyQ|Bb7susXyQ|Eb^7XyQ|Db7 C7LZ'.repeat(2) + '*B[' + 'Ab^7XyQ|G-7XyQ|Db7XyQ|C-7 sEb7,E7|'.repeat(2) + 'lF7XyQZ ';
const link = 'irealb://' + encodeURIComponent('Layout Example=Original Example==Rock Pop=Eb==1r34LbKcu7' + scramble(raw) + '==0=0');

test('preserves four-bar rows at desktop and phone widths', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByText('Import iReal Pro charts', { exact: true }).click();
  await page.getByLabel('Shared link / HTML').fill(link);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 song' })).toBeVisible();
  await page.getByText('Full chart and song information', { exact: true }).click();
  if (!localSong) {
    await expect(page.locator('.score-heading h3')).toHaveText('Layout Example');
    await expect(page.locator('.score-heading')).toContainText('Original Example');
    await expect(page.locator('.full-score .meter span')).toHaveText(['4', '4']);
  }
  const sheet = page.locator('.full-score .ireal-sheet');
  const context = page.locator('.chord-source .ireal-sheet').first();
  const labels = (chords: ReturnType<typeof page.locator>) => chords.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
  for (const width of [1259, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(sheet.locator('.ireal-row')).toHaveCount(5);
    await expect(context.locator('.ireal-row')).toHaveCount(1);
    await expect.poll(() => labels(context.locator('.chord'))).toEqual(await labels(sheet.locator('.ireal-row').first().locator('.chord')));
    await expect(sheet.locator('.ireal-row').nth(2).locator('.section')).toHaveText('B');
    const dimensions = await sheet.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 2);
    await expect.poll(() => sheet.evaluate(element => {
      for (const row of element.querySelectorAll('.ireal-row')) {
        const items = [...row.querySelectorAll<HTMLElement>('.item:not(.alternate)')];
        for (const item of items) {
          const chord = item.querySelector('.chord');
          if (!chord) continue;
          const start = item.getBoundingClientRect().left;
          const end = items.map(next => next.getBoundingClientRect().left).filter(left => left > start + 1).sort((a, b) => a - b)[0] ?? row.getBoundingClientRect().right;
          if (chord.getBoundingClientRect().right > end + 1) return false;
        }
      }
      return true;
    })).toBe(true);
    await page.locator('.full-score').screenshot({ path: testInfo.outputPath(`score-${width}.png`) });
    await context.screenshot({ path: testInfo.outputPath(`context-${width}.png`) });
  }
  const thirdRowIndex = await sheet.locator('.ireal-row').nth(0).locator('.chord').count() + await sheet.locator('.ireal-row').nth(1).locator('.chord').count();
  for (const [number, row] of [[2, 0], [thirdRowIndex + 1, 2]]) {
    await page.getByLabel('Chord number', { exact: true }).fill(String(number));
    await page.getByLabel('Chord number', { exact: true }).press('Tab');
    await expect(context.locator('.ireal-row')).toHaveCount(1);
    await expect.poll(() => labels(context.locator('.chord'))).toEqual(await labels(sheet.locator('.ireal-row').nth(row).locator('.chord')));
    await expect(context.locator('.selected')).toHaveCount(1);
  }
  await expect(context.locator('.section')).toHaveText('B');
});
