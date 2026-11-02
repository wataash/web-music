// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from './fixtures';
import type { Page } from '@playwright/test';
test.beforeEach(async({page})=>{
  await page.setViewportSize({width:411,height:841});
  await page.addInitScript(()=>{if(window===window.top){localStorage.setItem('music-flashcards:hidden-decks','[]');localStorage.setItem('music-flashcards:layout-help-seen','true');}});
  await page.goto('/');
  await expect(page.locator('[data-deck="Guitar Fretboard"]')).toBeVisible({timeout:30000});
});
async function settings(page:Page,deck:string){await openDeckSettings(page.locator(`[data-deck="${deck}"]`));return page.getByRole('dialog',{name:'What to ask',exact:true});}
async function study(page:Page,deck:string){await page.locator(`[data-deck="${deck}"] .deck-study`).click({position:{x:20,y:20}});await expect(page.locator('.count.new')).not.toHaveText('0');}
async function menu(page:Page){await page.getByRole('button',{name:'Deck actions',exact:true}).click();return page.getByRole('menu');}
async function arrange(page:Page){await menu(page);await page.getByRole('menuitem',{name:'Arrange card',exact:true}).click();return page.getByRole('group',{name:'Arrange card',exact:true});}
function reset(page:Page,name:string){return page.getByRole('button',{name:`Reset ${name} to default`,exact:true});}

