// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import { scramble } from '@web-music/ireal';

// Synthetic charts isolate notation seen in the iReal app without bundling songs.
async function openScore(page: Page, raw: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await page.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
  await page.getByLabel('Shared link / HTML').fill('irealb://' + encodeURIComponent(
    'Notation Example=Example==Swing=C==1r34LbKcu7' + scramble(raw) + '==0=0'));
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 song' })).toBeVisible();
  await page.getByRole('button', { name: 'Close song library' }).click();
  await page.getByText('Full chart', { exact: true }).click();
  return page.locator('.full-score .ireal-sheet');
}

for (const width of [320, 700]) {
  test.describe(`${width}px notation`, () => {
    test.use({ viewport: { width, height: 1200 } });

    test('centers compressed single-bar repeats and preserves rows', async ({ page }) => {
      const sheet = await openScore(page, '[T44' + 'C7XyQKcl LZ x LZ x LZ'.repeat(2));
      await expect(sheet.locator('.ireal-row')).toHaveCount(2);
      await expect(sheet.locator('.bar-repeat')).toHaveCount(6);
      for (const row of await sheet.locator('.ireal-row').all()) {
        const box = (await row.boundingBox())!;
        const centers = await row.locator('.bar-repeat').evaluateAll(nodes => nodes.map(node => {
          const rect = node.getBoundingClientRect();
          return rect.left + rect.width / 2;
        }));
        for (const [index, center] of centers.entries()) {
          expect(Math.abs(center - (box.x + box.width * [6, 10, 14][index] / 16))).toBeLessThan(2);
        }
      }
    });

    test('preserves triple meter, sections, alternate chords and narrow cells', async ({ page }) => {
      const sheet = await openScore(page, '*A[T34C7(D7)XyQ|sE7,F7,G7,A7|lC7XyQ|C7XyQ|*B[C7XyQZ');
      await expect(sheet.locator('.meter span')).toHaveText(['3', '4']);
      await expect(sheet.locator('.section')).toHaveText(['A', 'B']);
      await expect(sheet.locator('.ireal-row')).toHaveCount(2);
      const alternate = (await sheet.locator('.alternate .chord').boundingBox())!;
      const main = (await sheet.locator('.chord').first().boundingBox())!;
      expect(alternate.y).toBeLessThan(main.y);
      expect(Math.abs(alternate.x - main.x)).toBeLessThan(2);
      expect(await sheet.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
    });

    test('two-bar repeat straddles the middle barline', async ({ page }) => {
      const sheet = await openScore(page, '[T44C7XyQ|D7XyQ|XyQr|XyQZ');
      const row = (await sheet.locator('.ireal-row').boundingBox())!;
      const repeat = (await sheet.getByRole('img', { name: 'Repeat previous two bars' }).boundingBox())!;
      expect(Math.abs(repeat.x + repeat.width / 2 - (row.x + row.width * 12 / 16))).toBeLessThan(2);
    });

    test('does not draw a barline in leading empty cells', async ({ page }) => {
      const sheet = await openScore(page, '[C7XyQ|D7XyQ|E7XyQ|F7XyQ}XyQXyQ LZN2G7XyQ|C7XyQZ');
      const row = sheet.locator('.ireal-row').nth(1);
      expect(await row.evaluate(el => {
        const style = getComputedStyle(el, '::before');
        return style.content === 'none' || style.display === 'none' || parseFloat(style.borderLeftWidth) === 0;
      })).toBe(true);
    });

    test('positions the coda above the chord line', async ({ page }) => {
      const sheet = await openScore(page, '[QC7XyQ|D7XyQZ');
      const coda = (await sheet.getByTitle('Coda').boundingBox())!;
      const chord = (await sheet.locator('.chord').first().boundingBox())!;
      expect(coda.y + coda.height).toBeLessThanOrEqual(chord.y);
    });

    test('shows comment spacing without compression codes', async ({ page }) => {
      const sheet = await openScore(page, '[C7<XyQXyQFine>XyQZ');
      await expect(sheet.locator('.comment')).not.toContainText('XyQ');
      const note = (await sheet.locator('.comment').boundingBox())!;
      const chart = (await sheet.boundingBox())!;
      expect(note.y + note.height).toBeLessThanOrEqual(chart.y + chart.height);
    });

    test('places a slash bass below the root', async ({ page }) => {
      const sheet = await openScore(page, '[C7/EXyQZ');
      const root = (await sheet.locator('.root').boundingBox())!;
      const bass = (await sheet.locator('.bass').boundingBox())!;
      expect(bass.y).toBeGreaterThanOrEqual(root.y + root.height * 0.7);
    });

    test('draws a horizontal ending bracket above its label', async ({ page }) => {
      const sheet = await openScore(page, '{C7XyQ|N1D7XyQ}N2E7XyQZ');
      const ending = sheet.getByTitle('Ending 1', { exact: true });
      const drawn = await ending.evaluate(el => {
        const styles = [getComputedStyle(el), getComputedStyle(el, '::before'), getComputedStyle(el, '::after')];
        return !!el.querySelector('svg') || styles.some(style => parseFloat(style.borderTopWidth) > 0);
      });
      expect(drawn).toBe(true);
    });

    test('keeps an invisible root invisible', async ({ page }) => {
      const sheet = await openScore(page, '[C7XyQ|W/EXyQZ');
      await expect(sheet.locator('.root:visible').filter({ hasText: /^C$/ })).toHaveCount(1);
    });
  });
}

for (const width of [320, 700]) test('notation appearance at ' + width + 'px', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium' || process.platform !== 'linux', 'Image baselines use Linux Chromium; geometry tests run on every browser.');
  await page.setViewportSize({ width, height: 1200 });
  const sheet = await openScore(page, '*A[T44SC7/EXyQ|F^7/AXyQ|QG7/BXyQ|C7fXyQ|' + '{N1D-7(G7)XyQ|G7XyQ|C^7XyQ|A7XyQ|D-7XyQ}N2G7XyQ|C^7XyQZ');
  const alternate = (await sheet.locator('.alternate .chord').boundingBox())!;
  const ending = (await sheet.getByTitle('Ending 1', { exact: true }).first().boundingBox())!;
  expect(alternate.y).toBeGreaterThanOrEqual(ending.y + ending.height);
  await page.evaluate(() => document.fonts.ready);
  await expect(sheet).toHaveScreenshot('notation-' + width + '.png', { animations: 'disabled', maxDiffPixelRatio: 0.001 });
});

