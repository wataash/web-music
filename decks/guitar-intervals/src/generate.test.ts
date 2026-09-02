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

  it("introduces cards in a shape the answer cannot be guessed from", () => {
    const deck = createWebPackage(PACKAGE_SPEC, createDeckNotes());
    const orderByNoteId = new Map(
      deck.cards.map(({ nid, newOrder }) => [nid, newOrder]),
    );
    const first = deck.notes
      .map((note) => ({ note, order: orderByNoteId.get(note.id)! }))
      .sort((left, right) => left.order - right.order)
      .slice(0, 12)
      .map(({ note }) => note);

    // A run of cards that all sit in the root's own fret is a run whose
    // answer is one of the few a straight line up the neck can be.
    expect(new Set(first.map(({ fields }) => fields[4])).size).toBeGreaterThan(
      6,
    );
    expect(new Set(first.map(({ fields }) => fields[5])).size).toBeGreaterThan(
      6,
    );
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
