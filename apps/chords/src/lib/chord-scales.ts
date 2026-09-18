// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { tonesAbove, type ChordDescription, type ChordTone } from "./chords";

// A scale to lay over a chord, as the degrees it adds above the chord's
// root. Tensions are named the way the chord tones are (9, #11, b13), so a
// degree the chord already has reads the same on both.
export type ChordScale = Readonly<{ id: string; name: string; degrees: readonly string[] }>;

const scale = (id: string, name: string, degrees: string): ChordScale => ({ id, name, degrees: degrees.split(" ") });
export const CHORD_SCALES: readonly ChordScale[] = [
  scale("ionian", "Ionian (major)", "R 9 M3 11 P5 13 M7"),
  scale("lydian", "Lydian", "R 9 M3 #11 P5 13 M7"),
  scale("lydian-augmented", "Lydian augmented", "R 9 M3 #11 A5 13 M7"),
  scale("bebop-major", "Bebop major", "R 9 M3 11 P5 b13 13 M7"),
  scale("major-pentatonic", "Major pentatonic", "R 9 M3 P5 13"),
  scale("mixolydian", "Mixolydian", "R 9 M3 11 P5 13 m7"),
  scale("lydian-dominant", "Lydian dominant", "R 9 M3 #11 P5 13 m7"),
  scale("altered", "Altered", "R b9 #9 M3 #11 b13 m7"),
  scale("half-whole-diminished", "Half-whole diminished", "R b9 #9 M3 #11 P5 13 m7"),
  scale("whole-tone", "Whole tone", "R 9 M3 #11 b13 m7"),
  scale("mixolydian-b13", "Mixolydian ♭13", "R 9 M3 11 P5 b13 m7"),
  scale("phrygian-dominant", "Phrygian dominant", "R b9 M3 11 P5 b13 m7"),
  scale("bebop-dominant", "Bebop dominant", "R 9 M3 11 P5 13 m7 M7"),
  scale("blues", "Blues", "R m3 11 d5 P5 m7"),
  scale("dorian", "Dorian", "R 9 m3 11 P5 13 m7"),
  scale("aeolian", "Aeolian (natural minor)", "R 9 m3 11 P5 b13 m7"),
  scale("phrygian", "Phrygian", "R b9 m3 11 P5 b13 m7"),
  scale("melodic-minor", "Melodic minor", "R 9 m3 11 P5 13 M7"),
  scale("harmonic-minor", "Harmonic minor", "R 9 m3 11 P5 b13 M7"),
  scale("minor-pentatonic", "Minor pentatonic", "R m3 11 P5 m7"),
  scale("locrian", "Locrian", "R b9 m3 11 d5 b13 m7"),
  scale("locrian-natural-2", "Locrian ♮2", "R 9 m3 11 d5 b13 m7"),
  scale("whole-half-diminished", "Whole-half diminished", "R 9 m3 11 d5 b13 d7 M7"),
];
const byId = new Map(CHORD_SCALES.map(scale => [scale.id, scale]));
export const chordScale = (id: string | undefined): ChordScale | undefined => id ? byId.get(id) : undefined;

// The scales a player reaches for over each kind of chord, most usual first.
const SUGGESTIONS: Readonly<Record<string, readonly string[]>> = {
  major: ["ionian", "lydian", "bebop-major", "major-pentatonic"],
  "major-augmented": ["lydian-augmented", "whole-tone"],
  dominant: ["mixolydian", "altered", "lydian-dominant", "half-whole-diminished", "whole-tone", "mixolydian-b13", "phrygian-dominant", "bebop-dominant", "blues"],
  "dominant-augmented": ["whole-tone", "altered", "mixolydian-b13"],
  sus: ["mixolydian", "dorian", "minor-pentatonic"],
  minor: ["dorian", "aeolian", "phrygian", "melodic-minor", "minor-pentatonic", "blues"],
  "minor-major": ["melodic-minor", "harmonic-minor"],
  "half-diminished": ["locrian", "locrian-natural-2"],
  diminished: ["whole-half-diminished"],
};
function chordFamily(chord: ChordDescription): string | undefined {
  const has = (label: string) => chord.tones.some(tone => tone.interval === label);
  if (has("m3")) {
    if (has("d7")) return "diminished";
    if (has("d5")) return "half-diminished";
    return has("M7") ? "minor-major" : "minor";
  }
  if (has("M3")) {
    if (has("m7")) return has("A5") ? "dominant-augmented" : "dominant";
    return has("A5") ? "major-augmented" : "major";
  }
  if (has("P4")) return "sus";
  return undefined;
}
export function suggestedScales(chord: ChordDescription): readonly ChordScale[] {
  const family = chordFamily(chord);
  return family ? SUGGESTIONS[family].map(id => byId.get(id)!) : [];
}

// The scale's notes over the chord, without the ones the chord already has.
export function scaleTones(chord: ChordDescription, scale: ChordScale): readonly ChordTone[] {
  if (chord.noChord || chord.unsupported) return [];
  const own = new Set(chord.tones.map(tone => tone.pitchClass));
  return tonesAbove(chord.symbol, scale.degrees).filter(tone => !own.has(tone.pitchClass));
}

// The chord's own tones the scale leaves out, by interval: the fifth under an
// altered scale, say. They are dropped from the board while the scale is on.
export function outsideScale(chord: ChordDescription, scale: ChordScale): ReadonlySet<string> {
  if (chord.noChord || chord.unsupported) return new Set();
  const inScale = new Set(tonesAbove(chord.symbol, scale.degrees).map(tone => tone.pitchClass));
  return new Set(chord.tones.filter(tone => !inScale.has(tone.pitchClass)).map(tone => tone.interval));
}

// The scale written as degrees: "1 ♭9 ♯9 3 ♯11 ♭13 ♭7".
const FORMULA: Readonly<Record<string, string>> = { R: "1", m3: "♭3", M3: "3", d5: "♭5", P5: "5", A5: "♯5", d7: "♭♭7", m7: "♭7", M7: "7" };
export function scaleFormula(scale: ChordScale): string {
  return scale.degrees.map(degree => FORMULA[degree] ?? degree.replace("b", "♭").replace("#", "♯")).join(" ");
}
