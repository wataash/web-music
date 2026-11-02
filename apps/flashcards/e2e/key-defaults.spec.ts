// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from './fixtures';

test('resets diatonic key circles to the new defaults without overwriting saved choices', async ({page,shot}) => {
  await page.setViewportSize({width:411,height:1200});
  await page.emulateMedia({colorScheme:'dark'});
  await page.addInitScript(()=>{
    if(window!==window.top)return;
    localStorage.setItem('music-flashcards:hidden-decks','[]');
    if(!localStorage.getItem('music-flashcards:diatonic-selections'))localStorage.setItem('music-flashcards:diatonic-selections',JSON.stringify({'degree-chord':{majorKeys:[0],minorKeys:[0]}}));
  });
  await page.goto('/');
  const row=page.locator('[data-deck="Diatonic Chords"]');
  await expect(row).toBeVisible({timeout:30000});
  const open=()=>openDeckSettings(row);
  await open();
  const dialog=page.getByRole('dialog',{name:'What to ask',exact:true});
  const major=dialog.getByRole('region',{name:'Major',exact:true});
  const minor=dialog.getByRole('region',{name:'Minor',exact:true});
  const resetMajor=major.getByRole('button',{name:'Reset Major keys to default',exact:true});
  const resetMinor=minor.getByRole('button',{name:'Reset Minor keys to default',exact:true});
  await expect(major.locator('.key-cell[aria-pressed="true"]')).toHaveCount(1);
  await expect(minor.locator('.key-cell[aria-pressed="true"]')).toHaveCount(1);
  await resetMajor.click();
  await resetMinor.click();
  for(const name of ['C major','F major','B♭ major'])await expect(major.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
  for(const name of ['A minor','D minor'])await expect(minor.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(major.locator('.key-cell[aria-pressed="true"]')).toHaveCount(3);
  await expect(minor.locator('.key-cell[aria-pressed="true"]')).toHaveCount(2);
  await expect(resetMajor).toHaveCount(0);
  await expect(resetMinor).toHaveCount(0);
  await major.evaluate(el=>el.scrollIntoView({block:'start'}));
  await shot('new-diatonic-key-defaults');
  await dialog.getByRole('button',{name:'CANCEL',exact:true}).click();
  await open();
  await expect(major.locator('.key-cell[aria-pressed="true"]')).toHaveCount(1);
  await resetMajor.click();
  await resetMinor.click();
  await dialog.getByRole('button',{name:'APPLY',exact:true}).click();
  await page.reload();
  await open();
  await expect(major.locator('.key-cell[aria-pressed="true"]')).toHaveCount(3);
  await expect(minor.locator('.key-cell[aria-pressed="true"]')).toHaveCount(2);
  await expect(resetMajor).toHaveCount(0);
  await major.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(resetMajor).toBeVisible();
  await major.evaluate(el=>el.scrollIntoView({block:'start'}));
  await shot('key-circle-reset-visible-after-change');
  await resetMajor.click();
  await expect(major.locator('.key-cell[aria-pressed="true"]')).toHaveCount(3);
  await expect(minor.locator('.key-cell[aria-pressed="true"]')).toHaveCount(2);
});

for(const [deck,region,count] of [['II–V–I Progressions','Major',11],['Music Staff (Movable Do)','',15]] as const){
  test(`resets ${deck} keys to its existing defaults`,async({page})=>{
    await page.setViewportSize({width:411,height:841});
    await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('music-flashcards:hidden-decks','[]');});
    await page.goto('/');
    const row=page.locator(`[data-deck="${deck}"]`);
    await expect(row).toBeVisible({timeout:30000});
    await openDeckSettings(row);
    const dialog=page.getByRole('dialog',{name:'What to ask',exact:true});
    const circle=region?dialog.getByRole('region',{name:region,exact:true}):dialog;
    const reset=circle.getByRole('button',{name:'Reset Major keys to default',exact:true});
    await expect(circle.locator('.key-cell[aria-pressed="true"]')).toHaveCount(count);
    await expect(reset).toHaveCount(0);
    await circle.getByRole('button',{name:'Clear',exact:true}).click();
    await expect(circle.locator('.key-cell[aria-pressed="true"]')).toHaveCount(0);
    await reset.click();
    await expect(circle.locator('.key-cell[aria-pressed="true"]')).toHaveCount(count);
    await expect(reset).toHaveCount(0);
  });
}
