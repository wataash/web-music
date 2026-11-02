// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import{describe,it,expect}from'vitest';import{createHash}from'node:crypto';
import{CHORD_TONE_DECKS,chordTones,chordToneLabel}from'./chord-tones';import{createChordTonesWebDeckData}from'./chord-tones-deck';import{DEFAULT_CHORD_NOTATION}from'./diatonic';import{CHORD_TONE_SOURCE}from'./chord-tone-frequency';
describe('independent chord-tone decks',()=>{
 it('contains only three or four distinct tones and ranks by expanded Jazz 1460 frequency',()=>{
  expect(CHORD_TONE_SOURCE.songs).toBe(1460);expect(CHORD_TONE_SOURCE.occurrences).toBe(70794);
  for(const kind of ['triads','fourNote'] as const){const rows=chordTones[kind];expect(rows.length).toBeGreaterThan(40);for(const [i,row] of rows.entries()){expect(row.notes).toHaveLength(kind==='triads'?3:4);expect(new Set(row.notes).size).toBe(row.notes.length);expect(row.count).toBeGreaterThan(0);if(i)expect(rows[i-1].count).toBeGreaterThanOrEqual(row.count);}}
  expect(chordTones.triads[0]).toMatchObject({root:'C',quality:'',count:6570});expect(chordTones.fourNote[0]).toMatchObject({root:'C',quality:'7',count:4139});
 });
 it('generates two standalone decks and preserves existing four-note review keys and IDs',()=>{
  const data=createChordTonesWebDeckData();expect(data.rootDeckNames).toEqual(Object.values(CHORD_TONE_DECKS));expect(data.decks).toHaveLength(2);expect(data.decks.every(d=>d.hiddenByDefault)).toBe(true);
  const guid='diatonic-chord-notes-Em7';const oldId=parseInt(createHash('sha256').update(guid).digest('hex').slice(0,8),16);
  const em=data.notes.find(n=>n.guid===guid)!;expect(em.id).toBe(1_800_000_100_000+oldId);expect(data.cards.find(c=>c.nid===em.id)!.id).toBe(1_810_000_000_000+oldId);expect(em.fields[5]).toBe('<span>E</span><span>G</span><span>B</span><span>D</span>');
  expect(new Set(data.notes.map(n=>n.id)).size).toBe(data.notes.length);expect(new Set(data.cards.map(c=>c.id)).size).toBe(data.cards.length);expect(new Set(data.notes.map(n=>n.guid)).size).toBe(data.notes.length);
  for(const deck of data.decks){const cards=data.cards.filter(c=>c.did===deck.did);expect(cards.map(c=>c.newOrder)).toEqual(cards.map((_,i)=>i+1));}
 });
 it('uses the shared notation preferences without changing chord tones',()=>{
  const custom={...DEFAULT_CHORD_NOTATION,majorSeventh:'maj7',minor:'-7',halfDiminished:'m7♭5'} as const;
  expect(chordToneLabel('A','m',custom)).toBe('A-');expect(chordToneLabel('E','m7',custom)).toBe('E-7');expect(chordToneLabel('F','Δ7',custom)).toBe('Fmaj7');expect(chordToneLabel('B','ø7',custom)).toBe('Bm7♭5');expect(chordToneLabel('C','°Δ7',custom)).toBe('C°maj7');
 });
});
