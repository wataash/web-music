// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { DIATONIC_VARIANTS, diatonicDisplayFields, diatonicDeckSetting, includesDiatonicCard, parseDiatonicSelections } from "./diatonic-selection";
import { createDiatonicWebDeckData } from "../../../../decks/music-staff/src/diatonic-deck";

describe("diatonic selection", () => {
  it("defaults every direction to C/F/B-flat major and A/D minor without replacing saved choices", () => {
    const defaults=parseDiatonicSelections(null);
    for(const selection of Object.values(defaults)){
      expect(selection.majorKeys).toEqual([0,-1,-2]);
      expect(selection.minorKeys).toEqual([0,-1]);
    }
    const saved=parseDiatonicSelections({'degree-chord':{majorKeys:[0],minorKeys:[0]},'degree-notes':{majorKeys:[],minorKeys:[]}});
    expect(saved['degree-chord']).toMatchObject({majorKeys:[0],minorKeys:[0]});
    expect(saved).not.toHaveProperty('degree-notes');
  });
  it("renders the chosen style from context even for previously generated labels", () => {
    const variant = DIATONIC_VARIANTS.find(v => v.mode === "minor" && v.degree === 0 && v.quality === "m7")!;
    const fields = ["", "degree-chord", "A minor", "i7", "Am7", "", "vi7 in C major", JSON.stringify([{ fifths: 0, variant: variant.id }])];
    const note = { tags: "diatonic-chords", fields };
    expect(diatonicDisplayFields(note, "im7")).toEqual({ Chord: "Am7", Degree: "im7", RelativeDegree: "vim7 in C major" });
    expect(diatonicDisplayFields(note, "I-7")).toEqual({ Chord: "Am7", Degree: "I-7", RelativeDegree: "VI-7 in C major" });
    expect(diatonicDisplayFields({ ...note, fields: ["", "chord-notes"] }, "im7")).toEqual({});
  });
  it("filters the selected keys and optional chords", () => {
    const defaults = parseDiatonicSelections(null);
    const selections = { ...defaults, "degree-chord": { ...defaults["degree-chord"], majorKeys: [-1], minorKeys: [] } };
    const notes = createDiatonicWebDeckData().notes;
    const f = notes.find(n=>n.fields[1]==="degree-chord" && n.fields[2]==="F major" && n.fields[3]==="IΔ7")!;
    const c = notes.find(n=>n.fields[1]==="degree-chord" && n.fields[2]==="C major" && n.fields[3]==="IΔ7")!;
    expect(includesDiatonicCard(f,selections)).toBe(true);
    expect(includesDiatonicCard(c,selections)).toBe(false);
    const leading=notes.find(n=>n.fields[1]==="degree-chord" && n.fields[2]==="A minor" && n.fields[3]==="viiø7")!;
    expect(includesDiatonicCard(leading,defaults)).toBe(false);
    const variant=DIATONIC_VARIANTS.find(v=>v.mode==="minor" && v.label==="viiø7")!;
    expect(includesDiatonicCard(leading,{...defaults,"degree-chord":{...defaults["degree-chord"],minorChords:[variant.id]}})).toBe(true);
  });
  it("preserves empty key selections, restores required chords and validates saved values", () => {
    const value=parseDiatonicSelections({"degree-chord":{ majorKeys:[],minorKeys:[-2,100,"0"], majorChords:["bad"], minorChords:[], relativeMajor:true }});
    expect(value["degree-chord"]).toMatchObject({ majorKeys:[],minorKeys:[-2],minorChords:DIATONIC_VARIANTS.filter(v=>v.scales.includes("natural")).map(v=>v.id),relativeMajor:true });
    expect(value["degree-chord"]).not.toHaveProperty("majorChords");
    expect(parseDiatonicSelections(JSON.parse(JSON.stringify(value)))).toEqual(value);
    expect(includesDiatonicCard({fields:[],tags:""},value)).toBe(true);
    expect(diatonicDeckSetting("Diatonic Chords")?.directions).toHaveLength(1);
    expect(diatonicDeckSetting("Diatonic Chords::Chord → Notes")).toBeNull();
  });
  it("always includes every major and natural-minor variant for selected keys in all directions", () => {
    const selected=parseDiatonicSelections(Object.fromEntries(["degree-chord"].map(direction=>[direction,{majorKeys:[0],minorKeys:[0],majorChords:[],minorChords:[]}])));
    const notes=createDiatonicWebDeckData().notes;
    for(const variant of DIATONIC_VARIANTS.filter(v=>v.mode==="major" || v.scales.includes("natural"))) {
      for(const direction of ["degree-chord"] as const) {
        const note=notes.find(n=>n.fields[1]===direction && JSON.parse(n.fields[7]).some((c:{fifths:number;variant:string})=>c.fifths===0 && c.variant===variant.id))!;
        expect(includesDiatonicCard(note,selected)).toBe(true);
        expect(includesDiatonicCard(note,{...selected,[direction]:{...selected[direction],majorKeys:[],minorKeys:[]}})).toBe(false);
      }
    }
  });
});
