// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { importChordWiki, openLibrary } from './helpers';

// An original chart in ChordWiki notation; no third-party chart is stored here.
// The minor-chord spelling lives in the settings sheet.
async function setMinorNotation(page: Page, on: boolean): Promise<void> {
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  const item = page.getByRole('menuitemcheckbox', { name: 'Write minor chords as Cm7' });
  if ((await item.getAttribute('aria-checked')) !== String(on)) await item.click();
  await page.keyboard.press('Escape');
}

const chart = `{title:Evening Practice}
{subtitle:歌：Example Singer　作詞・作曲：Example Writer}
{c:BPM=100　4/4拍子}
{key:Am}
[Am7(11)]la la [D7(b9,b13)]la [GM7]la
la [Cm7(#13)]la [N.C.]la

{ci:Chorus}
[Am]la la [G/B]la [Fadd9]la
`;

test('pastes a ChordWiki chart, practises and displays it, and exports its text', async ({ page }, info) => {
  await page.goto('/');
  await openLibrary(page);
  await importChordWiki(page, chart);
  // A chart added as text opens on its own full chart.
  await expect(page.locator('.song-title')).toHaveText('Evening Practice');
  await expect(page.getByRole('dialog', { name: 'Choose song', exact: true })).not.toBeVisible();
  await expect(page.getByLabel('Song key', { exact: true })).toHaveValue('A');
  await expect(page.locator('.card-area h2')).toContainText('A-7(11)');
  // The words the chord is sung on sit under its name, above the neck.
  await expect(page.locator('.card-area').getByLabel('Lyrics')).toHaveText('la la');
  const score = page.locator('.full-score').getByLabel('Source chart');
  await expect(score).toHaveClass(/chordwiki/);
  await expect(score.locator('.chord')).toHaveCount(8);
  await expect(score.locator('.title')).toHaveText('Evening Practice');
  await expect(score.locator('.key')).toHaveText('Key: Am');
  // The chart's chords are written the way the iReal chart writes them, and
  // the minor-chord choice applies to them and to the headings. What a
  // ChordWiki chart already shows — its fields, its text — is not repeated.
  await expect(score.locator('.chord').first()).toHaveText('A−7(11)'.replace('−', '-'));
  await setMinorNotation(page, true);
  await expect(score.locator('.chord').first()).toHaveText('Am7(11)');
  await expect(page.locator('.card-area h2')).toContainText('Am7(11)');
  await setMinorNotation(page, false);
  // Chords can be called by their degree in the key — alone, or in small
  // under the name.
  const naming = (option: string) => page.getByRole('button', { name: 'Chord practice settings' }).click()
    .then(() => page.getByRole('group', { name: 'Chord names' }).getByRole('button', { name: option, exact: true }).click())
    .then(() => page.keyboard.press('Escape'));
  await naming('IIm7');
  await expect(page.locator('.card-area h2')).toHaveText('I-7(11)');
  await expect(score.locator('.chord').nth(6)).toHaveText('♭VII/II');
  await page.getByLabel('Song key', { exact: true }).selectOption('C');
  await expect(page.locator('.card-area h2')).toHaveText('I-7(11)');
  await page.getByLabel('Song key', { exact: true }).selectOption('A');
  await naming('Dm7 + IIm7');
  await expect(page.locator('.card-area h2')).toContainText('A-7(11)');
  await expect(page.locator('.card-area h2 .chord-name')).toHaveText('I-7(11)');
  await expect(score.locator('.chord').nth(6)).toContainText('G/B');
  await expect(score.locator('.chord').nth(6).locator('.sublabel')).toHaveText('♭VII/II');
  await naming('Dm7');
  await expect(page.locator('.card-area h2')).toHaveText('A-7(11)');
  await expect(page.getByLabel('Highlight annotations')).toHaveCount(0);
  await expect(page.getByText('Song information and notation guide')).toHaveCount(0);
  await expect(page.getByText('Original key and notation')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('chordwiki-chart.png'), fullPage: true });
  // The card scrolls within its own area, above the step buttons.
  await page.locator('.practice-content').evaluate(el => { el.scrollTop = 200; });
  const nav = (await page.locator('.step-buttons').boundingBox())!;
  const content = (await page.locator('.practice-content').boundingBox())!;
  expect(content.y + content.height).toBeLessThanOrEqual(nav.y + 1);
  // Tapping a chord in the chart selects it for practice.
  await score.locator('.chord').nth(6).click();
  await expect(page.locator('.card-area h2')).toContainText('G/B');
  await expect(page.locator('.card-area').getByLabel('Lyrics')).toHaveText('la');
  await page.getByLabel('Song key', { exact: true }).selectOption('C');
  await expect(page.locator('.card-area h2')).toContainText('Bb/D');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  // Whether the chart is open is the song's, not one view's: the List shows
  // it open too, and so does By section.
  await expect(page.locator('details.song-source')).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'By section', exact: true }).click();
  await expect(page.locator('details.song-source')).toHaveAttribute('open', '');
  await page.locator('details.song-source > summary').click();
  await expect(page.locator('details.song-source')).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Card', exact: true }).click();
  await expect(page.locator('details.song-source')).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByText('Chord tones are not supported for this chord. The original symbol is shown.', { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem').first().getByLabel('Lyrics')).toHaveText('la la');
  await page.reload();
  await expect(page.locator('.song-title')).toHaveText('Evening Practice');
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Export current chart', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('dialog', { name: 'Export chart text' }).getByRole('button', { name: 'Download ChordWiki text' }).click();
  const download = await downloadPromise;
  expect(readFileSync((await download.path())!, 'utf8')).toBe(chart);
  expect(download.suggestedFilename()).toBe('Evening Practice.txt');
  await page.keyboard.press('Escape');
  // The chart can be edited as its own text and keeps its id.
  await page.getByRole('button', { name: 'Add to favorites', exact: true }).click();
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Edit current chart', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit chart', exact: true });
  await expect(edit.getByRole('radio', { name: 'ChordWiki' })).toBeChecked();
  await expect(edit.getByLabel('ChordWiki text', { exact: true })).toHaveValue(chart);
  await edit.getByLabel('ChordWiki text', { exact: true }).fill(chart.replace('{title:Evening Practice}', '{title:Evening Practice II}'));
  await edit.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.song-title')).toHaveText('Evening Practice II');
  await expect(page.getByRole('button', { name: 'Remove from favorites', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // A copy starts a new chart from the same text, beside the original.
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole('button', { name: 'Copy current chart', exact: true }).click();
  const copy = page.getByRole('dialog', { name: 'Add chart', exact: true });
  await expect(copy.getByLabel('ChordWiki text', { exact: true })).toHaveValue(/\{title:Evening Practice II \(copy\)\}/);
  await copy.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.song-title')).toHaveText('Evening Practice II (copy)');
  await expect(page.getByRole('button', { name: 'Add to favorites', exact: true })).toBeVisible();
  await openLibrary(page);
  const picker = page.getByLabel('Song', { exact: true });
  // The favorite appears in Favorites and All songs; its unfavorited copy
  // appears once in All songs. Match their full accessible names so the
  // copy's title is not mistaken for another occurrence of the original.
  await expect(picker.getByRole('button', { name: 'Evening Practice II · Example Singer', exact: true })).toHaveCount(2);
  await expect(picker.getByRole('button', { name: 'Evening Practice II (copy) · Example Singer', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Close song library' }).click();
  await openLibrary(page);
  // The notation chosen last is offered first next time, and a paste in the
  // other notation is pointed at its own choice.
  await page.getByRole('button', { name: 'Add chart', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'ChordWiki' })).toBeChecked();
  // The chart is drawn as it is typed, before Import, and a wrong notation is
  // pointed out there too.
  const field = page.getByLabel('ChordWiki text', { exact: true });
  await field.fill(chart);
  const previewBox = page.getByLabel('Chart preview');
  await expect(previewBox).toContainText('Example Singer · Key A · 8 chords');
  await expect(previewBox.getByLabel('Source chart').locator('.chord')).toHaveCount(8);
  await field.fill('irealb://Nothing');
  await expect(previewBox).toContainText('This is an iReal Pro link. Choose iReal Pro to import it.');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Nothing was added.' })).toBeVisible();
});
