// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { createWebPackage } from "@web-music/anki-apkg/package";

import { BOARD_COLUMNS, labelPosition, renderBoardSvg } from "./board";
import { GUITAR_INTERVAL_CARDS } from "./cards";
import {
  BOARD_FILENAME,
  createDeckArtifacts,
  createDeckNotes,
  generateAnkiDeck,
} from "./generate";
import { PACKAGE_SPEC } from "./package-spec";
import { CARD_CSS, ROOT_DECK_NAME } from "./template";

describe("guitar interval deck generation", () => {
  it("places all eight altered references one fret away on the target string", () => {
    const notes = createDeckNotes();
    for (const [degree, reference, delta] of [
      ["d5", "P5", 1], ["d7", "m7", 1], ["A4", "P4", -1], ["A5", "P5", -1],
      ["♭9", "9", 1], ["♯9", "9", -1], ["♯11", "11", -1], ["♭13", "13", 1],
    ] as const) {
      const shape = GUITAR_INTERVAL_CARDS.find((card) => card.names.includes(degree) && Math.abs(card.fretOffset) < 3)!;
      const note = notes.find((note) => note.id === shape.id)!;
      const position = labelPosition(shape.targetString, shape.fretOffset + delta);
      expect(note.fields[6]).not.toContain('class="fret-name reference"');
      for (const board of [note.fields[7]]) {
        const hints = [...board.matchAll(/class="fret-name reference" style="--fret-x:([^;]+);--fret-y:([^"]+)">([^<]+)</g)];
        const hint = hints.find((match) => match[3].split(" ").includes(reference))!;
        expect(hint).toBeDefined();
        expect(parseFloat(hint[1])).toBeCloseTo(position.x * 100, 2);
        expect(parseFloat(hint[2])).toBeCloseTo(position.y * 100, 2);
      }
    }
    expect(notes.find((note) => note.id === "r6-s5-f2")!.fields[6]).not.toContain('class="fret-name reference"');
  });

  it("writes one note per card into one flat deck", () => {
    const notes = createDeckNotes();
    expect(notes).toHaveLength(GUITAR_INTERVAL_CARDS.length);
    expect(new Set(notes.map(({ guid }) => guid)).size).toBe(notes.length);
    expect(
      notes.every(({ deckId }) => deckId === PACKAGE_SPEC.decks[0].id),
    ).toBe(true);

    const m3 = notes.find(({ id }) => id === "r2-s1-b1")!;
    expect(m3.fields.slice(0, 6)).toEqual([
      "r2-s1-b1",
      "guitar-interval",
      "2",
      "1",
      "-1",
      "M3",
    ]);
    // The front asks with a "?" where the back writes the names.
    expect(m3.fields[6]).toMatch(/class="fret-name cue"[^>]*>\?</);
    expect(m3.fields[6]).not.toContain("M3");
    expect(m3.fields[7]).toMatch(/class="fret-name answer"[^>]*>M3</);
    // The root is named on both sides, at the middle column.
    expect(m3.fields[6]).toContain('class="fret-name root"');
    expect(m3.fields[6]).toContain("--fret-x:50%");
  });

  it("shares one drawing across every card", () => {
    const { media } = createDeckArtifacts();
    expect(media).toHaveLength(1);
    expect(media[0].filename).toBe(BOARD_FILENAME);
    expect(media[0].content).toBe(renderBoardSvg());
    expect(
      createDeckNotes().every(({ fields }) =>
        fields[6].includes(`src="${BOARD_FILENAME}"`),
      ),
    ).toBe(true);
  });

  it("exports each learning level for the app's difficulty filter", () => {
    const notes = createDeckNotes();
    for (const note of notes) {
      expect(note.tags.filter((tag) => tag.startsWith("learning-level::")))
        .toEqual([`learning-level::${note.orderGroup! + 1}`]);
    }
    expect(notes.find((note) => note.id === "r6-s5-f2")!.tags)
      .toContain("learning-level::1");
    expect(notes.find((note) => note.id === "r3-s2-f3")!.tags)
      .toContain("learning-level::1");
  });

  it("places a name in the middle of its own cell", () => {
    expect(labelPosition(1, 0)).toEqual({ x: 0.5, y: 1 / 12 });
    expect(labelPosition(6, 0).y).toBeCloseTo(11 / 12);
    expect(labelPosition(1, -6).x).toBeCloseTo(0.5 / BOARD_COLUMNS);
    expect(labelPosition(1, 6).x).toBeCloseTo(12.5 / BOARD_COLUMNS);
    expect(() => labelPosition(0, 0)).toThrow(RangeError);
    expect(() => labelPosition(1, 7)).toThrow(RangeError);
  });

  it("crops the board to the reader's window without redrawing it", () => {
    // The card carries the whole board and the CSS slides it, so the app only
    // has to say how many frets each way.
    expect(CARD_CSS).toContain("--left: var(--fret-left, 3)");
    expect(CARD_CSS).toContain("--right: var(--fret-right, 3)");
    expect(CARD_CSS).toMatch(/\.fret-window \{[^}]*overflow: hidden/);
  });

  it("changes only new-card order, preserving identities and the shuffle within each group", () => {
    const notes = createDeckNotes();
    const deck = createWebPackage(PACKAGE_SPEC, notes);
    const legacy = createWebPackage(PACKAGE_SPEC, notes.map(({ orderGroup, ...note }) => note));
    expect(deck.notes).toEqual(legacy.notes);
    expect(deck.cards.map(({ newOrder, ...card }) => card))
      .toEqual(legacy.cards.map(({ newOrder, ...card }) => card));

    const groupById = new Map(notes.map((note) => [note.id, note.orderGroup!]));
    const orderedIds = (data: typeof deck) => {
      const idByNid = new Map(data.notes.map((note) => [note.id, note.fields[0]]));
      return [...data.cards].sort((a, b) => a.newOrder - b.newOrder)
        .map((card) => idByNid.get(card.nid)!);
    };
    const ids = orderedIds(deck);
    const groups = ids.map((id) => groupById.get(id)!);
    expect(groups).toEqual([...groups].sort((a, b) => a - b));
    const core = notes.filter(note => note.orderGroup === 0);
    expect(new Set(ids.slice(0, core.length))).toEqual(new Set(core.map(note => note.id)));
    expect(ids).not.toEqual(orderedIds(legacy));
    for (let group = 0; group < 10; group++) {
      const inGroup = (id: string) => groupById.get(id) === group;
      expect(ids.filter(inGroup)).toEqual(orderedIds(legacy).filter(inGroup));
    }
  });

  it("writes a modern Anki package", async () => {
    const directory = await mkdtemp(join(tmpdir(), "guitar-intervals-test-"));
    const outputPath = join(directory, "guitar-intervals.apkg");
    try {
      expect(await generateAnkiDeck(outputPath)).toEqual({
        deckCount: 1,
        noteCount: GUITAR_INTERVAL_CARDS.length,
        mediaCount: 1,
      });
      const zip = await JSZip.loadAsync(await readFile(outputPath));
      expect(zip.file("collection.anki21b")).not.toBeNull();
      expect(zip.file("media")).not.toBeNull();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("names its deck once", () => {
    expect(PACKAGE_SPEC.rootDeckNames).toEqual([ROOT_DECK_NAME]);
  });
});
