// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { it, expect } from "vitest";
import { MAJOR_KEYS } from "@web-music/music-staff-core";
import { DEFAULT_CHORD_NOTATION, diatonicKey } from "./diatonic";
import { iiVIProgression, parseProgressionSelection } from "./progression";
import { createProgressionWebDeckData } from "./progression-deck";
it("spells major and minor II–V–I progressions with a dominant V and minor-seventh i", () => {
  expect(iiVIProgression(0, "major").chords).toEqual(["Dm7", "G7", "CΔ7"]);
  expect(iiVIProgression(-1, "major").chords).toEqual(["Gm7", "C7", "FΔ7"]);
  const a = iiVIProgression(0, "minor");
  expect(a.chords).toEqual(["Bø7", "E7", "Am7"]);
  expect(a.relative).toBe("(viiø7 → III7 → vim7\nin C major)");
  expect(iiVIProgression(-2, "minor").relative).toBe("(viiø7 → III7 → vim7\nin B♭ major)");
  expect(iiVIProgression(0, "major").relative).toBe("");
  expect(a.notes).toEqual([["B", "D", "F", "A"], ["E", "G♯", "B", "D"], ["A", "C", "E", "G"]]);
  expect(iiVIProgression(-2, "minor").chords).toEqual(["Aø7", "D7", "Gm7"]);
  for (const key of MAJOR_KEYS) for (const mode of ["major", "minor"] as const) {
    const result = iiVIProgression(key.fifths, mode);
    expect(result.key).toBe(`${diatonicKey(key.fifths, mode)} ${mode}`);
    expect(result.notes).toHaveLength(3);
    expect(result.notes.every(notes => notes.length === 4 && new Set(notes.map(note => note[0])).size === 4)).toBe(true);
  }
});
it("shares notation preferences without changing any chord tone", () => {
  const result = iiVIProgression(0, "minor", "I-7", { ...DEFAULT_CHORD_NOTATION, minor: "-7", halfDiminished: "m7(♭5)" });
  expect(result.chords).toEqual(["Bm7(♭5)", "E7", "A-7"]);
  expect(result.degrees).toEqual(["iim7(♭5)", "V7", "I-7"]);
  expect(result.relative).toBe("(viim7(♭5) → III7 → VI-7\nin C major)");
  expect(result.notes).toEqual(iiVIProgression(0, "minor").notes);
});
it("creates one stable card per key and mode with a reserved answer area", () => {
  const data = createProgressionWebDeckData();
  expect(data.notes).toHaveLength(MAJOR_KEYS.length * 2);
  expect(new Set(data.notes.map(note => note.guid)).size).toBe(data.notes.length);
  expect(new Set(data.cards.map(card => card.id)).size).toBe(data.cards.length);
  expect(data.decks[0].hiddenByDefault).not.toBe(true);
  expect(data.models[0].templates[0].qfmt).toContain('diatonic-card--front');
  expect(data.models[0].templates[0].afmt).not.toContain('diatonic-card--front');
  expect(data.models[0].fieldNames).toContain("RelativeDegree");
  expect(data.models[0].templates[0].qfmt).toContain("{{RelativeDegree}}");
});
it("validates independent major and minor key selections, including empty ranges", () => {
  const defaults = parseProgressionSelection(null);
  for (const keys of [defaults.majorKeys, defaults.minorKeys]) {
    expect([...keys].sort((a,b)=>a-b)).toEqual([-5,-4,-3,-2,-1,0,1,2,3,4,5]);
  }
  expect(defaults.relativeMajor).toBe(true);
  expect(parseProgressionSelection({majorKeys:[0],minorKeys:[]})).toEqual({majorKeys:[0],minorKeys:[],relativeMajor:true});
  expect(parseProgressionSelection({majorKeys:[0],minorKeys:[],relativeMajor:false})).toEqual({majorKeys:[0],minorKeys:[],relativeMajor:false});
  const selected = parseProgressionSelection({ majorKeys: [], minorKeys: [-2, -2, 999, "0"] });
  expect(selected).toEqual({ majorKeys: [], minorKeys: [-2], relativeMajor:true });
});
