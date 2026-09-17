import { describe, it, expect } from "vitest";
import type { NoteRow } from "./db";
import { diverseIndex, introductionGroup, similarity } from "./queue-diversity";

function note(root: string, degree: string, answer: string, axis = "interval"): NoteRow {
  return { id: 1, guid: `${root}-${degree}`, mid: 1, pkg: "Intervals", tags: "",
    fields: ["id", axis, root, degree, `${root} → ${answer}`, axis === "identification" ? degree : answer, "basic", "", answer] };
}

describe("queue diversity", () => {
  it("prefers different answers and roots while keeping enharmonic answers equivalent", () => {
    const recent = note("C", "A5", "G#");
    expect(similarity(note("C", "m6", "Ab"), [recent])).toBe(similarity(note("C", "m6", "G#"), [recent]));
    expect(diverseIndex([note("C", "m6", "Ab"), note("D", "P5", "A")], [recent])).toBe(1);
    expect(similarity(note("C", "m6", "Ab", "identification"), [note("C", "A5", "G#", "identification")])).toBeGreaterThan(0);
  });
  it("uses only the last three answers, with recent ones weighted more strongly", () => {
    const a = note("C", "P5", "G"), b = note("D", "M3", "F#");
    expect(similarity(a, [a, b])).toBeGreaterThan(similarity(a, [b, a]));
    expect(similarity(a, [b, b, b, a])).toBe(similarity(a, [b, b, b]));
  });
  it("breaks ties randomly and handles a single candidate or no history", () => {
    const a = note("D", "P5", "A"), b = note("E", "P5", "B"), recent = note("C", "P5", "G");
    expect(diverseIndex([a, b], [recent], () => 0)).toBe(0);
    expect(diverseIndex([a, b], [recent], () => 0.99)).toBe(1);
    expect(diverseIndex([a], [a])).toBe(0);
    expect(diverseIndex([a, b], [])).toBe(0);
  });
  it("keeps a staff card from following its neighbour or its mirror in the ledger lines", () => {
    const staff = (clef: string, pitch: string, direction = "staff-to-note"): NoteRow => ({
      id: 1, guid: `${clef}-${pitch}`, mid: 1, pkg: "Music Staff", tags: `clef::${clef} direction::${direction}`,
      fields: ["id", clef, pitch, pitch[0], pitch[1], "", pitch, "", "", "", ""],
    });
    // Treble: +1.5 is B5, -1.5 is B3; +3/+3.5 are E6/F6, -3/-3.5 are F3/E3.
    expect(similarity(staff("treble", "B3"), [staff("treble", "B5")])).toBeGreaterThan(0);
    expect(similarity(staff("treble", "E3"), [staff("treble", "F6")])).toBeGreaterThan(0);
    expect(similarity(staff("treble", "F3"), [staff("treble", "E6")])).toBeGreaterThan(0);
    expect(similarity(staff("treble", "G6"), [staff("treble", "D3")])).toBeGreaterThan(0);
    // Not every mirror is a group: the first ledger lines are not.
    expect(similarity(staff("treble", "C4"), [staff("treble", "A5")])).toBe(0);
    expect(similarity(staff("treble", "A3"), [staff("treble", "C6")])).toBe(0);
    // The note next door on the same staff, but not on another clef.
    expect(similarity(staff("treble", "F4"), [staff("treble", "E4")])).toBeGreaterThan(0);
    expect(similarity(staff("treble", "D4"), [staff("treble", "E4")])).toBeGreaterThan(0);
    expect(similarity(staff("treble", "G4"), [staff("treble", "E4")])).toBe(0);
    expect(similarity(staff("bass", "B3"), [staff("treble", "B5")])).toBe(0);
    expect(similarity(staff("bass", "D2"), [staff("bass", "D4")])).toBeGreaterThan(0);
    expect(similarity(staff("alto", "F5"), [staff("alto", "G2")])).toBeGreaterThan(0);
    expect(similarity(staff("alto", "F5"), [staff("alto", "F3")])).toBe(0);
    // The other direction is another queue; a different clef is neither.
    expect(similarity(staff("treble", "B3", "note-to-staff"), [staff("treble", "B5")])).toBe(0);
    expect(introductionGroup(staff("treble", "B3"))).toBe(introductionGroup(staff("bass", "D2")));
    expect(diverseIndex([staff("treble", "B3"), staff("treble", "G4")], [staff("treble", "B5")])).toBe(1);
  });
  it("recognizes transposed guitar shapes and preserves their introduction levels", () => {
    const a: NoteRow = { ...note("C", "P5", "G"), fields: ["a", "guitar-interval", "6", "5", "2", "P5"], tags: "learning-level::1" };
    const b = { ...a, guid: "b", fields: ["b", "guitar-interval", "5", "4", "2", "P5"] };
    const c = { ...a, guid: "c", fields: ["c", "guitar-interval", "5", "3", "2", "1"] };
    expect(diverseIndex([b, c], [a])).toBe(1);
    expect(introductionGroup(a)).toBe(introductionGroup(b));
    expect(introductionGroup(a)).not.toBe(introductionGroup({ ...b, tags: "learning-level::2" }));
  });
});
