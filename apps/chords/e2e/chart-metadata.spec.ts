// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openLibrary } from './helpers';
async function newChart(page: Page) {
  await page.goto('/');
  await openLibrary(page);
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await page.getByRole('radio', { name: 'Custom chart', exact: true }).check();
}
async function save(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.locator('.chart-editor dialog')).not.toBeVisible();
}
async function action(page: Page, name: string) {
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name, exact: true }).click();
}

test('keeps title and original key fields in sync with headers without rewriting modulations', async ({ page }) => {
  await newChart(page);
  await page.getByLabel('Chord progression').fill('title: Original\nkey: C\nC G\nkey: D\nD A');
  await expect(page.getByLabel('Title (optional)')).toHaveValue('Original');
  await expect(page.getByLabel('Original key', { exact: true })).toHaveValue('C');
  await save(page, 'Add');
  await action(page, 'Edit current chart');
  await page.getByLabel('Title (optional)').fill('Renamed');
  await page.getByLabel('Original key', { exact: true }).selectOption('F');
  await expect(page.getByLabel('Chord progression')).toHaveValue('title: Renamed\nkey: F\nC G\nkey: D\nD A');
  await expect(page.getByLabel('Chart preview')).toContainText('Renamed · Key F');
  await save(page, 'Save');
  await page.reload();
  await expect(page.locator('.song-title')).toHaveText('Renamed');
  await expect(page.getByLabel('Song key', { exact: true })).toHaveValue('F');
  await action(page, 'Edit current chart');
  await page.getByLabel('Chord progression').fill('title: Typed\nkey: Bb\nBb {unfinished');
  await expect(page.getByLabel('Title (optional)')).toHaveValue('Typed');
  await expect(page.getByLabel('Original key', { exact: true })).toHaveValue('Bb');
  await page.getByLabel('Chord progression').fill('title: Typed\nkey: Bb\nBb F');
  await save(page, 'Save');
  await page.reload();
  await expect(page.locator('.song-title')).toHaveText('Typed');
  await expect(page.getByLabel('Song key', { exact: true })).toHaveValue('Bb');
});

test('restores a text export in a fresh browser without entering title or key again', async ({ page, browser }) => {
  await newChart(page);
  await page.getByLabel('Chord progression').fill('F Bb C7');
  await page.getByLabel('Title (optional)').fill('My practice');
  await page.getByLabel('Original key', { exact: true }).selectOption('F');
  await save(page, 'Add');
  await action(page, 'Export current chart');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download chord text', exact: true }).click();
  const download = await pending;
  const exported = readFileSync((await download.path())!, 'utf8');
  expect(download.suggestedFilename()).toBe('My practice.txt');
  const context = await browser.newContext();
  const restored = await context.newPage();
  await newChart(restored);
  await restored.getByLabel('Chord progression').fill(exported);
  await expect(restored.getByLabel('Title (optional)')).toHaveValue('My practice');
  await expect(restored.getByLabel('Original key', { exact: true })).toHaveValue('F');
  await save(restored, 'Add');
  await restored.reload();
  await expect(restored.locator('.song-title')).toHaveText('My practice');
  await expect(restored.getByLabel('Song key', { exact: true })).toHaveValue('F');
  await expect(restored.locator('.full-score .chord')).toHaveCount(3);
  await context.close();
});
