// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, type Page } from '@playwright/test';
import { openLibrary } from './helpers';

async function createChart(page: Page, text: string) {
  await page.goto('/');
  await openLibrary(page);
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await page.getByRole('radio', { name: 'Custom chart', exact: true }).check();
  await page.getByLabel('Chord progression').fill(text);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add chart', exact: true })).not.toBeVisible();
}

test('shortens the active chart without rendering an out-of-range position', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await createChart(page, 'title: Shorten\nC Dm Em F G Am Bdim C');
  await page.getByLabel('Chord number', { exact: true }).fill('8');
  await page.getByLabel('Chord number', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Edit current chart', exact: true }).click();
  await page.getByLabel('Chord progression').fill('title: Shorten\nC F');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit chart', exact: true })).not.toBeVisible();
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: 'Next chord', exact: true }).click();
  await expect(page.locator('.question-heading h2')).toHaveText('F');
  await page.reload();
  await expect(page.locator('.question-heading h2')).toHaveText('F');
  expect(errors).toEqual([]);
});

test('copies a title header along with the chart without renaming the original', async ({ page }) => {
  await createChart(page, 'title: Original\nC F G');
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Copy current chart', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add chart', exact: true })).not.toBeVisible();
  await expect(page.locator('.song-title')).toHaveText('Original (copy)');
  await page.reload();
  await expect(page.locator('.song-title')).toHaveText('Original (copy)');
  await openLibrary(page);
  await expect(page.getByRole('button', { name: 'Original ·', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Original (copy) ·', exact: true })).toBeVisible();
});

test('imports multiple ChordWiki files as separate persisted charts', async ({ page }) => {
  await page.goto('/');
  await openLibrary(page);
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await page.getByRole('radio', { name: 'ChordWiki', exact: true }).check();
  await page.getByLabel('ChordWiki text file').setInputFiles([
    { name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('{title:First}\n{key:C}\n[C]one [G]two') },
    { name: 'second.txt', mimeType: 'text/plain', buffer: Buffer.from('{title:Second}\n{key:F}\n[F]three [C]four') },
  ]);
  await expect(page.getByRole('dialog', { name: 'Add chart', exact: true })).not.toBeVisible();
  await expect(page.locator('.full-score .chord')).toHaveCount(2);
  await page.reload();
  await openLibrary(page);
  await expect(page.getByRole('heading', { name: 'All songs (5)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Second ·', exact: true }).click();
  await expect(page.getByLabel('Song key', { exact: true })).toHaveValue('F');
  await expect(page.locator('.full-score .chord')).toHaveCount(2);
});

test('keeps lyrics with the source chord during and after a repeated bar', async ({ page }) => {
  await createChart(page, '| C {first} | % | G {second} |');
  await page.getByRole('button', { name: 'Next chord', exact: true }).click();
  await expect(page.locator('.question-heading').getByLabel('Lyrics')).toHaveText('first');
  await page.getByRole('button', { name: 'Next chord', exact: true }).click();
  await expect(page.locator('.question-heading').getByLabel('Lyrics')).toHaveText('second');
});

test('starts with defaults when reading local storage is denied', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = function () { throw new DOMException('Storage is disabled', 'SecurityError'); };
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Choose song', exact: true })).toBeEnabled();
  await expect(page.locator('.question-heading h2')).toHaveText('C');
  expect(errors).toEqual([]);
});


for (const [name, source, title] of [
  ['missing', '{key:C}\n[C]one [G]two', 'Untitled'],
  ['uppercase', '{TITLE:Uppercase}\n{key:C}\n[C]one [G]two', 'Uppercase'],
  ['inline', '{key:C}{title:Inline}\n[C]one [G]two', 'Inline'],
]) test(`copies a ChordWiki chart with a ${name} title header`, async ({ page }) => {
  await page.goto('/');
  await openLibrary(page);
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await page.getByRole('radio', { name: 'ChordWiki', exact: true }).check();
  await page.getByLabel('ChordWiki text', { exact: true }).fill(source);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add chart', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Copy current chart', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add chart', exact: true })).not.toBeVisible();
  await expect(page.locator('.song-title')).toHaveText(title + ' (copy)');
  await page.reload();
  await expect(page.locator('.song-title')).toHaveText(title + ' (copy)');
  await openLibrary(page);
  await expect(page.getByRole('heading', { name: 'All songs (5)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: title + ' ·', exact: true }).click();
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Edit current chart', exact: true }).click();
  await expect(page.getByLabel('ChordWiki text', { exact: true })).toHaveValue(source);
});

for (const format of ['ChordWiki', 'Custom chart'] as const) {
  test(`keeps an edited ${format} copy when copying its original again`, async ({ page }) => {
    const wiki = format === 'ChordWiki';
    const source = wiki ? '{title:Original}\n{key:C}\n[C]first [G]second' : 'title: Original\nC G';
    const edited = wiki ? '{title:Edited copy}\n{key:C}\n[F]MY EDIT [G]second' : 'title: Edited copy\nF G';
    const input = () => page.getByLabel(wiki ? 'ChordWiki text' : 'Chord progression', { exact: true });
    const action = async (name: string) => {
      await page.getByRole('button', { name: 'Chord practice settings' }).click();
      await page.getByRole('button', { name, exact: true }).click();
    };
    const save = async (name: string) => {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('.chart-editor dialog')).not.toBeVisible();
    };
    await page.goto('/');
    await openLibrary(page);
    await page.getByRole('button', { name: 'Add chart', exact: true }).click();
    await page.getByRole('radio', { name: format, exact: true }).check();
    await input().fill(source);
    await save('Add');
    await action('Copy current chart');
    await save('Add');
    await action('Edit current chart');
    await input().fill(edited);
    await save('Save');
    await openLibrary(page);
    await page.getByRole('button', { name: 'Original ·', exact: true }).click();
    await action('Copy current chart');
    await save('Add');
    await page.reload();
    await openLibrary(page);
    await expect(page.getByRole('heading', { name: 'All songs (6)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Original (copy) ·', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Edited copy ·', exact: true }).click();
    await action('Edit current chart');
    await expect(input()).toHaveValue(edited);
    await page.getByRole('button', { name: 'Close chart editor' }).click();
    await openLibrary(page);
    await page.getByRole('button', { name: 'Original ·', exact: true }).click();
    await action('Edit current chart');
    await expect(input()).toHaveValue(source);
  });
}

test('starts an unseen chord at the beginning and restores a visited chord scroll', async ({ page }) => {
  await page.setViewportSize({ width: 411, height: 841 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Choose song', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Zoom', exact: true }).click();
  const board = page.locator('.board-scroll');
  await board.evaluate(async node => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    node.scrollLeft = 500;
    node.dispatchEvent(new Event('scroll'));
  });
  await expect.poll(() => board.evaluate(node => node.scrollLeft)).toBe(500);
  await page.getByRole('button', { name: 'Next chord', exact: true }).click();
  await expect(page.locator('.question-heading h2')).toHaveText('F');
  await expect.poll(() => board.evaluate(node => node.scrollLeft)).toBe(0);
  await page.getByRole('button', { name: 'Previous chord', exact: true }).click();
  await expect(page.locator('.question-heading h2')).toHaveText('C');
  await expect.poll(() => board.evaluate(node => node.scrollLeft)).toBe(500);
  await page.reload();
  await expect.poll(() => board.evaluate(node => node.scrollLeft)).toBe(500);
});

test('edits from one ChordWiki file, rejects multiple replacements and keeps favorites', async ({ page }) => {
  await page.goto('/');
  await openLibrary(page);
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await page.getByRole('radio', { name: 'ChordWiki', exact: true }).check();
  await page.getByLabel('ChordWiki text', { exact: true }).fill('{title:Original}\n[C]original');
  await expect(page.getByLabel('ChordWiki text file')).toHaveJSProperty('multiple', true);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.chart-editor dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Add to favorites', exact: true }).click();
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Edit current chart', exact: true }).click();
  const fileInput = page.getByLabel('ChordWiki text file');
  await expect(fileInput).toHaveJSProperty('multiple', false);
  // Exercise the data guard even if a browser supplies more than one file.
  await fileInput.evaluate(input => {
    const files = new DataTransfer();
    files.items.add(new File(['{title:First}\n[C]first'], 'first.txt', { type: 'text/plain' }));
    files.items.add(new File(['{title:Second}\n[F]second'], 'second.txt', { type: 'text/plain' }));
    (input as HTMLInputElement).files = files.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByRole('alert')).toHaveText('Choose one file when editing a chart.');
  await expect(page.getByLabel('ChordWiki text', { exact: true })).toHaveValue('{title:Original}\n[C]original');
  await expect(page.locator('.song-title')).toHaveText('Original');
  await fileInput.setInputFiles({ name: 'replacement.txt', mimeType: 'text/plain', buffer: Buffer.from('{title:Replacement}\n[F]replacement') });
  await expect(page.locator('.chart-editor dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.locator('.song-title')).toHaveText('Replacement');
  await expect(page.getByRole('button', { name: 'Remove from favorites', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await openLibrary(page);
  await expect(page.getByRole('heading', { name: 'All songs (4)', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Original ·', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await expect(fileInput).toHaveJSProperty('multiple', true);
});
