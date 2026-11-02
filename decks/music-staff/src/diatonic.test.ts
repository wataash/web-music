// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import { MAJOR_KEYS } from "@web-music/music-staff-core";
import { DIATONIC_VARIANTS, QUALITY_INTERVALS, SCALE_STEPS, diatonicChord, diatonicOrigin, diatonicDegreeLabel, diatonicKey, defaultDiatonicSelection, MINOR_DEGREE_NOTATIONS, parseMinorDegreeNotation, CHORD_NOTATION_OPTIONS, DEFAULT_CHORD_NOTATION, parseChordNotation, chordQualityLabel, type ChordQuality, type Scale } from "./diatonic";
import { createDiatonicWebDeckData } from "./diatonic-deck";

const names = (scale: Scale) => DIATONIC_VARIANTS.filter(v => v.scales.includes(scale)).sort((a,b) => a.degree-b.degree).map(v => diatonicChord(0,v));
describe("diatonic seventh chords", () => {
  it("keeps chord spelling choices independent of pitch content and minor Roman style", () => {
    const qualities = { majorSeventh: "Δ7", minor: "m7", halfDiminished: "ø7", minorMajorSeventh: "mΔ7" } as const;
    for (const option of CHORD_NOTATION_OPTIONS) for (const value of option.values) {
      const notation = parseChordNotation({ [option.key]: value });
      const quality = qualities[option.key];
      expect(chordQualityLabel(quality, notation)).toBe(value);
      for (const other of CHORD_NOTATION_OPTIONS.filter(other => other.key !== option.key)) {
        expect(chordQualityLabel(qualities[other.key], notation)).toBe(DEFAULT_CHORD_NOTATION[other.key]);
      }
      for (const variant of DIATONIC_VARIANTS) {
        expect(diatonicChord(0, variant, "im7", notation).notes).toEqual(diatonicChord(0, variant).notes);
        expect(diatonicChord(0, variant, "im7", notation).chord).toBe(diatonicChord(0, variant).chord);
      }
    }
    const minor = DIATONIC_VARIANTS.find(v => v.mode === "minor" && v.quality === "m7" && v.degree === 0)!;
    expect(diatonicDegreeLabel(minor, "im7", { ...DEFAULT_CHORD_NOTATION, minor: "-7" })).toBe("im7");
    expect(chordQualityLabel("Δ7(♯5)", { ...DEFAULT_CHORD_NOTATION, majorSeventh: "maj7" })).toBe("maj7(♯5)");
    for (const quality of ["7", "°7"] as ChordQuality[]) expect(chordQualityLabel(quality)).toBe(quality);
    expect(parseChordNotation({ majorSeventh: "maj7", minor: "bad", halfDiminished: null })).toEqual({ ...DEFAULT_CHORD_NOTATION, majorSeventh: "maj7" });
    expect(parseChordNotation(null)).toEqual(DEFAULT_CHORD_NOTATION);
  });
  it("formats minor degrees in five styles without changing the chord spelling", () => {
    const tonic = DIATONIC_VARIANTS.find(v => v.mode === "minor" && v.degree === 0 && v.quality === "m7")!;
    for (const style of MINOR_DEGREE_NOTATIONS) {
      expect(diatonicDegreeLabel(tonic, style)).toBe(style);
      const chord = diatonicChord(0, tonic, style);
      expect(chord.chord).toBe("Am7");
      expect(chord.notes).toEqual(["A", "C", "E", "G"]);
      expect(chord.relative).toBe(`${style.replace(/i/i, style.startsWith("i") ? "vi" : "VI")} in C major`);
    }
    expect(parseMinorDegreeNotation(null)).toBe("im7");
    expect(parseMinorDegreeNotation("i7")).toBe("i7");
    expect(parseMinorDegreeNotation("bad")).toBe("im7");
    for (const variant of DIATONIC_VARIANTS.filter(v => !v.quality.startsWith("m"))) {
      for (const style of MINOR_DEGREE_NOTATIONS) expect(diatonicDegreeLabel(variant, style)).toBe(variant.label);
    }
  });
  it("spells all chords in C major and all three forms of A minor", () => {
    expect(DIATONIC_VARIANTS.filter(v=>v.mode==="major").map(v=>v.label)).toEqual(["IΔ7", "iim7", "iiim7", "IVΔ7", "V7", "vim7", "viiø7"]);
    expect(DIATONIC_VARIANTS.filter(v=>v.scales.includes("natural")).map(v=>v.label)).toEqual(["im7", "iiø7", "♭IIIΔ7", "ivm7", "vm7", "♭VIΔ7", "♭VII7"]);
    expect(names("major").map(c => c.chord)).toEqual(["CΔ7", "Dm7", "Em7", "FΔ7", "G7", "Am7", "Bø7"]);
    expect(names("natural").map(c => c.chord)).toEqual(["Am7", "Bø7", "CΔ7", "Dm7", "Em7", "FΔ7", "G7"]);
    expect(names("harmonic").map(c => c.chord)).toEqual(["AmΔ7", "Bø7", "CΔ7(♯5)", "Dm7", "E7", "FΔ7", "G♯°7"]);
    expect(names("melodic").map(c => c.chord)).toEqual(["AmΔ7", "Bm7", "CΔ7(♯5)", "D7", "E7", "F♯ø7", "G♯ø7"]);
    expect(names("harmonic")[6].notes).toEqual(["G♯", "B", "D", "F"]);
    expect(names("melodic")[6].notes).toEqual(["G♯", "B", "D", "F♯"]);
    expect(names("harmonic")[2].notes).toEqual(["C", "E", "G♯", "B"]);
    expect(Object.keys(SCALE_STEPS)).toHaveLength(4);
  });
  it("uses the correct key and spelling, including double accidentals", () => {
    const tonic = DIATONIC_VARIANTS.find(v => v.mode === "major" && v.degree === 0)!;
    expect(diatonicChord(-1,tonic)).toMatchObject({ chord:"FΔ7", notes:["F","A","C","E"] });
    expect(diatonicChord(-7,tonic).notes).toEqual(["C♭","E♭","G♭","B♭"]);
    const leading = DIATONIC_VARIANTS.find(v => v.quality === "°7")!;
    expect(diatonicKey(7,"minor")).toBe("A♯");
    expect(diatonicChord(7,leading).notes).toEqual(["G♯♯","B♯","D♯","F♯"]);
    const dominant = DIATONIC_VARIANTS.find(v => v.mode === "minor" && v.degree === 4 && v.quality === "7")!;
    expect(diatonicChord(-2,dominant)).toMatchObject({ tonic:"G", chord:"D7", relative:"III7 in B♭ major" });
  });
  it("constructs four correctly spaced chord tones for every key and variant", () => {
    const natural = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
    const pitch = (n:string) => (natural[n[0] as keyof typeof natural] + [...n.slice(1)].reduce((sum,c)=>sum+(c==="♯"?1:-1),0) + 24)%12;
    for (const key of MAJOR_KEYS) for (const variant of DIATONIC_VARIANTS) {
      const {notes} = diatonicChord(key.fifths, variant);
      expect(notes.map(n=>(pitch(n)-pitch(notes[0])+12)%12)).toEqual(QUALITY_INTERVALS[variant.quality]);
      expect(new Set(notes.map(n=>n[0])).size).toBe(4);
    }
  });
  it("starts minor on natural chords plus the dominant and fully diminished leading chord", () => {
    const ids = defaultDiatonicSelection().minorChords;
    expect(ids).toHaveLength(9);
    expect(DIATONIC_VARIANTS.filter(v => v.mode === "minor")).toHaveLength(15);
    expect(ids).toEqual(expect.arrayContaining(DIATONIC_VARIANTS.filter(v=>v.scales.includes("natural") || v.quality==="°7" || (v.mode==="minor" && v.degree===4 && v.quality==="7")).map(v=>v.id)));
    expect(ids.some(id=>id.endsWith("mΔ7"))).toBe(false);
  });
  it("keeps one context deck with stable model IDs and readable source labels", () => {
    const data=createDiatonicWebDeckData();expect(data.decks).toEqual([{did:1_800_000_000_101,name:"Diatonic Chords"}]);expect(data.models.map(m=>m.mid)).toEqual([1_800_000_000_000]);expect(data.notes.every(n=>n.fields[1]==='degree-chord')).toBe(true);
    expect(data.models[0].templates[0].afmt).not.toContain('{{Notes}}');
    for(const variant of DIATONIC_VARIANTS){const source=diatonicOrigin(variant);const note=data.notes.find(n=>JSON.parse(n.fields[7])[0].variant===variant.id)!;expect(note.fields[8]).toBe(source);if(variant.mode==='major'||variant.scales.includes('natural'))expect(source).toBe('');else {expect(source).toContain('minor');for(const scale of variant.scales)expect(source.toLowerCase()).toContain(scale);}}
    expect(new Set(data.notes.map(n=>n.id)).size).toBe(data.notes.length);expect(new Set(data.cards.map(n=>n.id)).size).toBe(data.cards.length);
  });
});
