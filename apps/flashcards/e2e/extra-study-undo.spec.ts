// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import {test,expect} from './fixtures';
test('undo and redo restore extra reviews and session totals', async ({page,shot})=>{
const imported=page.waitForEvent('console',{predicate:m=>m.text().startsWith('[Music Flashcards] automatically imported')});
await page.goto('http://localhost:17381/');await imported;
await page.evaluate(async()=>{
 const {db}=await import('/src/lib/db.ts');const s=await import('/src/lib/scheduler.ts');
 const deck=await db.decks.where('name').equals('II–V–I Progressions').first();
 const cards=await db.cards.where('did').equals(deck.did).toArray();const now=new Date();const card=s.scheduleAnswer(s.newEmptyCard(now),s.Rating.Easy,now).card;
 await db.states.bulkPut(cards.map(c=>({key:c.key,fsrs:s.serializeFsrsCard(card),due:card.due.getTime(),stateKind:'review',introducedDay:0,updatedAt:now.getTime(),updatedBy:'seed'})));
});
await page.locator('[data-deck="II–V–I Progressions"] .deck-study').click();await expect(page.getByText('Done for today',{exact:true})).toBeVisible();
async function action(name: string){await page.getByRole('button',{name:'Deck actions',exact:true}).click();await page.getByRole('menuitem',{name,exact:true}).click();}
await action('Study more today');
await page.locator('[aria-label="Review ahead"]').getByRole('button',{name:'+5',exact:true}).click();await page.getByRole('button',{name:'ADD 5',exact:true}).click();
for(let i=0;i<5;i++){await expect(page.frameLocator('iframe[title="card"]').locator('.diatonic-card')).toBeVisible();await page.getByRole('button',{name:'SHOW ANSWER',exact:true}).click();await page.getByRole('button',{name:/EASY/}).click();}
await expect(page.getByText('Done for today',{exact:true})).toBeVisible();
await action('Undo Answer Card');await expect(page.locator('.undone')).toHaveText('Answer Card undone');

await expect(page.getByRole('button',{name:'SHOW ANSWER',exact:true})).toBeVisible();
await expect(page.locator('.count.due')).toHaveText('1');
await shot('extra-review-restored-by-undo');
await action('Redo Answer Card');
await expect(page.getByText('Done for today',{exact:true})).toBeVisible();
await expect(page.locator('.session-summary')).toHaveText('0 new · 5 review');
await action('Undo Answer Card');
await action('Undo Answer Card');
await expect(page.locator('.count.due')).toHaveText('2');
await action('Redo Answer Card');
await expect(page.locator('.count.due')).toHaveText('1');
await page.getByRole('button',{name:'SHOW ANSWER',exact:true}).click();
await page.getByRole('button',{name:/EASY/}).click();
await expect(page.getByText('Done for today',{exact:true})).toBeVisible();
await expect(page.locator('.session-summary')).toHaveText('0 new · 5 review');
await action('Undo Answer Card');
await expect(page.getByRole('button',{name:'SHOW ANSWER',exact:true})).toBeVisible();
});
