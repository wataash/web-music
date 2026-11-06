// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from "./fixtures";
for (const example of [
  { mode: "major", key: "C major", chords: ["Dm7", "G7", "CΔ7"] },
  { mode: "minor", key: "A minor", chords: ["Bø7", "E7", "Am7"] },
]) {
  test(`memorizes ${example.key} II–V–I without moving the question`, async ({ page, shot }) => {
    await page.setViewportSize({ width: 411, height: 841 });
    await page.emulateMedia({ colorScheme: "dark" });
    const imported = page.waitForEvent("console", { predicate: message => message.text().startsWith("[Music Flashcards] automatically imported") });
    await page.addInitScript(mode => {
      if (window !== window.top) return;
      localStorage.setItem("music-flashcards:hidden-decks", "[]");
      localStorage.setItem("music-flashcards:ii-v-i-keys", JSON.stringify({ majorKeys: mode === "major" ? [0] : [], minorKeys: mode === "minor" ? [0] : [] }));
    }, example.mode);
    await page.goto("/");
    await imported;
    await page.locator('[data-deck="II–V–I Progressions"] .deck-study').click({ position: { x: 20, y: 20 } });
    const frame = page.frameLocator('iframe[title="card"]');
    await expect(frame.locator(".diatonic-key")).toHaveText(example.key);
    await expect(frame.locator('.diatonic-degree .chord-symbol')).toHaveCount(3);
    const question = frame.locator(".diatonic-question");
    const before = await question.boundingBox();
    await expect(frame.locator(".diatonic-answer")).toBeHidden();
    const relative = frame.locator(".progression-relative");
    if (example.mode === "minor") {
      await expect(relative).toHaveText("(viiø7 → III7 → vim7 in C major)");
      await expect(relative).toBeVisible();
      await expect(relative.locator('.chord-symbol')).toHaveCount(3);
    } else await expect(relative).toHaveCount(0);
    await shot(`${example.mode}-front`);
    await page.getByRole("button", { name: "SHOW ANSWER", exact: true }).click();
    await expect(frame.locator(".diatonic-answer > span:not(.progression-arrow)")).toHaveText(example.chords);
    await expect(frame.locator('.diatonic-answer .chord-extension')).toHaveCount(3);
    expect(await question.boundingBox()).toEqual(before);
    if (example.mode === "minor") await expect(relative).toBeVisible();
    await expect(frame.locator(".diatonic-relative, svg.staff, svg.keyboard, .diatonic-notes")).toHaveCount(0);
    await shot(`${example.mode}-back`);
  });
}