test('practices repeated bars, highlights their sign, and restores the expanded position', async ({ page }) => {
  const sheet = await openScore(page, '*A[C7XyQ|D7XyQ|XyQr| XyQ|*B xXyQZ');
  const number = page.getByLabel('Chord number', { exact: true });
  await expect(number).toHaveAttribute('max', '5');
  for (const [position, chord, label] of [[3, 'C7', 'Repeat previous two bars'], [4, 'D7', 'Repeat previous two bars'], [5, 'D7', 'Repeat previous bar']] as const) {
    await number.fill(String(position));
    await number.press('Tab');
    await expect(page.locator('.question-heading h2')).toHaveText(chord);
    await expect(sheet.getByRole('img', { name: label, exact: true })).toHaveClass(/selected/);
  }
  await page.reload();
  await expect(number).toHaveValue('5');
  await expect(page.locator('.question-heading h2')).toHaveText('D7');
  await page.getByText('Full chart', { exact: true }).click();
  await expect(page.locator('.chord-source .ireal-row')).toHaveCount(1);
  await expect(page.locator('.chord-source .section')).toHaveText('B');
  await expect(page.locator('.chord-source .selected')).toHaveCount(1);
});

test('selects written and repeated chords from the score in practice and list views', async ({ page }) => {
  const sheet = await openScore(page, '[C7XyQ|D7XyQ|XyQr| XyQZ');
  await sheet.getByRole('button', { name: 'D7', exact: true }).click();
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('2');
  await expect(page.locator('.question-heading h2')).toHaveText('D7');
  const repeat = sheet.getByRole('button', { name: 'Practice Repeat previous two bars', exact: true });
  await repeat.click();
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('3');
  await expect(page.locator('.question-heading h2')).toHaveText('C7');
  await repeat.press('Enter');
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('4');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.getByText('Full chart', { exact: true }).click();
  await sheet.getByRole('button', { name: 'C7', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.chord-list li[aria-current="true"]')).toContainText('1 / 4');
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('1');
  await page.getByText('Full chart', { exact: true }).click();
  await page.locator('.chord-source').getByRole('button', { name: 'D7', exact: true }).click();
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('2');
});

test('sounds the chord chosen from the score', async ({ page }) => {
  await page.addInitScript(() => {
    const started: number[] = [];
    (window as unknown as { started: number[] }).started = started;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...args: [number?]) {
      started.push(this.buffer?.length ?? 0);
      return start.apply(this, args);
    };
  });
  const sheet = await openScore(page, '[C7XyQ|D7XyQ|XyQr| XyQZ');
  const plucks = () => page.evaluate(() => (window as unknown as { started: number[] }).started.length);
  expect(await plucks()).toBe(0);
  await sheet.getByRole('button', { name: 'D7', exact: true }).click();
  await expect.poll(plucks).toBe(4);
  await sheet.getByRole('button', { name: 'Practice Repeat previous two bars', exact: true }).click();
  await expect.poll(plucks).toBe(8);
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Sound', exact: true }).click();
  await page.keyboard.press('Escape');
  await sheet.getByRole('button', { name: 'C7', exact: true }).click();
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('1');
  expect(await plucks()).toBe(8);
});

test('zooms the chart without changing its rows or the fretboard and restores the size', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const sheet = await openScore(page, '[C7XyQ|D7XyQ|E7XyQ|F7XyQ|G7XyQZ');
  const before = (await sheet.boundingBox())!;
  const board = page.locator('.board-part');
  const boardWidth = (await board.boundingBox())!.width;
  const size = page.getByLabel('Chart size', { exact: true });
  await size.selectOption('2');
  await expect.poll(async () => (await sheet.boundingBox())!.width).toBeCloseTo(before.width * 2, 0);
  await expect(sheet.locator('.ireal-row')).toHaveCount(2);
  expect((await board.boundingBox())!.width).toBe(boardWidth);
  expect(await page.locator("[data-chord-practice]").evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: info.outputPath("chart-zoom.png") });
  await page.reload();
  await expect(size).toHaveValue('2');
  await page.getByText('Full chart', { exact: true }).click();
  await expect.poll(async () => (await page.locator('.chord-source .ireal-sheet').boundingBox())!.width).toBeGreaterThan(before.width * 1.8);
  await page.getByText('Full chart', { exact: true }).click();
  await size.selectOption('1');
  await expect.poll(async () => (await sheet.boundingBox())!.width).toBeCloseTo(before.width, 0);
});

