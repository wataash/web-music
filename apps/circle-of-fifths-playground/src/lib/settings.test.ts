// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from "vitest";
import { renderCircleOfFifthsSvg } from "@circle-of-fifths/svg";

import {
  DEFAULT_SETTINGS,
  ONE_NOTE_PER_CELL,
  renderOptionsFor,
  searchFromSettings,
  settingsFromSearch,
  splitNotes,
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
      noteMode: "custom" as const,
      customNotes: "C G,a",
      labelLayout: "single-note" as const,
      highlightedCells: [
        { ring: "outer" as const, hour: 12 },
        { ring: "inner" as const, hour: 4 },
      ],
      showKeySignatures: true,
      title: "My circle",
    };

    expect(settingsFromSearch(searchFromSettings(settings))).toEqual({
      ...settings,
      customNotes: "C G a",
    });
  });

  test("ignores malformed highlights", () => {
    expect(
      settingsFromSearch("?highlight=outer:0&highlight=middle:4").highlightedCells,
    ).toEqual([]);
  });

  test("uses one note per cell for the single-note layout", () => {
    const settings = settingsFromSearch("?layout=single-note");

    expect(settings.noteMode).toBe("one-per-cell");
    expect(ONE_NOTE_PER_CELL).toHaveLength(24);
    expect(() =>
      renderCircleOfFifthsSvg(renderOptionsFor(settings)),
    ).not.toThrow();
    expect(searchFromSettings(settings)).toContain("notes=one-per-cell");
  });

  test("starts custom input with a valid single-note selection", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      noteMode: "custom" as const,
      labelLayout: "single-note" as const,
    };

    expect(() =>
      renderCircleOfFifthsSvg(renderOptionsFor(settings)),
    ).not.toThrow();
    expect(renderOptionsFor(settings).visibleNotes).toEqual(ONE_NOTE_PER_CELL);
  });

  test("deduplicates note input and maps modes to renderer options", () => {
    expect(splitNotes("C, G C\na")).toEqual(["C", "G", "a"]);
    expect(
      renderOptionsFor({
        ...DEFAULT_SETTINGS,
        noteMode: "custom",
        customNotes: "C G a",
      }).visibleNotes,
    ).toEqual(["C", "G", "a"]);
    expect(renderOptionsFor(DEFAULT_SETTINGS).visibleNotes).toBeUndefined();
  });
});
