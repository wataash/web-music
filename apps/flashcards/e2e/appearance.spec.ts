// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from './fixtures';

test.use({ viewport: { width: 411, height: 841 } });

test('Appearance previews notation without changing the study card until Apply', async ({ page }) => {
  await page.goto('/');
  const row = page.locator('[data-deck="Diatonic Chords"]');
  await expect(row).toBeVisible({ timeout: 30000 });
  await row.locator('.deck-study').click();
  const card = page.frameLocator('iframe[title="card"]');
  await expect(card.locator('.diatonic-degree')).toHaveText('IΔ7');
  await page.getByRole('button', { name: 'Deck actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Appearance', exact: true });
  const preview = page.frameLocator('iframe[title="Appearance preview"]');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.matches(':modal'))).toBe(true);
  await dialog.getByRole('radiogroup', { name: 'Major seventh', exact: true }).getByRole('radio', { name: 'maj7', exact: true }).check();
  await expect(preview.locator('.diatonic-degree')).toHaveText('Imaj7');
  await expect(card.locator('.diatonic-degree')).toHaveText('IΔ7');
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(preview.locator('.diatonic-answer')).toHaveText('Cmaj7');
  const answer = await preview.locator('.diatonic-answer').boundingBox();
  const bounds = await page.locator('iframe[title="Appearance preview"]').boundingBox();
  expect(answer!.y + answer!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(card.locator('.diatonic-degree')).toHaveText('IΔ7');
  await page.getByRole('button', { name: 'Deck actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
  await dialog.getByRole('radiogroup', { name: 'Major seventh', exact: true }).getByRole('radio', { name: 'maj7', exact: true }).check();
  await dialog.getByRole('button', { name: 'APPLY', exact: true }).click();
  await expect(card.locator('.diatonic-degree')).toHaveText('Imaj7');
  await expect(card.locator('.diatonic-answer')).toBeHidden();
  await page.getByRole('button', { name: 'Deck actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'What to ask', exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Major seventh', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Relative-major degree', { exact: true })).toHaveCount(0);
  await expect(page.locator('.wheel')).toHaveCount(2);
});

for (const [deck, defaultHint] of [['Diatonic Chords', false], ['II–V–I Progressions', true]] as const) {
  for (const entry of ['list', 'study']) {
    test(`restores ${deck} appearance drafts after reload from ${entry}`, async ({ page }) => {
      await page.goto('/');
      const row = page.locator(`[data-deck="${deck}"]`);
      await expect(row).toBeVisible({ timeout: 30000 });
      if (entry === 'study') await row.locator('.deck-study').click();
      const open = async () => {
        if (entry === 'list') await openDeckSettings(row, 'Appearance');
        else {
          await page.getByRole('button', { name: 'Deck actions', exact: true }).click();
          await page.getByRole('menuitem', { name: 'Appearance', exact: true }).click();
        }
      };
      const toggle = page.getByLabel('Relative-major degree', { exact: true });
      await open();
      await toggle.setChecked(!defaultHint);
      await page.getByRole('button', { name: 'APPLY', exact: true }).click();
      await open();
      await page.reload();
      await expect(toggle).toBeChecked({ checked: !defaultHint });
      await page.getByRole('button', { name: 'APPLY', exact: true }).click();
      await open();
      await expect(toggle).toBeChecked({ checked: !defaultHint });
      // A new draft must not start tracking later updates or bypass Cancel.
      await toggle.setChecked(defaultHint);
      await page.getByRole('button', { name: 'CANCEL', exact: true }).click();
      await open();
      await expect(toggle).toBeChecked({ checked: !defaultHint });
    });
  }
}

for (const [deck, width, height, content] of [
  ['II–V–I Progressions', 841, 411, '.diatonic-answer'],
] as const) {
  test(`can scroll the entire ${deck} preview at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const row = page.locator(`[data-deck="${deck}"]`);
    await expect(row).toBeVisible({ timeout: 30000 });
    await openDeckSettings(row, 'Appearance');
    const dialog = page.getByRole('dialog', { name: 'Appearance', exact: true });
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    const iframe = page.locator('iframe[title="Appearance preview"]');
    const frame = iframe.contentFrame();
    await frame.locator(content).evaluate(() => document.fonts.ready);
    const settings = dialog.locator('.settings');
    const initialScroll = await settings.evaluate(el => el.scrollTop);
    const bounds = (await iframe.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.wheel(0, 1000);
    await expect.poll(() => frame.locator('body').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    // The bottom of the diagram/answer is reachable by a real user scroll.
    await expect.poll(() => frame.locator(content).evaluate(el => el.getBoundingClientRect().bottom <= innerHeight + 1)).toBe(true);
    expect(await settings.evaluate(el => el.scrollTop)).toBe(initialScroll);
    await page.mouse.wheel(0, -1000);
    await expect.poll(() => frame.locator('body').evaluate(el => el.scrollTop)).toBe(0);
    await expect(dialog.getByRole('button', { name: 'APPLY', exact: true })).toBeVisible();
  });
}