test('range reset is a draft; Cancel preserves saved selections and Apply persists defaults',async({page})=>{
 const deck='Guitar Fretboard::Note → Positions';let d=await settings(page,deck);
 await d.locator('#fretboard-fret-count').selectOption('12');await d.locator('.note-choice input').first().click();
 await d.getByRole('button',{name:'APPLY',exact:true}).click();d=await settings(page,deck);
 await reset(page,'Fretboard frets').click();await expect(d.locator('#fretboard-fret-count')).toHaveValue('24');
 await expect(reset(page,'Fretboard frets')).toHaveCount(0);await expect(reset(page,'Fretboard notes')).toBeVisible();
 await d.getByRole('button',{name:'CANCEL',exact:true}).click();d=await settings(page,deck);await expect(d.locator('#fretboard-fret-count')).toHaveValue('12');
 await reset(page,'Fretboard frets').click();await reset(page,'Fretboard notes').click();await d.getByRole('button',{name:'APPLY',exact:true}).click();
 await page.reload();d=await settings(page,deck);await expect(d.locator('#fretboard-fret-count')).toHaveValue('24');await expect(reset(page,'Fretboard notes')).toHaveCount(0);
});
for(const deck of ['Intervals','Interval Identification'])test(`${deck} resets actual selected pairs`,async({page})=>{
 const d=await settings(page,deck);await expect(reset(page,'Interval pairs')).toHaveCount(0);const cell=d.locator('button.cell').first();const before=await cell.getAttribute('aria-pressed');await cell.click();await reset(page,'Interval pairs').click();await expect(cell).toHaveAttribute('aria-pressed',before!);await expect(reset(page,'Interval pairs')).toHaveCount(0);
});
for(const [deck,initial] of [['Diatonic Chords',false],['II–V–I Progressions',true]] as const)test(`${deck} restores its own relative-degree default`,async({page})=>{
 const d=await settings(page,deck);const check=d.getByLabel('Relative-major degree',{exact:true});await expect(check).toBeChecked({checked:initial});await check.click();await reset(page,'Relative-major degree').click();await expect(check).toBeChecked({checked:initial});await expect(reset(page,'Relative-major degree')).toHaveCount(0);
});
test('guitar range, map and fret sides reset independently',async({page})=>{
 const d=await settings(page,'Guitar Intervals');await d.locator('#guitar-difficulty').fill('8');await d.locator('#fret-reach-left').fill('2');await d.locator('#fret-reach-right').fill('4');
 await d.locator('.map .cell:not(:disabled)').first().click();await reset(page,'Question map').click();await expect(reset(page,'Question map')).toHaveCount(0);await expect(d.locator('#guitar-difficulty')).toHaveValue('8');
 await reset(page,'Learning range').click();await expect(d.locator('#guitar-difficulty')).toHaveValue('10');await expect(d.locator('#fret-reach-right')).toHaveValue('4');
 await reset(page,'Frets below the root').click();await expect(d.locator('#fret-reach-left')).toHaveValue('3');await expect(d.locator('#fret-reach-right')).toHaveValue('4');
});
test('arrange resets rotation, frets and height separately and saves immediately',async({page})=>{
 await study(page,'Guitar Fretboard::Note → Positions');await arrange(page);
 await page.getByLabel('Fretboard frets',{exact:true}).selectOption('12');await page.getByLabel('Fretboard height',{exact:true}).fill('1.5');await page.getByRole('button',{name:'Rotate clockwise',exact:true}).click();
 await reset(page,'Rotation').click();await expect(reset(page,'Rotation')).toHaveCount(0);await expect(page.getByLabel('Fretboard height',{exact:true})).toHaveValue('1.5');
 await reset(page,'Fretboard frets').click();await expect(page.getByLabel('Fretboard frets',{exact:true})).toHaveValue('24');await expect(page.getByLabel('Fretboard height',{exact:true})).toHaveValue('1.5');
 await reset(page,'Fretboard height').click();await expect(page.getByLabel('Fretboard height',{exact:true})).toHaveValue('1');
 await page.reload();await arrange(page);await expect(reset(page,'Fretboard height')).toHaveCount(0);await expect(page.getByLabel('Fretboard frets',{exact:true})).toHaveValue('24');
});
test('menu resets restore each factory value without toggling neighbouring settings',async({page})=>{
 await study(page,'Intervals');let m=await menu(page);for(const name of ['Sound','Minimize app bar','Front: root note','Front: answer note'])await m.getByRole('menuitemcheckbox',{name,exact:true}).click();await m.getByLabel('Answer size larger',{exact:true}).click();await m.getByLabel('Note font',{exact:true}).selectOption('roboto');
 for(const name of ['Answer size','Sound','Minimize app bar','Front: root note','Front: answer note','Note font']){await expect(reset(page,name)).toBeVisible();}
 await reset(page,'Sound').click();await expect(m.getByRole('menuitemcheckbox',{name:'Sound',exact:true})).toHaveAttribute('aria-checked','true');await expect(reset(page,'Front: root note')).toBeVisible();
 for(const name of ['Answer size','Minimize app bar','Front: root note','Front: answer note','Note font'])await reset(page,name).click();
 await expect(m.locator('.reset-setting')).toHaveCount(0);await expect(m.getByLabel('Note font',{exact:true})).toHaveValue('termes');
 await page.reload();m=await menu(page);await expect(m.locator('.reset-setting')).toHaveCount(0);
});
for(const deck of ['Music Staff::Staff → Note::Treble Clef','Music Staff (with Octave Numbers)::Staff → Note::Treble Clef','Music Staff (Movable Do)::Staff → Solfege::Treble Clef'])test(`${deck} restores basic note range`,async({page})=>{
 const d=await settings(page,deck);await d.getByRole('radio',{name:'4 ledger lines',exact:true}).check();const button=d.getByRole('button',{name:/^Reset .* note range to default$/});await button.click();await expect(d.getByRole('radio',{name:'2 ledger lines',exact:true})).toBeChecked();await expect(button).toHaveCount(0);
});
for(const [deck,ring] of [['(Experimental) Circle of Fifths::Note → Cell::Note → Outer (Major) Cell','Major'],['(Experimental) Circle of Fifths::Note → Cell::Note → Inner (Minor) Cell','Minor'],['(Experimental) Circle of Fifths::(Experimental) Intervals::♭3','Minor']])test(`${deck} restores its ring`,async({page})=>{
 const d=await settings(page,deck);await d.getByRole('radio',{name:'Advanced',exact:true}).check();await reset(page,`${ring} notes`).click();await expect(d.getByRole('radio',{name:'Basic',exact:true})).toBeChecked();await expect(reset(page,`${ring} notes`)).toHaveCount(0);
});
for(const [deck,label,value,name,expected] of [['Music Staff (with Octave Numbers)::Staff → Note::Treble Clef','Piano keys','49','Piano keys','88'],['Intervals','Keyboard keys','25','Keyboard keys','37'],['Music Staff (Movable Do)::Staff → Solfege::Treble Clef','Reference keyboard keys','37','Keyboard range','25']])test(`${deck} resets its keyboard count`,async({page})=>{
 await study(page,deck);await arrange(page);const count=page.getByLabel(label,{exact:true});if(label==='Reference keyboard keys')await count.fill(value);else await count.selectOption(value);await page.getByRole('button',{name:'Rotate clockwise',exact:true}).click();await reset(page,name).click();await expect(count).toHaveValue(expected);await expect(reset(page,'Rotation')).toBeVisible();
});
test('optional keyboard and deck visibility restore shipped defaults',async({page})=>{
 await study(page,'Music Staff (Movable Do)::Staff → Solfege::Treble Clef');const m=await menu(page);await m.getByRole('menuitemcheckbox',{name:'Keyboard',exact:true}).click();await reset(page,'Keyboard').click();await expect(m.getByRole('menuitemcheckbox',{name:'Keyboard',exact:true})).toHaveAttribute('aria-checked','true');
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'CHOOSE DECKS',exact:true}).click();const guitar=page.getByRole('checkbox',{name:'Guitar Intervals',exact:true});await guitar.uncheck();await expect(guitar.locator('xpath=ancestor::li')).toHaveClass(/\bmodified\b/);await expect(reset(page,'Decks shown')).toHaveCount(0);await guitar.check();await expect(guitar.locator('xpath=ancestor::li')).not.toHaveClass(/\bmodified\b/);
});
test('selected-part and answer-button resets act on the live card',async({page})=>{
 await study(page,'Intervals');await arrange(page);
 const root=page.frameLocator('iframe[title="card"]').locator('html');
 const keyboard=page.frameLocator('iframe[title="card"]').locator('[data-card-part="keyboard"]');
 const box=(await keyboard.boundingBox())!;await page.mouse.move(200,box.y+box.height/2);await page.mouse.wheel(0,-100);
 await expect(reset(page,'Keyboard')).toBeVisible();await reset(page,'Keyboard').click();await expect.poll(()=>root.evaluate(el=>el.style.getPropertyValue('--keyboard-scale'))).toBe('1');await expect(reset(page,'Keyboard')).toHaveCount(0);
 const footer=(await page.locator('footer.bottom').boundingBox())!;await page.mouse.move(200,footer.y+20);await page.mouse.down();await page.mouse.move(5,400,{steps:10});await page.mouse.up();
 await expect(reset(page,'Answer buttons')).toBeVisible();await reset(page,'Answer buttons').click();await expect(page.locator('footer.bottom')).not.toHaveClass(/anchored/);await expect(reset(page,'Answer buttons')).toHaveCount(0);
});
test.describe('touch reset buttons',()=>{
 test.use({hasTouch:true,isMobile:true});
 test('resets height over a rotated card',async({page})=>{
  await study(page,'Guitar Fretboard::Note → Positions');await arrange(page);await page.getByRole('button',{name:'Rotate clockwise',exact:true}).tap();await page.getByLabel('Fretboard height',{exact:true}).fill('1.5');await reset(page,'Fretboard height').tap();await expect(page.getByLabel('Fretboard height',{exact:true})).toHaveValue('1');await expect(reset(page,'Rotation')).toBeVisible();
 });
});
