// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from '@playwright/test';

test('changes instrument, custom tuning and bass strings across practice and list views', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const settings = () => page.getByRole('button', { name: 'Instrument settings' }).click();
  const close = () => page.getByRole('button', { name: 'Close instrument settings' }).click();
  await settings();
  const preset = page.getByLabel('Instrument preset');
  for (const id of ['guitar-7', 'guitar-8', 'guitar-9', 'bass-4', 'bass-5', 'bass-6', 'bass-7', 'bass-8']) {
    const count = Number(id.at(-1));
    await preset.selectOption(id);
    await expect(page.getByRole('group', { name: 'Strings for bass notes' }).getByRole('checkbox')).toHaveCount(count);
    await close();
    await expect(page.locator('.fretboard .string')).toHaveCount(count);
    await expect(page.locator('.fretboard [data-fret-cell]')).toHaveCount(count * 25);
    const geometry = await page.locator('.fretboard').evaluate(el => {
      const svg = el as SVGSVGElement;
      const lines = [...el.querySelectorAll('line.string')];
      return { bottom: Number(lines.at(-1)?.getAttribute('y1')), height: svg.viewBox.baseVal.height };
    });
    expect(geometry.bottom + 19).toBeLessThan(geometry.height);
    await settings();
  }
  await preset.selectOption('bass-4');
  await page.getByLabel('String 4 note', { exact: true }).selectOption('0');
  await page.getByLabel('String 4 octave', { exact: true }).selectOption('1');
  await expect(preset).toHaveValue('custom');
  await page.screenshot({ path: info.outputPath('custom-tuning.png') });
  await close();
  await expect(page.locator('.fretboard [data-marker][data-string="4"][data-fret="0"]')).toHaveAttribute('data-interval', 'R');
  await page.reload();
  await expect(page.locator('.fretboard .string')).toHaveCount(4);
  await settings();
  await expect(page.getByLabel('String 4 note', { exact: true })).toHaveValue('0');
  await expect(page.getByLabel('String 4 octave', { exact: true })).toHaveValue('1');
  await close();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.fretboard').first().locator('.string')).toHaveCount(4);
  await settings();
  await preset.selectOption('guitar-9');
  await close();
  await expect(page.locator('.fretboard').first().locator('.string')).toHaveCount(9);
  await page.screenshot({ path: info.outputPath('nine-string-list.png') });
});

test('persists new instruments and custom string counts', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const open = () => page.getByRole('button', { name: 'Instrument settings' }).click();
  const close = () => page.getByRole('button', { name: 'Close instrument settings' }).click();
  await open();
  for (const [id, count] of [['stick-10', 10], ['stick-12', 12], ['violin', 4], ['violin-5', 5], ['viola', 4], ['cello', 4], ['double-bass', 4], ['ukulele-high-g', 4], ['ukulele-low-g', 4], ['ukulele-baritone', 4], ['mandolin', 8], ['mandola', 8], ['octave-mandolin', 8], ['tenor-banjo', 4], ['irish-banjo', 4]] as const) {
    await page.getByLabel('Instrument preset').selectOption(id);
    await expect(page.getByLabel('Instrument preset')).toHaveValue(id);
    await close();
    await expect(page.locator('.fretboard .string')).toHaveCount(count);
    await page.reload();
    await open();
    await expect(page.getByLabel('Instrument preset')).toHaveValue(id);
  }
  await page.getByLabel('Instrument preset').selectOption('stick-12');
  await expect(page.getByRole('group', { name: 'Strings for bass notes' }).getByRole('checkbox', { checked: true })).toHaveCount(6);
  await close();
  await page.screenshot({ path: info.outputPath('grand-stick.png') });
  await open();
  await page.getByLabel('String count', { exact: true }).selectOption('2');
  await close();
  await expect(page.locator('.fretboard .string')).toHaveCount(2);
  await page.reload();
  await open();
  await expect(page.getByLabel('String count', { exact: true })).toHaveValue('2');
  await expect(page.getByRole('group', { name: 'Strings for bass notes' }).getByRole('checkbox', { checked: true })).toHaveCount(2);
  await page.getByLabel('String count', { exact: true }).selectOption('12');
  await page.getByLabel('String 12 note', { exact: true }).selectOption('0');
  await page.getByLabel('String 12 octave', { exact: true }).selectOption('2');
  await close();
  await expect(page.locator('.fretboard [data-marker][data-string="12"][data-fret="0"]')).toHaveAttribute('data-interval', 'R');
});

for (const width of [320, 1000]) test(`fits and zooms a 12-string board with fixed pitch labels at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Instrument settings' }).click();
  await page.getByLabel('Instrument preset').selectOption('stick-12');
  await page.getByRole('button', { name: 'Close instrument settings' }).click();
  await expect(page.getByRole('button', { name: 'Instrument settings' })).toHaveText('Stick · 12 strings');
  const controls = page.getByRole('group', { name: 'Fretboard view' });
  const scroll = page.locator('.board-scroll');
  await controls.getByRole('button', { name: 'Fit', exact: true }).click();
  await expect.poll(() => scroll.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.locator('.open-strings span')).toHaveCount(12);
  await expect(page.locator('.open-strings span').nth(6)).toHaveText('C1');
  await controls.getByRole('button', { name: 'Zoom', exact: true }).click();
  const label = page.locator('.open-strings span').last();
  const before = (await label.boundingBox())!;
  await scroll.evaluate(el => el.scrollLeft = 500);
  await expect.poll(() => scroll.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  const after = (await label.boundingBox())!;
  expect(after.x).toBe(before.x);
  const line = (await page.locator('.fretboard .string').last().boundingBox())!;
  expect(Math.abs(after.y + after.height / 2 - (line.y + line.height / 2))).toBeLessThan(2);
  await page.screenshot({ path: info.outputPath(`zoom-${width}.png`) });
  await controls.getByRole('button', { name: 'Fit', exact: true }).click();
  await page.reload();
  await expect(controls.getByRole('button', { name: 'Fit', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('button', { name: 'List', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('group', { name: 'Fretboard view' }).first().getByRole('button', { name: 'Zoom', exact: true }).click();
  await expect.poll(() => page.locator('.board-scroll').first().evaluate(el => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Practice', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
