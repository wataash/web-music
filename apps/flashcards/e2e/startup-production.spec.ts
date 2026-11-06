// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from './fixtures';

// Run against a built Vite preview: set FLASHCARDS_PRODUCTION_URL to its URL.
// The development server does not execute the bundled-deck update path.
test.use({ baseURL: process.env.FLASHCARDS_PRODUCTION_URL, serviceWorkers: 'block' });
test('cached decks remain studiable while the update manifest is pending', async ({ page }) => {
  test.skip(!process.env.FLASHCARDS_PRODUCTION_URL, 'Requires a production build served by Vite preview');
  await page.goto('/');
  const row = page.locator('[data-deck="II–V–I Progressions"]');
  await expect(row).toBeVisible({ timeout: 60000 });
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/decks/manifest.json', async route => {
    await pending;
    await route.continue();
  });
  const request = page.waitForRequest('**/decks/manifest.json');
  try {
    await page.reload();
    await request;
    await expect(row).toBeVisible();
    await row.locator('.deck-study').click();
    await expect(page.frameLocator('iframe[title="card"]').locator('.diatonic-card')).toBeVisible();
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
