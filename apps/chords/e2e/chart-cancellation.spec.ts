// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, type Page } from '@playwright/test';
import { openLibrary, importChordWiki } from './helpers';

async function edit(page: Page, title: string) {
  await openLibrary(page);
  await page.getByRole('button', { name: title + ' ·', exact: true }).click();
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Edit current chart', exact: true }).click();
}

for (const phase of ['read', 'parse', 'saved'] as const) {
  for (const fail of phase === 'saved' ? [false] : [false, true]) {
    test(`ignores late ${phase} ${fail ? 'failure' : 'completion'} after changing editors`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto('/');
      for (const name of ['First', 'Second']) {
        await openLibrary(page);
        await importChordWiki(page, `{title:${name}}\n[C]${name}`);
        await expect(page.locator('.chart-editor dialog')).not.toBeVisible();
      }
      await edit(page, 'First');
      if (phase !== 'read') await page.getByLabel('ChordWiki text', { exact: true }).fill('{title:Replacement}\n[F]replacement');
      await expect(page.getByLabel('Chart preview')).toHaveAttribute('aria-busy', 'false');
      await page.evaluate(({ phase, fail }) => {
        const control = window as typeof window & { finishOperation?: () => void };
        const hold = <T>(value: T) => new Promise<T>((resolve, reject) => {
          control.finishOperation = () => fail ? reject(new Error('Delayed failure')) : resolve(value);
        });
        if (phase === 'read') {
          const read = File.prototype.text;
          File.prototype.text = async function () {
            File.prototype.text = read;
            return hold(await read.call(this));
          };
        } else if (phase === 'parse') {
          const digest = crypto.subtle.digest.bind(crypto.subtle);
          crypto.subtle.digest = async (...args) => {
            crypto.subtle.digest = digest;
            return hold(await digest(...args));
          };
        } else {
          // Delay the post-save library refresh, after IndexedDB has committed.
          const read = IDBObjectStore.prototype.getAll;
          IDBObjectStore.prototype.getAll = function (...args) {
            const request = read.apply(this, args);
            if (this.name !== 'songs') return request;
            IDBObjectStore.prototype.getAll = read;
            const descriptor = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess')!;
            Object.defineProperty(request, 'onsuccess', {
              set(listener) {
                descriptor.set!.call(request, function (event: Event) {
                  control.finishOperation = () => listener.call(request, event);
                });
              },
            });
            return request;
          };
        }
      }, { phase, fail });
      if (phase === 'read') {
        await page.getByLabel('ChordWiki text file').setInputFiles({ name: 'replacement.txt', mimeType: 'text/plain', buffer: Buffer.from('{title:Replacement}\n[F]replacement') });
      } else await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(() => page.evaluate(() => typeof (window as any).finishOperation)).toBe('function');
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(page.locator('.chart-editor dialog')).not.toBeVisible();
      await edit(page, 'Second');
      await page.getByLabel('ChordWiki text', { exact: true }).fill('{title:My draft}\n[G]draft');
      await page.evaluate(async () => {
        (window as any).finishOperation();
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      await expect(page.getByRole('dialog', { name: 'Edit chart', exact: true })).toBeVisible();
      await expect(page.getByLabel('ChordWiki text', { exact: true })).toHaveValue('{title:My draft}\n[G]draft');
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.locator('.song-title')).toHaveText('Second');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.locator('.chart-editor dialog')).not.toBeVisible();
      await page.reload();
      await expect(page.locator('.song-title')).toHaveText('My draft');
      await openLibrary(page);
      await expect(page.getByRole('button', { name: (phase === 'saved' ? 'Replacement' : 'First') + ' ·', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'All songs (5)', exact: true })).toBeVisible();
      expect(pageErrors).toEqual([]);
    });
  }
}
