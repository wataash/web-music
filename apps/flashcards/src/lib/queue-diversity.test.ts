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
  it("recognizes transposed guitar shapes and preserves their introduction levels", () => {
    const a: NoteRow = { ...note("C", "P5", "G"), fields: ["a", "guitar-interval", "6", "5", "2", "P5"], tags: "learning-level::1" };
    const b = { ...a, guid: "b", fields: ["b", "guitar-interval", "5", "4", "2", "P5"] };
    const c = { ...a, guid: "c", fields: ["c", "guitar-interval", "5", "3", "2", "1"] };
    expect(diverseIndex([b, c], [a])).toBe(1);
    expect(introductionGroup(a)).toBe(introductionGroup(b));
    expect(introductionGroup(a)).not.toBe(introductionGroup({ ...b, tags: "learning-level::2" }));
  });
});