test('moves through the score with one Tab stop, arrow keys and Home/End', async ({ page }) => {
  const sheet = await openScore(page, '[C7XyQ|D7XyQ|E7XyQ|F7XyQ|G7XyQ|A7XyQ|B7XyQ|C7XyQZ');
  await expect(sheet.locator('button[tabindex="0"]')).toHaveCount(1);
  await sheet.getByRole('button', { name: 'D7', exact: true }).click();
  await page.keyboard.press('ArrowDown');
  await expect(sheet.getByRole('button', { name: 'A7', exact: true })).toBeFocused();
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('6');
  await page.keyboard.press('Home');
  await expect(sheet.getByRole('button', { name: 'G7', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(sheet.getByRole('button', { name: 'F7', exact: true })).toBeFocused();
  await page.keyboard.press('Control+End');
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('8');
  await page.keyboard.press('ArrowUp');
  await expect(sheet.getByRole('button', { name: 'F7', exact: true })).toBeFocused();
  await page.keyboard.press('Control+Home');
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('1');
  await expect(sheet.locator('button[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.getByText('Song information and notation guide', { exact: true })).toBeFocused();
  await page.getByText('Full chart', { exact: true }).click();
  const context = page.locator('.chord-source');
  await context.getByRole('button', { name: 'F7', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await expect(context.getByRole('button', { name: 'G7', exact: true })).toBeFocused();
  await expect(page.getByLabel('Chord number', { exact: true })).toHaveValue('5');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.getByText('Full chart', { exact: true }).click();
  await sheet.getByRole('button', { name: 'D7', exact: true }).click();
  await page.keyboard.press('ArrowDown');
  await expect(sheet.getByRole('button', { name: 'A7', exact: true })).toBeFocused();
  await expect(page.locator('.chord-list li[aria-current="true"]')).toContainText('6 / 8');
});

test('shares minor notation and annotation highlighting across charts and reloads', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  const sheet = await openScore(page, '*A[QC-7/E<XyQSoft>XyQ|D-^7(G-7)XyQ|N1G7XyQZ');
  await expect(sheet.locator('.quality').first()).toHaveText('-7');
  const initial = await sheet.locator('.comment').evaluate(el => getComputedStyle(el).color);
  await page.getByLabel('Minor chords', { exact: true }).selectOption('m');
  await page.getByLabel('Highlight annotations', { exact: true }).check();
  await expect(sheet.locator('.quality')).toHaveText(['m7', 'm△7', 'm7', '7']);
  await expect.poll(() => sheet.locator('.comment').evaluate(el => getComputedStyle(el).color)).not.toBe(initial);
  await page.screenshot({ path: info.outputPath('notation-options.png') });
  await page.reload();
  await expect(page.getByLabel('Minor chords', { exact: true })).toHaveValue('m');
  await expect(page.getByLabel('Highlight annotations', { exact: true })).toBeChecked();
  await page.getByText('Full chart', { exact: true }).click();
  await expect(page.locator('.chord-source .quality').first()).toHaveText('m7');
  await expect(page.locator('.chord-source .ireal-sheet')).toHaveClass(/highlight-annotations/);
  await page.getByText('Full chart', { exact: true }).click();
  await page.getByLabel('Minor chords', { exact: true }).selectOption('-');
  await page.getByLabel('Highlight annotations', { exact: true }).uncheck();
  await expect(sheet.locator('.quality').first()).toHaveText('-7');
  await expect.poll(() => sheet.locator('.comment').evaluate(el => getComputedStyle(el).color)).toBe(initial);
});

test('prints only the transposed chart and restores the screen', async ({ page }, info) => {
  await openScore(page, '[T44C-7XyQ|F7XyQ|xXyQ|G7XyQZ');
  await page.getByLabel('Song key', { exact: true }).selectOption('D');
  await page.getByLabel('Minor chords', { exact: true }).selectOption('m');
  await page.getByLabel('Chart size', { exact: true }).selectOption('2');
  await page.evaluate(() => { window.print = () => { window.dispatchEvent(new Event("beforeprint")); }; });
  await page.getByRole('button', { name: 'Print / PDF', exact: true }).click();
  const output = page.locator('.chart-print');
  await expect(output).toBeHidden();
  await page.emulateMedia({ media: 'print' });
  await expect(output).toBeVisible();
  await expect(output.locator('h1')).toHaveText('Notation Example');
  await expect(output.locator('.chord').first()).toHaveAttribute('aria-label', 'Dm7');
  await expect(output.locator('.selected')).toHaveCount(0);
  await expect(page.locator('[data-chord-practice]')).toBeHidden();
  expect(await output.locator('.ireal-row').first().evaluate(el => getComputedStyle(el).breakInside)).toBe('avoid');
  const buttonChart = await output.innerText();
  const buttonImage = await output.screenshot();
  await page.screenshot({ path: info.outputPath('print-chart.png') });
  await page.pdf({ path: info.outputPath('chart.pdf'), format: 'A4' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({ media: 'screen' });
  await expect(output).toHaveCount(0);
  await expect(page.getByLabel('Chart size', { exact: true })).toHaveValue('2');
  await page.getByText('Full chart', { exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(output).toHaveCount(1);
  expect(await output.innerText()).toBe(buttonChart);
  expect(await output.screenshot()).toEqual(buttonImage);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('.song-source')).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.pdf({ path: info.outputPath('list-chart.pdf'), format: 'A4' });
  await expect(output).toHaveCount(0);
});
