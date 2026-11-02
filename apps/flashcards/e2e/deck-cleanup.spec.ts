// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from './fixtures';

test.use({viewport:{width:411,height:841}});
async function ready(page) {
 await page.goto('/');
 await expect(page.locator('[data-deck="Guitar Fretboard"]')).toBeVisible({timeout:30000});
 await expect(page.locator('.preparing,.importing')).toHaveCount(0,{timeout:30000});
}

test('marks each changed deck row without reset buttons and saves or discards toggles',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'CHOOSE DECKS',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Decks',exact:true});
 await expect(dialog.locator('li.modified')).toHaveCount(0);
 await expect(dialog.getByRole('button',{name:/Reset/})).toHaveCount(0);
 await expect(dialog.locator('header button')).toHaveCount(0);
 const guitar=dialog.getByRole('checkbox',{name:'Guitar Fretboard',exact:true});
 await guitar.uncheck();await expect(dialog.locator('li.modified')).toHaveCount(3);
 await dialog.getByRole('checkbox',{name:'Position → Note',exact:true}).check();
 await expect(dialog.locator('li.modified')).toHaveCount(1);
 const other=dialog.getByRole('checkbox',{name:'Note → Positions',exact:true});
 await expect(other.locator('xpath=ancestor::li')).toHaveClass(/\bmodified\b/);
 await other.check();await expect(dialog.locator('li.modified')).toHaveCount(0);
 await other.uncheck();await dialog.getByRole('button',{name:'APPLY',exact:true}).click();
 await page.getByRole('button',{name:'CHOOSE DECKS',exact:true}).click();
 await expect(dialog.locator('li.modified')).toHaveCount(1);
 await other.check();await page.goBack();await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'CHOOSE DECKS',exact:true}).click();
 await expect(other).not.toBeChecked();await expect(dialog.locator('li.modified')).toHaveCount(1);
 await other.check();await dialog.getByRole('button',{name:'APPLY',exact:true}).click();
 expect(await page.evaluate(()=>localStorage.getItem('music-flashcards:hidden-decks'))).toBeNull();
});

test('browser Back dismisses settings, backup and confirmation without their close icons',async({page})=>{
 await ready(page);
 for(const action of ['What to ask','Reset study progress']) {
  await page.locator('[data-deck="Guitar Fretboard::Position → Note"]').click({button:'right'});
  await page.getByRole('menuitem',{name:action,exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('header button')).toHaveCount(0);
  await page.goBack();await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-deck="Guitar Fretboard"]')).toBeVisible();
 }
 await page.getByRole('button',{name:'BACKUP',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('dialog').locator('header button')).toHaveCount(0);
 await page.goBack();await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('updating the diatonic bundle removes the combined deck and retains the remaining review state',async({page})=>{
 await ready(page);
 const result=await page.evaluate(async()=>{
  const path='/src/lib/db.ts';const {db,importDeckData}=await import(path);
  const deck=(await(await fetch('/__dev_deck/diatonic-chords')).json()).deck;
  const keptCard=deck.cards[0];const keptNote=deck.notes.find(n=>n.id===keptCard.nid);
  const oldNote={...keptNote,id:999001,guid:'diatonic-degree-notes-test',mid:999003};
  const oldCard={...keptCard,id:999002,nid:oldNote.id,did:999004};
  await importDeckData({...deck,notes:[...deck.notes,oldNote],cards:[...deck.cards,oldCard],models:[...deck.models,{...deck.models[0],mid:999003}],decks:[...deck.decks.map(d=>({...d,name:'Diatonic Chords::Key + Degree → Chord'})),{did:999004,name:'Diatonic Chords::Key + Degree → Chord + Notes'}]});
  const key=keptNote.guid+'#0';const state={key,fsrs:{state:2,reps:9,due:Date.now()+86400000},due:Date.now()+86400000,stateKind:'review',introducedDay:1,updatedAt:1234,updatedBy:'test'};
  await db.states.put(state);await importDeckData(deck);
  return{state,kept:await db.states.get(key),names:(await db.decks.toArray()).map(d=>d.name),removed:await db.notes.get(oldNote.id)};
 });
 expect(result.kept).toEqual(result.state);expect(result.removed).toBeUndefined();
 expect(result.names).toContain('Diatonic Chords');
 expect(result.names).not.toContain('Diatonic Chords::Key + Degree → Chord');
 expect(result.names).not.toContain('Diatonic Chords::Key + Degree → Chord + Notes');
 await page.reload();await page.getByRole('button',{name:'CHOOSE DECKS',exact:true}).click();
 await expect(page.getByRole('checkbox',{name:'Key + Degree → Chord + Notes',exact:true})).toHaveCount(0);
});