test("selects major/minor keys independently on the circle, with cancel and reload", async ({ page, shot }) => {
  await page.setViewportSize({width:411,height:1200});
  await page.emulateMedia({colorScheme:'dark'});
  const imported = page.waitForEvent("console", { predicate: message => message.text().startsWith("[Music Flashcards] automatically imported") });
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem("music-flashcards:hidden-decks", "[]"); });
  await page.goto("/");
  await imported;
  const row = page.locator('[data-deck="II–V–I Progressions"]');
  await openDeckSettings(row);
  const dialog = page.getByRole("dialog", { name: "What to ask", exact: true });
  const major = dialog.getByRole('region', {name:'Major',exact:true});
  const minor = dialog.getByRole('region', {name:'Minor',exact:true});
  await expect(dialog.locator('.wheel')).toHaveCount(2);
  expect((await major.boundingBox())!.y).toBeLessThan((await minor.boundingBox())!.y);
  await expect(major.locator('.key-cell[aria-pressed="true"]')).toHaveCount(11);
  await expect(minor.locator('.key-cell[aria-pressed="true"]')).toHaveCount(11);
  await expect(major.getByRole('button',{name:'F♯ major',exact:true})).toHaveAttribute('aria-pressed','false');
  await expect(minor.getByRole('button',{name:'E♭ minor',exact:true})).toHaveAttribute('aria-pressed','false');
  await shot('major-and-minor-circles');
  await major.getByRole("button", { name: "Clear", exact: true }).click();
  await dialog.getByRole("button", { name: "F major", exact: true }).click();
  await minor.getByRole("button", { name: "Clear", exact: true }).click();
  await dialog.getByRole("button", { name: "G minor", exact: true }).click();
  await shot("progression-key-selection");
  await dialog.getByRole("button", { name: "APPLY", exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("music-flashcards:ii-v-i-keys")!))).toEqual({ majorKeys: [-1], minorKeys: [-2], relativeMajor:true });
  await page.reload();
  await openDeckSettings(row);
  await expect(dialog.getByRole("button", { name: "F major", exact: true })).toHaveAttribute("aria-pressed", "true");
  await major.getByRole('button',{name:'Reset Major keys to default',exact:true}).click();
  await expect(major.locator('.key-cell[aria-pressed="true"]')).toHaveCount(11);
  await expect(minor.locator('.key-cell[aria-pressed="true"]')).toHaveCount(1);
  await major.getByRole("button", { name: "Clear", exact: true }).click();
  await dialog.getByRole("button", { name: "CANCEL", exact: true }).click();
  await row.locator(".deck-study").click({ position: { x: 20, y: 20 } });
  const frame = page.frameLocator('iframe[title="card"]');
  await expect(frame.locator(".diatonic-key")).toHaveText(/F major|G minor/);
  await page.getByRole("button", { name: "SHOW ANSWER", exact: true }).click();
  await expect(frame.locator(".diatonic-answer")).toHaveText(/Gm7→C7→FΔ7|Aø7→D7→Gm7/);
});

