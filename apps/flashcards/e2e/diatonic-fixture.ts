// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import type { Page } from '@playwright/test';
import { expect } from './fixtures';

// Typography tests need a specific first card, independently of study filters.
export async function preferDiatonicVariant(page: Page, variant: string, fifths: number): Promise<void> {
  await expect.poll(async () => page.evaluate(async ({variant,fifths}) => {
    const path='/src/lib/db.ts';
    const {db}=await import(path);
    const notes=await db.notes.toArray();
    const ids=notes.filter((n:{tags:string;fields:string[]})=>n.tags.split(/\s+/).includes('diatonic-chords') && JSON.parse(n.fields[7]).some((c:{fifths:number;variant:string})=>c.fifths===fifths && c.variant===variant)).map((n:{id:number})=>n.id);
    if(ids.length===0)return 0;
    return db.cards.filter((card:{nid:number})=>ids.includes(card.nid)).modify({newOrder:-1});
  },{variant,fifths}),{timeout:30000}).toBeGreaterThan(0);
}
