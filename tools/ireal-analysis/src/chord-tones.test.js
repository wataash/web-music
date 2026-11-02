// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import {describe,it} from 'node:test';import assert from 'node:assert/strict';
import{chordToneFrequencies}from'./chord-tones.js';
const playlist=chords=>({songs:[{music:{measures:[chords]}}]});
describe('chord-tone frequencies',()=>{
 it('merges tensions and slash basses while preserving distinct core qualities',()=>{
  const result=chordToneFrequencies(playlist(['C7','C9','C7/E','C7#5','C^7','C6','C69',null]));
  assert.equal(result.occurrences,7);assert.equal(result.triads.find(c=>c.root==='C'&&c.quality==='').count,6);
  assert.deepEqual(result.fourNote.find(c=>c.quality==='7'),{root:'C',quality:'7',notes:['C','E','G','B♭'],count:3});
  assert.equal(result.fourNote.find(c=>c.quality==='6').count,2);
  assert.deepEqual(result.fourNote.find(c=>c.quality==='7(♯5)').notes,['C','E','G♯','B♭']);
 });
 it('keeps minor, diminished, suspended and augmented spellings',()=>{
  const result=chordToneFrequencies(playlist(['Bbo7','Bh7','A-^7','F7sus','C+']));
  assert.deepEqual(result.fourNote.find(c=>c.root==='B♭').notes,['B♭','D♭','F♭','A♭♭']);
  assert.deepEqual(result.fourNote.find(c=>c.quality==='mΔ7').notes,['A','C','E','G♯']);
  assert.deepEqual(result.triads.find(c=>c.quality==='sus4').notes,['F','B♭','C']);
  assert.deepEqual(result.triads.find(c=>c.quality==='aug').notes,['C','E','G♯']);
 });
 it('does not invent a missing third or fifth and orders ties deterministically',()=>{
  const result=chordToneFrequencies(playlist(['C5','C7alt','G7','F7']));
  assert.deepEqual(result.fourNote.map(c=>c.root),['F','G']);assert.equal(result.triads.length,2);
 });
});
