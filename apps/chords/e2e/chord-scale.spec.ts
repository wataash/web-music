// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test('lays a scale over a chord, keeps it through keys, views and reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Chord number').fill('3');
  await page.getByLabel('Chord number').press('Enter');
  const scale = page.getByLabel('Scale', { exact: true });
  await expect(scale).toHaveValue('');
  await expect(scale.locator('optgroup[label="Suggested for G7"] option').first()).toHaveText(/^Mixolydian/);
  await scale.selectOption('altered');
  const scaleMarkers = page.locator('[data-marker].scale');
  await expect(scaleMarkers.first()).toBeVisible();
  await expect(page.locator('[data-marker].scale[data-interval="b9"]').first()).toBeVisible();
  await expect(page.locator('[data-marker].tone[data-interval="M3"]').first()).toBeVisible();
  // The fifth is not in the altered scale, so the board drops it.
  await expect(page.locator('[data-marker][data-interval="P5"]')).toHaveCount(0);
  await expect(page.locator('.tones .omitted dt')).toHaveText('P5');
  const badges = page.locator('.tones .scale-tone');
  await expect(badges).toHaveText(['b9 Ab', '#9 A#', '#11 C#', 'b13 Eb']);

  // The choice follows the chord into another key.
  await page.getByLabel('Song key', { exact: true }).selectOption('D');
  await expect(scale).toHaveValue('altered');
  await expect(badges).toHaveText(['b9 Bb', '#9 B#', '#11 D#', 'b13 F']);

  // Other chords are untouched, and the list shows the same choice.
  await page.getByLabel('Chord number').fill('2');
  await page.getByLabel('Chord number').press('Enter');
  await expect(scale).toHaveValue('');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  const cards = page.locator('.chord-list li');
  await expect(cards.nth(2).getByLabel('Scale', { exact: true })).toHaveValue('altered');
  await expect(cards.nth(1).getByLabel('Scale', { exact: true })).toHaveValue('');
  await cards.nth(1).getByLabel('Scale', { exact: true }).selectOption('lydian');
  await expect(cards.nth(1).locator('.tones .scale-tone')).toHaveCount(4);

  await page.reload();
  await expect(cards.nth(2).getByLabel('Scale', { exact: true })).toHaveValue('altered');
  await expect(cards.nth(1).getByLabel('Scale', { exact: true })).toHaveValue('lydian');
  await cards.nth(2).getByLabel('Scale', { exact: true }).selectOption('');
  await expect(cards.nth(2).locator('[data-marker].scale')).toHaveCount(0);
});
