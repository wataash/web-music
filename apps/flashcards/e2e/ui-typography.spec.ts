// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from './fixtures';

for (const width of [320, 411]) {
  test(`keeps small UI text readable at ${width}px`, async ({ page, shot }) => {
    await page.setViewportSize({ width, height: 841 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      if (window === window.top) localStorage.setItem('music-flashcards:hidden-decks', '[]');
    });
    await page.goto('/');
    await expect(page.locator('[data-deck="Guitar Fretboard"]')).toBeVisible({ timeout: 30000 });
    await page.locator('[data-deck="II–V–I Progressions"] .deck-study').click({ position: { x: 20, y: 20 } });
    await page.getByRole('button', { name: 'Deck actions', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'What to ask', exact: true })).toHaveCSS('font-size', '16px');
    await page.getByRole('menuitem', { name: 'What to ask', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'What to ask', exact: true });
    await expect(dialog.locator('.default-label')).toHaveCount(0);
    await expect(dialog.locator('.setting-label').first()).toHaveCSS('font-size', '16px');
    const major = dialog.getByRole('radiogroup', { name:'Major seventh', exact:true });
    const item = dialog.locator('.notation-item').filter({has:page.getByRole('radiogroup',{name:'Major seventh',exact:true})});
    const reset = item.getByRole('button', {name:'Reset Major seventh to default',exact:true});
    await expect(reset).toHaveCount(0);
    await major.getByRole('radio', {name:'maj7',exact:true}).check();
    await expect(item.locator('.setting-change')).toHaveClass(/modified/);
    await expect(reset).toBeVisible();
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await shot('readable-notation-changes');
    await reset.click();
    await expect(major.getByRole('radio', {name:'Δ7',exact:true})).toBeChecked();
    await expect(item.locator('.setting-change')).not.toHaveClass(/modified/);
    await expect(reset).toHaveCount(0);
    // Rem-based UI text follows a larger browser base size as well.
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    await expect(dialog.locator('.setting-label').first()).toHaveCSS('font-size', '20px');
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
}

test('keeps the guitar question map readable on a narrow phone', async ({ page, shot }) => {
  await page.setViewportSize({ width: 320, height: 841 });
  await page.goto('/');
  const row = page.locator('[data-deck="Guitar Intervals"]');
  await expect(row).toBeVisible({ timeout: 30000 });
  await openDeckSettings(row);
  const dialog = page.getByRole('dialog', { name: 'What to ask', exact: true });
  const map = dialog.getByRole('region', { name: 'Question map' });
  await expect(map.getByRole('table')).toHaveCount(6);
  await expect(map.locator('.cell').first()).toHaveCSS('font-size', '14px');
  await map.locator('.board').first().scrollIntoViewIfNeeded();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await map.locator('.cell').evaluateAll(cells => cells.every(el => el.scrollWidth <= el.clientWidth))).toBe(true);
  const scroll = map.locator('.table-scroll').first();
  expect(await scroll.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  expect(await scroll.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await shot('readable-guitar-question-map');
});
