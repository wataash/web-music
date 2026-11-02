// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import type { WebDeckData } from "./apkg";
import { DIATONIC_CSS } from "./diatonic-deck";
import { CHORD_TONE_DECKS, chordTones, chordToneLabel, type ChordToneKind } from "./chord-tones";
const BASE = 2_000_000_000_000;
const LEGACY_BASE = 1_800_000_000_000;
const LEGACY_QUALITIES = new Set(["Δ7","m7","7","ø7","°7","mΔ7","Δ7(♯5)"]);
const stableId = (guid:string) => parseInt(createHash("sha256").update(guid).digest("hex").slice(0,8),16);
function template(back:boolean):string {
  return '<main class="diatonic-card chord-tones-card'+(back?'':' diatonic-card--front')+'"><div class="diatonic-question question" data-card-part="text"><div class="diatonic-symbol">{{Chord}}</div></div><div class="diatonic-answer answer" data-card-part="text"'+(back?'':' aria-hidden="true"')+'><div class="diatonic-notes">{{Notes}}</div></div></main>';
}
export function createChordTonesWebDeckData():WebDeckData {
  const notes:WebDeckData["notes"][number][]=[];const cards:WebDeckData["cards"][number][]=[];
  const kinds=Object.keys(CHORD_TONE_DECKS) as ChordToneKind[];
  for(const [index,kind] of kinds.entries())for(const [rank,tone] of chordTones[kind].entries()){
    const chord=chordToneLabel(tone.root,tone.quality);
    const legacy=kind==="fourNote"&&LEGACY_QUALITIES.has(tone.quality);
    const guid=legacy ? 'diatonic-chord-notes-'+chord : 'chord-tones-'+kind+'-'+chord;
    const base=legacy?LEGACY_BASE:BASE;const nid=base+100_000+stableId(guid);
    notes.push({id:nid,guid,mid:BASE+10+index,fields:[String(nid),kind,tone.root,tone.quality,chord,tone.notes.map(note=>'<span>'+note+'</span>').join(''),String(tone.count)],tags:'chord-tones'});
    cards.push({id:base+10_000_000_000+stableId(guid),nid,did:BASE+1+index,ord:0,newOrder:rank+1});
  }
  return {models:kinds.map((kind,index)=>({mid:BASE+10+index,name:CHORD_TONE_DECKS[kind],css:DIATONIC_CSS,fieldNames:['Id','Kind','Root','Quality','Chord','Notes','Count'],templates:[{name:'Card 1',ord:0,qfmt:template(false),afmt:template(true)}]})),decks:kinds.map((kind,index)=>({did:BASE+1+index,name:CHORD_TONE_DECKS[kind],hiddenByDefault:true})),notes,cards,media:[],rootDeckNames:kinds.map(kind=>CHORD_TONE_DECKS[kind])};
}
