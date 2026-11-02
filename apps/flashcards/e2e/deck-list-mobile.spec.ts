// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from './fixtures';

for(const width of [320,411])for(const enlarged of [false,true])test(`deck names fit at ${width}px${enlarged?' with enlarged text':''}`,async({page})=>{
 await page.setViewportSize({width,height:841});
 await page.addInitScript((enlarged)=>{if(window!==window.top)return;localStorage.setItem('music-flashcards:hidden-decks','[]');localStorage.setItem('music-flashcards:collapsed-decks','[]');if(enlarged)document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize='20px');},enlarged);
 await page.goto('/');await expect(page.locator('[data-deck="Guitar Fretboard"]')).toBeVisible({timeout:30000});
 await expect(page.locator('.deck-settings')).toHaveCount(0);
 const names=await page.locator('.deck-name').evaluateAll(els=>els.map(el=>({name:el.textContent,width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight,ellipsis:getComputedStyle(el).textOverflow})));
 for(const name of names){expect(name.width,name.name!).toBeGreaterThan(40);expect(name.scrollWidth,name.name!).toBeLessThanOrEqual(name.width+1);expect(name.scrollHeight,name.name!).toBeLessThanOrEqual(name.height+1);expect(name.ellipsis).not.toBe('ellipsis');}
 const rows=await page.locator('.deck-row').evaluateAll(els=>els.map(el=>['new','learn','due'].map(kind=>el.querySelector(`.count.${kind}`)!.getBoundingClientRect().right)));
 for(const row of rows)for(let i=0;i<3;i++)expect(row[i]).toBeCloseTo(rows[0][i],0);
 expect(await page.locator('.deck-list').evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(width);
});

test('keyboard context menu keeps settings available without a gear',async({page})=>{
 await page.goto('/');const row=page.locator('[data-deck="Guitar Intervals"]');await expect(row).toBeVisible({timeout:30000});await row.locator('.deck-study').focus();await page.keyboard.press('Shift+F10');await page.getByRole('menuitem',{name:'What to ask',exact:true}).click();await expect(page.locator('#guitar-difficulty')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});

test.describe('mobile long press',()=>{
 test.use({viewport:{width:411,height:841},hasTouch:true,isMobile:true});
 test('opens the settings menu while a tap still starts studying',async({page,browserName})=>{
  test.skip(browserName !== 'chromium', 'Native touch-hold is exercised through Chromium touch input.');
  await page.goto('/');const row=page.locator('[data-deck="Guitar Intervals"]');await expect(row).toBeVisible({timeout:30000});const box=(await row.boundingBox())!;const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:box.y+box.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:122,y:box.y+box.height/2+2}]});await expect(page.getByRole('menuitem',{name:'What to ask',exact:true})).toBeVisible();await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.getByRole('menuitem',{name:'What to ask',exact:true}).tap();await expect(page.locator('#guitar-difficulty')).toBeVisible();await page.getByRole('button',{name:'CANCEL',exact:true}).tap();await row.locator('.deck-study').tap();await expect(page.locator('iframe[title="card"]')).toBeVisible();
 });
});

test('collapsing wrapped deck rows preserves the parent position',async({page})=>{
 await page.setViewportSize({width:320,height:841});await page.addInitScript(()=>{if(window!==window.top)return;localStorage.setItem('music-flashcards:hidden-decks','[]');localStorage.setItem('music-flashcards:collapsed-decks','[]');document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize='20px');});await page.goto('/');const parent=page.locator('[data-deck="Music Staff (with Octave Numbers)"]');await expect(parent).toBeVisible({timeout:30000});await parent.evaluate(el=>el.scrollIntoView({block:'start'}));const y=(await parent.boundingBox())!.y;
 await parent.getByRole('button',{name:'Collapse (Experimental) Music Staff (with Octave Numbers)',exact:true}).click();await expect(page.locator('[data-deck="Music Staff (with Octave Numbers)::Staff → Note"]')).toHaveCount(0);expect((await parent.boundingBox())!.y).toBeCloseTo(y,0);
 await parent.getByRole('button',{name:'Expand (Experimental) Music Staff (with Octave Numbers)',exact:true}).click();expect((await parent.boundingBox())!.y).toBeCloseTo(y,0);
});
