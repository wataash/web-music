// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";

import {
  ALL_CIRCLE_NOTES,
  circleNoteDeckSetting,
  circleNoteTableRows,
  DEFAULT_CIRCLE_NOTE_SELECTION,
  includesCircleNoteCard,
  isCircleIntervalCard,
  isCircleNoteToCellCard,
  parseCircleNoteSelection,
  presetForSelection,
  presetForRingSelection,
  selectionForPreset,
  type CircleNoteSelection,
  type CircleNoteSelections,
} from "./circle-note-selection";

function bothSelections(
  selection: CircleNoteSelection,
): CircleNoteSelections {
  return { noteToCell: selection, intervals: selection };
}

describe("Circle of Fifths note selection", () => {
  test("uses the ring-specific Basic sets by default", () => {
    expect(DEFAULT_CIRCLE_NOTE_SELECTION.outer).toHaveLength(13);
    expect(DEFAULT_CIRCLE_NOTE_SELECTION.inner).toHaveLength(13);
    expect(DEFAULT_CIRCLE_NOTE_SELECTION.outer).toContain("Gb");
    expect(DEFAULT_CIRCLE_NOTE_SELECTION.outer).not.toContain("Cb");
    expect(DEFAULT_CIRCLE_NOTE_SELECTION.inner).not.toContain("gb");
    expect(presetForSelection(DEFAULT_CIRCLE_NOTE_SELECTION)).toBe("basic");
  });

  test("makes the difficulty presets cumulative for each ring", () => {
    const advanced = selectionForPreset("advanced");
    const all = selectionForPreset("all");

    expect(advanced.outer).toHaveLength(22);
    expect(advanced.inner).toHaveLength(26);
    expect(advanced.outer).toContain("F##");
    expect(advanced.outer).not.toContain("C##");
    expect(advanced.inner).toContain("c##");
    expect(all.outer).toHaveLength(35);
    expect(all.inner).toHaveLength(35);
    expect(presetForSelection(advanced)).toBe("advanced");
    expect(presetForSelection(all)).toBe("all");
  });

  test("identifies presets independently for the major and minor rings", () => {
    const basic = selectionForPreset("basic");
    const all = selectionForPreset("all");
    const mixed = { outer: basic.outer, inner: all.inner };

    expect(presetForSelection(mixed)).toBe("custom");
    expect(presetForRingSelection(mixed, "outer")).toBe("basic");
    expect(presetForRingSelection(mixed, "inner")).toBe("all");
  });

  test("orders individual choices by their fifth distance", () => {
    expect(ALL_CIRCLE_NOTES.outer.slice(0, 3)).toEqual([
      "Fbb",
      "Cbb",
      "Gbb",
    ]);
    expect(ALL_CIRCLE_NOTES.outer.slice(-3)).toEqual([
      "A##",
      "E##",
      "B##",
    ]);
    expect(ALL_CIRCLE_NOTES.inner.slice(0, 3)).toEqual([
      "fbb",
      "cbb",
      "gbb",
    ]);
  });

  test("describes table rows using each ring's tonic and difficulty", () => {
    const outer = circleNoteTableRows("outer");
    const inner = circleNoteTableRows("inner");

    expect(outer).toHaveLength(35);
    expect(outer[0]).toEqual({
      note: "Fbb",
      noteLabel: "F𝄫",
      fifthsFromTonic: -15,
      difficulty: "esoteric",
    });
    expect(outer.find(({ note }) => note === "Gb")).toEqual({
      note: "Gb",
      noteLabel: "G♭",
      fifthsFromTonic: -6,
      difficulty: "basic",
    });
    expect(inner).toHaveLength(35);
    expect(inner[0]).toEqual({
      note: "fbb",
      noteLabel: "f𝄫",
      fifthsFromTonic: -18,
      difficulty: "esoteric",
    });
    expect(inner.find(({ note }) => note === "bbb")).toEqual({
      note: "bbb",
      noteLabel: "b𝄫",
      fifthsFromTonic: -12,
      difficulty: "advanced",
    });
  });

  test("describes only existing interval cards in the Note column", () => {
    const flat3 = circleNoteTableRows("inner", "flat3");
    const major3 = circleNoteTableRows("outer", "major3");

    expect(flat3).toHaveLength(20);
    expect(flat3.find(({ note }) => note === "a")?.noteLabel).toBe(
      "Am (a → C)",
    );
    expect(flat3.some(({ note }) => note === "fbb")).toBe(false);
    expect(major3).toHaveLength(21);
    expect(major3.find(({ note }) => note === "C")?.noteLabel).toBe(
      "C (C → e)",
    );
    expect(major3.some(({ note }) => note === "Fbb")).toBe(false);
  });

  test("identifies Note to Cell cards", () => {
    expect(
      isCircleNoteToCellCard({
        fields: ["outer-note-c", "", "C"],
        tags: "note-to-cell::outer",
      }),
    ).toBe(true);
    expect(
      isCircleNoteToCellCard({
        fields: ["outer-cell-0", "", ""],
        tags: "cell-to-notes::outer",
      }),
    ).toBe(false);
  });

  test("identifies interval cards", () => {
    expect(
      isCircleIntervalCard({
        fields: ["major3-c", "Δ3", "C Δ3"],
        tags: "interval::major3",
      }),
    ).toBe(true);
    expect(
      isCircleIntervalCard({
        fields: ["outer-note-c", "", "C"],
        tags: "note-to-cell::outer",
      }),
    ).toBe(false);
  });

  test("leaves Cell to Notes and unrelated cards unchanged", () => {
    const selection = { outer: [], inner: [] };

    expect(
      includesCircleNoteCard(
        {
          fields: ["outer-cell-1"],
          tags: "cell-to-notes::outer",
        },
        bothSelections(selection),
      ),
    ).toBe(true);
    expect(
      includesCircleNoteCard(
        { fields: ["major3-c"], tags: "interval::major3" },
        bothSelections(selection),
      ),
    ).toBe(true);
    expect(
      includesCircleNoteCard(
        { fields: ["outer-cell-1"], tags: "unrelated" },
        bothSelections(selection),
      ),
    ).toBe(true);
  });

  test("includes only selected Note to Cell cards", () => {
    const basic = selectionForPreset("basic");

    expect(
      includesCircleNoteCard(
        { fields: ["outer-note-c", "", "C"], tags: "note-to-cell::outer" },
        bothSelections(basic),
      ),
    ).toBe(true);
    expect(
      includesCircleNoteCard(
        {
          fields: ["outer-note-f-double-flat", "", "F𝄫"],
          tags: "note-to-cell::outer",
        },
        bothSelections(basic),
      ),
    ).toBe(false);
    expect(
      includesCircleNoteCard(
        {
          fields: ["inner-note-c-double-sharp", "", "c𝄪"],
          tags: "note-to-cell::inner",
        },
        bothSelections(selectionForPreset("advanced")),
      ),
    ).toBe(true);
  });

  test("includes only selected interval question notes", () => {
    const basic = bothSelections(selectionForPreset("basic"));
    const advanced = bothSelections(selectionForPreset("advanced"));
    const basicFlat3 = {
      fields: ["flat3-a", "♭3", "A ♭3"],
      tags: "interval::flat3",
    };
    const advancedFlat3 = {
      fields: ["flat3-a-flat", "♭3", "A♭ ♭3"],
      tags: "interval::flat3",
    };
    const basicMajor3 = {
      fields: ["major3-c", "Δ3", "C Δ3"],
      tags: "interval::major3",
    };
    const advancedMajor3 = {
      fields: ["major3-c-sharp", "Δ3", "C♯ Δ3"],
      tags: "interval::major3",
    };

    expect(includesCircleNoteCard(basicFlat3, basic)).toBe(true);
    expect(includesCircleNoteCard(advancedFlat3, basic)).toBe(false);
    expect(includesCircleNoteCard(advancedFlat3, advanced)).toBe(true);
    expect(includesCircleNoteCard(basicMajor3, basic)).toBe(true);
    expect(includesCircleNoteCard(advancedMajor3, basic)).toBe(false);
    expect(includesCircleNoteCard(advancedMajor3, advanced)).toBe(true);
  });

  test("offers settings only on configurable child decks", () => {
    expect(
      circleNoteDeckSetting("(Experimental) Circle of Fifths::Note → Cell"),
    ).toBeNull();
    expect(
      circleNoteDeckSetting(
        "(Experimental) Circle of Fifths::Note → Cell::Note → Outer (Major) Cell",
      ),
    ).toEqual({
      scope: "note-to-cell",
      ring: "outer",
      deckLabel: "major Note → Cell",
      tableKind: "notes",
    });
    expect(
      circleNoteDeckSetting(
        "(Experimental) Circle of Fifths::Note → Cell::Note → Inner (Minor) Cell",
      ),
    ).toEqual({
      scope: "note-to-cell",
      ring: "inner",
      deckLabel: "minor Note → Cell",
      tableKind: "notes",
    });
    expect(
      circleNoteDeckSetting(
        "(Experimental) Circle of Fifths::(Experimental) Intervals",
      ),
    ).toBeNull();
    expect(
      circleNoteDeckSetting(
        "(Experimental) Circle of Fifths::(Experimental) Intervals::♭3",
      ),
    ).toEqual({
      scope: "intervals",
      ring: "inner",
      deckLabel: "♭3",
      tableKind: "flat3",
    });
    expect(
      circleNoteDeckSetting(
        "(Experimental) Circle of Fifths::(Experimental) Intervals::Δ3",
      ),
    ).toEqual({
      scope: "intervals",
      ring: "outer",
      deckLabel: "Δ3",
      tableKind: "major3",
    });
    expect(
      circleNoteDeckSetting(
        "(Experimental) Circle of Fifths::Cell → All Notes",
      ),
    ).toBeNull();
    expect(
      circleNoteDeckSetting(
        "(Experimental) Circle of Fifths::Cell → All Notes::Outer (Major) Cell → Notes",
      ),
    ).toBeNull();
  });

  test("applies Note to Cell and interval selections independently", () => {
    const none = { outer: [], inner: [] };
    const all = selectionForPreset("all");
    const noteToCellCard = {
      fields: ["outer-note-f-double-flat", "", "F𝄫"],
      tags: "note-to-cell::outer",
    };
    const intervalCard = {
      fields: ["major3-c", "Δ3", "C Δ3"],
      tags: "interval::major3",
    };

    expect(
      includesCircleNoteCard(noteToCellCard, {
        noteToCell: all,
        intervals: none,
      }),
    ).toBe(true);
    expect(
      includesCircleNoteCard(intervalCard, {
        noteToCell: all,
        intervals: none,
      }),
    ).toBe(false);
    expect(
      includesCircleNoteCard(noteToCellCard, {
        noteToCell: none,
        intervals: all,
      }),
    ).toBe(false);
    expect(
      includesCircleNoteCard(intervalCard, {
        noteToCell: none,
        intervals: all,
      }),
    ).toBe(true);
  });

  test("normalizes saved custom selections and falls back on invalid data", () => {
    expect(
      parseCircleNoteSelection({
        outer: ["C", "C", "not-a-note"],
        inner: [],
      }),
    ).toEqual({ outer: ["C"], inner: [] });
    expect(parseCircleNoteSelection(null)).toEqual(
      DEFAULT_CIRCLE_NOTE_SELECTION,
    );
  });
});
