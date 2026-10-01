// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";
import { renderCircleOfFifthsSvg } from "@circle-of-fifths/svg";

import {
  ALL_NOTES,
  cellAt,
  radiiFor,
  DEFAULT_SETTINGS,
  describeDiagram,
  BASIC_NOTE_LIST,
  renderOptionsFor,
  searchFromSettings,
  settingsFromSearch,
  toggleCell,
  toggleNote,
} from "./settings";

describe("playground settings", () => {
  test("uses compact defaults", () => {
    expect(settingsFromSearch("")).toEqual(DEFAULT_SETTINGS);
    expect(searchFromSettings(DEFAULT_SETTINGS)).toBe("");
  });

  test("round-trips shareable settings", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      theme: "dark" as const,
      font: "heros" as const,
      noteMode: "custom" as const,
      customNotes: ["C", "a", "G"],
      labelSize: 38,
      outside: "flats" as const,
      spiral: 150,
      ringWidth: 90,
      highlightedCells: [
        { ring: "outer" as const, hour: 12 },
        { ring: "inner" as const, hour: 4 },
      ],
      showKeySignatures: true,
      signatureSize: 130,
    };

    expect(settingsFromSearch(searchFromSettings(settings))).toEqual(settings);
    expect(settingsFromSearch("?notes=G,x,C").customNotes).toEqual(["C", "G"]);
  });

  test("embeds the chosen note font", () => {
    const termes = renderCircleOfFifthsSvg(renderOptionsFor(DEFAULT_SETTINGS));
    expect(termes).toContain('@font-face { font-family: "Circle Notes"');
    expect(termes).toContain('font-family: "Circle Notes", serif;');
    expect(renderCircleOfFifthsSvg(renderOptionsFor({ ...DEFAULT_SETTINGS, font: "roboto" })))
      .toContain('font-family: "Circle Notes", sans-serif;');
    // Noto Sans was offered unembedded before; its links fall back to Termes.
    expect(settingsFromSearch("?font=noto-sans").font).toBe("termes");
  });

  test("describes what the diagram draws", () => {
    expect(describeDiagram(DEFAULT_SETTINGS)).toBe(
      "A light circle of fifths with major keys on the outer ring and minor keys on the inner ring, showing the common spellings.",
    );
    expect(describeDiagram({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      noteMode: "custom",
      customNotes: ["C", "G"],
      highlightedCells: [{ ring: "outer", hour: 12 }],
      showKeySignatures: true,
    })).toBe(
      "A dark circle of fifths with major keys on the outer ring and minor keys on the inner ring, showing the notes C, G. 1 cell is highlighted. Treble and bass key signatures sit outside the circle.",
    );
  });

  test("ignores malformed highlights", () => {
    expect(
      settingsFromSearch("?highlight=outer:0&highlight=middle:4").highlightedCells,
    ).toEqual([]);
  });

  test("keeps an empty hand-picked selection", () => {
    const none = { ...DEFAULT_SETTINGS, noteMode: "custom" as const, customNotes: [] };
    expect(searchFromSettings(none)).toBe("?notes=");
    expect(settingsFromSearch("?notes=")).toEqual(none);
    expect(settingsFromSearch("?notes=all").noteMode).toBe("all");
  });

  test("passes the spiral on as a fraction", () => {
    expect(renderOptionsFor({ ...DEFAULT_SETTINGS, spiral: 150 }).labelSpiral).toBe(1.5);
    expect(settingsFromSearch("?spiral=201").spiral).toBe(100);
    expect(settingsFromSearch("?signature-size=150").signatureSize).toBe(100);
  });

  test("takes any size from 20 to 64px", () => {
    expect(renderOptionsFor({ ...DEFAULT_SETTINGS, labelSize: 64 }).labelSize).toBe(64);
    expect(settingsFromSearch("?size=64").labelSize).toBe(64);
    expect(settingsFromSearch("?size=65").labelSize).toBe(48);
  });

  test("sets both rings to one width, leaving the rest as the hole", () => {
    expect(radiiFor(DEFAULT_SETTINGS)).toEqual({ outer: 460, divider: 276, inner: 92 });
    expect(settingsFromSearch("?ring=50").ringWidth).toBe(50);
    expect(radiiFor({ ...DEFAULT_SETTINGS, ringWidth: 100 }).inner).toBe(0);
    expect(radiiFor({ ...DEFAULT_SETTINGS, ringWidth: 50 })).toEqual({ outer: 460, divider: 345, inner: 230 });
    for (const bad of ["9", "101", "12.5", "x"]) {
      expect(settingsFromSearch(`?ring=${bad}`).ringWidth).toBe(80);
    }
  });

  test("finds the cell under a tap and toggles its highlight", () => {
    expect(cellAt(DEFAULT_SETTINGS, 500, 100)).toEqual({ ring: "outer", hour: 12 });
    expect(cellAt(DEFAULT_SETTINGS, 710, 500)).toEqual({ ring: "inner", hour: 3 });
    expect(cellAt(DEFAULT_SETTINGS, 500, 500)).toBeNull();
    expect(cellAt(DEFAULT_SETTINGS, 990, 500)).toBeNull();
    const on = toggleCell(DEFAULT_SETTINGS, { ring: "inner", hour: 3 });
    expect(on.highlightedCells).toEqual([{ ring: "inner", hour: 3 }]);
    expect(toggleCell(on, { ring: "inner", hour: 3 }).highlightedCells).toEqual([]);
  });

  test("starts from the basic spellings, both names of seven sharps or flats among them", () => {
    expect(renderOptionsFor(DEFAULT_SETTINGS).visibleNotes).toBe(BASIC_NOTE_LIST);
    expect(BASIC_NOTE_LIST).toEqual(expect.arrayContaining(["C#", "Db", "Cb", "B", "a#", "bb", "ab", "g#"]));
    expect(BASIC_NOTE_LIST).toHaveLength(30);
  });

  test("offers every single sharp and flat between Basic and All", () => {
    const single = settingsFromSearch("?notes=single");
    expect(single.noteMode).toBe("single");
    expect(searchFromSettings(single)).toBe("?notes=single");
    const notes = renderOptionsFor(single).visibleNotes!;
    expect(notes).toEqual(expect.arrayContaining(["B#", "Fb", "e#", "cb", "C"]));
    expect(notes).not.toContain("Dbb");
    expect(notes).toHaveLength(42);
  });

  test("toggles a spelling from what the preset shows", () => {
    const all = { ...DEFAULT_SETTINGS, noteMode: "all" as const };
    const withoutC = toggleNote(all, "C");
    expect(withoutC.noteMode).toBe("custom");
    expect(withoutC.customNotes).toHaveLength(ALL_NOTES.length - 1);
    expect(withoutC.customNotes).not.toContain("C");
    expect(toggleNote(withoutC, "C").customNotes).toEqual(ALL_NOTES);
    expect(toggleNote({ ...DEFAULT_SETTINGS, noteMode: "custom", customNotes: [] }, "a").customNotes).toEqual(["a"]);
    expect(renderOptionsFor(all).visibleNotes).toBeUndefined();
  });
});
