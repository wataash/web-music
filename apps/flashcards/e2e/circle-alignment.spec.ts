// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from './fixtures';

for (const filter of [
  'Circle of Fifths / Note → Cell / Note → Outer',
  'Circle of Fifths / Note → Cell / Note → Inner',
  'Circle of Fifths / (Experimental) Cell → All Notes / Outer',
  'Circle of Fifths / (Experimental) Intervals / Δ3',
]) {
  test(`centers letters and accidentals together in ${filter}`, async ({ page, shot }) => {
    await page.goto('/preview');
    await expect(page.getByRole('status')).not.toHaveText('Loading decks…', { timeout: 60000 });
    await page.getByLabel('Filter decks').fill(filter);
    for (const width of ['390', '640']) {
      await page.getByLabel('Card width').selectOption(width);
      const frame = page.locator('section iframe').last();
      await frame.scrollIntoViewIfNeeded();
      const groups = frame.contentFrame().locator('[data-spelling-centered]');
      await expect(groups.first()).toBeVisible();
      const offsets = await groups.evaluateAll(elements => elements.map(element => {
        const group = element as unknown as SVGGElement;
        const text = group.querySelector('text')!;
        const letter = text.getExtentOfChar(0);
        const matrix = text.getScreenCTM()!;
        const left = new DOMPoint(letter.x, letter.y).matrixTransform(matrix).x;
        const right = new DOMPoint(letter.x + letter.width, letter.y).matrixTransform(matrix).x;
        const paths = [...group.querySelectorAll('.glyph path')].map(path => path.getBoundingClientRect());
        const center = (Math.min(left, ...paths.map(box => box.left)) + Math.max(right, ...paths.map(box => box.right))) / 2;
        const target = new DOMPoint(0, 0).matrixTransform(group.getScreenCTM()!).x;
        return { note: group.getAttribute('data-note'), offset: center - target };
      }));
      expect(offsets.length).toBeGreaterThan(0);
      // SVG character extents include side bearings; allow their subpixel
      // difference from the visible ink used for centering.
      for (const { note, offset } of offsets) expect(Math.abs(offset), `${note} at ${width}px`).toBeLessThan(1.25);
    }
    await shot('centered-spellings');
  });
}
