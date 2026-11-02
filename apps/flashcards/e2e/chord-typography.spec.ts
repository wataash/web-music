// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from './fixtures';
import { preferDiatonicVariant } from './diatonic-fixture';
import { DIATONIC_VARIANTS, parseDiatonicSelections } from '../src/lib/diatonic-selection';

for (const example of [
  { name:'B-flat major', fifths:-2, mode:'major', quality:'Δ7', answer:'B♭Δ7' },
  { name:'F-sharp major', fifths:6, mode:'major', quality:'Δ7', answer:'F♯Δ7' },
  { name:'G-sharp minor-major', fifths:5, mode:'minor', quality:'mΔ7', answer:'G♯mΔ7' },
] as const) {
  test(`engraves ${example.name} without moving the question`, async ({ page, shot }) => {
    await page.setViewportSize({width:411,height:841});
    await page.emulateMedia({colorScheme:'dark'});
    const selections=parseDiatonicSelections(null);
    const variant=DIATONIC_VARIANTS.find(v=>v.mode===example.mode && v.degree===0 && v.quality===example.quality)!;
    const saved={...selections,'degree-chord':{...selections['degree-chord'],majorKeys:example.mode==='major'?[example.fifths]:[],minorKeys:example.mode==='minor'?[example.fifths]:[],minorChords:[variant.id]}};
    await page.addInitScript(value=>{
      if(window!==window.top) return;
      localStorage.setItem('music-flashcards:hidden-decks','[]');
      localStorage.setItem('music-flashcards:diatonic-selections',JSON.stringify(value));
    },saved);
    const imported=page.waitForEvent('console',{predicate:m=>m.text().startsWith('[Music Flashcards] automatically imported')});
    await page.goto('/');
    await imported;
    await preferDiatonicVariant(page,variant.id,example.fifths);
    await page.locator('[data-deck="Diatonic Chords"] .deck-study').click({position:{x:20,y:20}});
    const frame=page.frameLocator('iframe[title="card"]');
    const question=frame.locator('.diatonic-question');
    await expect(question.locator('.diatonic-degree .chord-extension')).toBeVisible();
    const before=await question.boundingBox();
    await page.getByRole('button',{name:'SHOW ANSWER',exact:true}).click();
    const answer=frame.locator('.diatonic-answer');
    await expect(answer).toHaveText(example.answer);
    const extension=answer.locator('.chord-extension');
    await expect(extension).toBeVisible();
    expect(await question.boundingBox()).toEqual(before);
    const metrics=await answer.locator('.chord-symbol').evaluate(el=>{
      const ext=el.querySelector('.chord-extension')!;
      return {root:parseFloat(getComputedStyle(el).fontSize),extension:parseFloat(getComputedStyle(ext).fontSize),top:parseFloat(getComputedStyle(ext).top)};
    });
    expect(metrics.extension).toBe(metrics.root);
    expect(Number.isNaN(metrics.top) || metrics.top === 0).toBe(true);
    await expect(answer.locator('.chord-symbol')).toHaveCSS('font-family', /Flashcard Chords/);
    await expect(answer.locator('.chord-symbol')).toHaveCSS('font-weight', '400');
    await expect(answer.locator('.glyph')).toHaveCount(0);
    expect(await answer.evaluate(async () => {
      await document.fonts.ready;
      return ['Flashcard Chords','Flashcard Chord Symbols'].every(family=>[...document.fonts].some(face=>face.family.replaceAll('"','')===family && face.status==='loaded'));
    })).toBe(true);
    await shot('engraved-answer');
  });
}
