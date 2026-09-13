// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { guitarShapeId, guitarShapeIds, mergeGuitarStates, normalizeGuitarLevels } from "./guitar-shapes";
import { includesGuitarIntervalCard, parseGuitarOverrides } from "./guitar-interval-selection";
import type { NoteRow, StateRow } from "./db";

function note(root: number, target: number, offset = 0, level = 10): NoteRow {
  return { id: root * 100 + target, guid: `${root}-${target}`, pkg: "Guitar Intervals", mid: 1,
    tags: `learning-level::${level}`,
    fields: ["id", "guitar-interval", String(root), String(target), String(offset)] };
}

describe("shared guitar shapes", () => {
  it("groups only identical directions, string distances and fret offsets with the same tuning gap", () => {
    expect(guitarShapeIds(note(1, 2))).toEqual(["r1-s2-0", "r3-s4-0", "r4-s5-0", "r5-s6-0"]);
    expect(guitarShapeIds(note(2, 3))).toEqual(["r2-s3-0"]);
    expect(guitarShapeIds(note(1, 3, 2))).toEqual(["r1-s3-f2", "r2-s4-f2"]);
    expect(guitarShapeIds(note(6, 4, -2))).toEqual(["r5-s3-b2", "r6-s4-b2"]);
    expect(guitarShapeIds(note(6, 6, 1))).toHaveLength(6);
    expect(guitarShapeId(note(1, 6))).not.toBe(guitarShapeId(note(6, 1)));
    expect(guitarShapeId(note(1, 2, -6))).not.toBe(guitarShapeId(note(1, 2, 6)));
  });

  it.each([[3, 246, 118], [6, 462, 220]])("counts distinct shapes within ±%i frets", (reach, count, unique) => {
    const notes: NoteRow[] = [];
    for (let root = 1; root <= 6; root++) for (let target = 1; target <= 6; target++) for (let fret = -reach; fret <= reach; fret++) {
      if (root !== target || fret !== 0) notes.push(note(root, target, fret));
    }
    expect(notes).toHaveLength(count);
    expect(new Set(notes.map(guitarShapeId)).size).toBe(unique);
  });

  it("uses the earliest level and applies legacy exclusions across the group", () => {
    const notes = normalizeGuitarLevels([note(1, 2, 0, 8), note(3, 4, 0, 2), note(2, 3, 0, 9)]);
    expect(notes.map(n => n.tags)).toEqual(["learning-level::2", "learning-level::2", "learning-level::9"]);
    const overrides = parseGuitarOverrides({ "r1-s2-0": true, "r3-s4-0": false });
    expect(overrides).toEqual({ "r1-s2-0": false });
    for (const n of notes.slice(0, 2)) {
      expect(includesGuitarIntervalCard(n, { left: 3, right: 3 }, 2)).toBe(true);
      expect(includesGuitarIntervalCard(n, { left: 3, right: 3 }, 2, overrides)).toBe(false);
    }
  });

  it("keeps the latest schedule, earliest introduction and unrelated cards, independent of input order", () => {
    const old: StateRow = { key: "a", fsrs: { reps: 2 }, due: 500, stateKind: "review", introducedDay: 1, updatedAt: 20, updatedBy: "a" };
    const recent = { ...old, key: "b", fsrs: { reps: 6 }, due: 100, introducedDay: 2, updatedAt: 30 };
    const other = { ...old, key: "other" };
    const aliases = new Map([["a", "shape"], ["b", "shape"]]);
    const expected = { ...recent, key: "shape", introducedDay: 1 };
    expect(mergeGuitarStates([old, recent, other], aliases)).toEqual([expected, other]);
    expect(mergeGuitarStates([recent, old], aliases)).toEqual([expected]);
    expect(mergeGuitarStates([expected, old], aliases)).toEqual([expected]);
  });
});