test('shows all six notation controls in Appearance with previews, apply and cancel',async({page,shot})=>{
  await page.setViewportSize({width:411,height:841});
  await page.emulateMedia({colorScheme:'dark'});
  await page.addInitScript(()=>{
    if(window!==window.top)return;
    localStorage.setItem('music-flashcards:hidden-decks','[]');
    if(!localStorage.getItem('music-flashcards:ii-v-i-keys'))localStorage.setItem('music-flashcards:ii-v-i-keys',JSON.stringify({majorKeys:[0],minorKeys:[]}));
    localStorage.setItem('music-flashcards:layout-help-seen','true');
  });
  await page.goto('/');
  await expect(page.locator('[data-deck="Guitar Fretboard"]')).toBeVisible({timeout:30000});
  await page.locator('[data-deck="II–V–I Progressions"] .deck-study').click({position:{x:20,y:20}});
  const frame=page.frameLocator('iframe[title="card"]');
  await page.getByRole('button',{name:'Deck actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Arrange card',exact:true}).click();
  await expect(page.getByLabel('Major seventh',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Notation setting',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'DONE',exact:true}).click();
  await expect(frame.locator('.diatonic-answer')).toBeHidden();
  await page.getByRole('button',{name:'Deck actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Appearance',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Appearance',exact:true});
  await expect(dialog.getByRole('combobox')).toHaveCount(0);
  await expect(dialog.getByRole('radiogroup')).toHaveCount(5);
  const majorOptions=dialog.getByRole('radiogroup',{name:'Major seventh',exact:true});
  await expect(majorOptions.locator('.choice-preview')).toHaveText(['CΔ7','Cmaj7','CM7']);
  await expect(majorOptions.locator('.chord-symbol')).toHaveCount(3);
  await expect(majorOptions.getByRole('radio',{name:'Δ7',exact:true})).toBeChecked();
  await expect(dialog.getByLabel('Relative-major degree',{exact:true})).toBeChecked();
  await expect(dialog.getByLabel('Notation setting',{exact:true})).toHaveCount(0);
  for(const [label,value,text] of [
    ['Major seventh','maj7','Cmaj7'],['Minor chord','-7','A-7'],
    ['Half-diminished','m7(♭5)','Bm7(♭5)'],['Minor-major seventh','m(maj7)','Am(maj7)'],
    ['Minor degree','i-7','i-7'],
  ]){
    const group=dialog.getByRole('radiogroup',{name:label,exact:true});
    const choice=group.getByRole('radio',{name:value,exact:true});
    await expect(choice.locator('..').locator('.choice-preview')).toHaveText(text);
    await choice.check();
    await expect(choice).toBeChecked();
  }
  await page.evaluate(()=>document.fonts.ready);
  await shot('six-notation-controls-with-previews');
  await dialog.getByRole('button',{name:'CANCEL',exact:true}).click();
  await expect(frame.locator('.diatonic-degree')).toHaveText('iim7→V7→IΔ7');
  await page.getByRole('button',{name:'Deck actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Appearance',exact:true}).click();
  await expect(dialog.getByRole('radiogroup',{name:'Major seventh',exact:true}).getByRole('radio',{name:'Δ7',exact:true})).toBeChecked();
  await expect(dialog.getByRole('radiogroup',{name:'Minor chord',exact:true}).getByRole('radio',{name:'m7',exact:true})).toBeChecked();
  await dialog.getByRole('radiogroup',{name:'Major seventh',exact:true}).getByRole('radio',{name:'maj7',exact:true}).check();
  await dialog.getByRole('button',{name:'APPLY',exact:true}).click();
  await expect(frame.locator('.diatonic-degree')).toHaveText('iim7→V7→Imaj7');
  await expect(frame.locator('.diatonic-answer')).toBeHidden();
  await page.getByRole('button',{name:'SHOW ANSWER',exact:true}).click();
  await expect(frame.locator('.diatonic-answer')).toHaveText('Dm7→G7→Cmaj7');
});

test('previews and saves the minor progression hint independently in Appearance',async({page,shot})=>{
  await page.setViewportSize({width:411,height:841});
  await page.emulateMedia({colorScheme:'dark'});
  await page.addInitScript(()=>{
    if(window!==window.top)return;
    localStorage.setItem('music-flashcards:hidden-decks','[]');
    if(!localStorage.getItem('music-flashcards:ii-v-i-keys')) localStorage.setItem('music-flashcards:ii-v-i-keys',JSON.stringify({majorKeys:[],minorKeys:[0]}));
  });
  await page.goto('/');
  await expect(page.locator('[data-deck="Guitar Fretboard"]')).toBeVisible({timeout:30000});
  await page.locator('[data-deck="II–V–I Progressions"] .deck-study').click({position:{x:20,y:20}});
  const frame=page.frameLocator('iframe[title="card"]');
  const hint=frame.locator('.progression-relative');
  await expect(hint).toBeVisible();
  await page.getByRole('button',{name:'SHOW ANSWER',exact:true}).click();
  await page.getByRole('button',{name:'Deck actions',exact:true}).click();
  await page.getByRole('menuitem',{name:'Appearance',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Appearance',exact:true});
  const toggle=dialog.getByLabel('Relative-major degree',{exact:true});
  await expect(dialog.getByRole('region',{name:'Major',exact:true}).getByRole('checkbox')).toHaveCount(0);
  await expect(dialog.getByRole('region',{name:'Notation settings',exact:true}).getByRole('checkbox')).toHaveCount(0);
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(dialog.getByLabel('Relative-major degree hint preview',{exact:true})).toHaveText('G minor · V7');
  await toggle.scrollIntoViewIfNeeded();
  await shot('relative-major-preview-off');
  await dialog.getByRole('button',{name:'APPLY',exact:true}).click();
  await expect(hint).toBeHidden();
  await expect(frame.locator('.diatonic-answer')).toBeVisible();
  await expect(frame.locator('.diatonic-answer')).toHaveText('Bø7→E7→Am7');
  expect(await page.evaluate(()=>localStorage.getItem('music-flashcards:diatonic-selections'))).toBe(null);
  await page.reload();
  await expect(frame.locator('.diatonic-key')).toHaveText('A minor');
  await expect(hint).toBeHidden();
});
