// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  CARD_CSS,
  CELL_TO_NOTES_DECK_NAME,
  FLAT3_DECK_NAME,
  INNER_CELL_TO_NOTES_DECK_NAME,
  INNER_NOTE_TO_CELL_DECK_NAME,
  INTERVALS_DECK_NAME,
  MAJOR3_DECK_NAME,
  NOTE_TO_CELL_DECK_NAME,
  OUTER_CELL_TO_NOTES_DECK_NAME,
  OUTER_NOTE_TO_CELL_DECK_NAME,
  ROOT_DECK_NAME,
  WEB_BACK_TEMPLATE,
  WEB_FRONT_TEMPLATE,
} from "./template";
import { CARDS } from "./cards";
import {
  createDeckArtifacts,
  createWebDeckArtifacts,
  generateAnkiDeck,
} from "./generate";
import {
  DECK_CONFIG_ID,
  createWebDeckData,
  FLAT3_DECK_ID,
  INNER_CELL_TO_NOTES_DECK_ID,
  INNER_NOTE_TO_CELL_DECK_ID,
  MAJOR3_DECK_ID,
  OUTER_CELL_TO_NOTES_DECK_ID,
  OUTER_NOTE_TO_CELL_DECK_ID,
} from "./apkg";

describe("Anki deck generation", () => {
  test("uses a fixed dark card theme", () => {
    expect(CARD_CSS).toContain("background: #111827");
    expect(CARD_CSS).toContain("color: #f3f4f6");
    expect(CARD_CSS).toContain("color-scheme: dark");
    expect(CARD_CSS).toContain("color: #fcd34d");
    expect(CARD_CSS).not.toContain(".nightMode");
    expect(CARD_CSS).not.toContain(".night_mode");
  });

  test("creates the shared, highlighted, and answer diagrams", () => {
    const artifacts = createDeckArtifacts();
    const [sharedFront] = artifacts.media;
    const mediaByFilename = new Map(
      artifacts.media.map(({ filename, content }) => [filename, content]),
    );

    expect(artifacts.notes).toHaveLength(135);
    expect(artifacts.media).toHaveLength(160);
    for (const { content } of artifacts.media) {
      const svg = asText(content);
      expect(svg).toContain('fill="#111827"');
      expect(svg).toContain("stroke: #d1d5db");
      expect(svg).toContain("fill: #f3f4f6");
      expect(svg).not.toContain("#000");
      expect(svg).not.toContain("#fff");
    }
    expect(
      artifacts.notes.filter(({ deckId }) => deckId === FLAT3_DECK_ID),
    ).toHaveLength(20);
    expect(
      artifacts.notes.filter(({ deckId }) => deckId === MAJOR3_DECK_ID),
    ).toHaveLength(21);
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === OUTER_CELL_TO_NOTES_DECK_ID,
      ),
    ).toHaveLength(12);
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === INNER_CELL_TO_NOTES_DECK_ID,
      ),
    ).toHaveLength(12);
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === OUTER_NOTE_TO_CELL_DECK_ID,
      ),
    ).toHaveLength(35);
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === INNER_NOTE_TO_CELL_DECK_ID,
      ),
    ).toHaveLength(35);
    expect(asText(sharedFront.content)).not.toContain(
      'class="circle-of-fifths__note"',
    );

    CARDS.forEach((card, index) => {
      const note = artifacts.notes[index];
      const frontFilename = imageFilename(note.fields[4]);
      const backFilename = imageFilename(note.fields[5]);
      const frontSvg = asText(mediaByFilename.get(frontFilename)!);
      const backSvg = asText(mediaByFilename.get(backFilename)!);

      expect(backFilename).toMatch(
        new RegExp(
          `^circle-of-fifths-${card.id}-[0-9a-f]{12}\\.svg$`,
        ),
      );

      if (card.kind === "cell-to-notes") {
        expect(note.fields.slice(1, 4)).toEqual(["", "", ""]);
        expect(frontFilename).toMatch(
          new RegExp(
            `^circle-of-fifths-${card.id}-front-[0-9a-f]{12}\\.svg$`,
          ),
        );
        expect(frontSvg).toContain(
          `data-hour="${card.hour}" data-ring="${card.ring}"`,
        );
        expect(frontSvg).not.toContain(
          'class="circle-of-fifths__note"',
        );
        expect(
          backSvg.match(/class="circle-of-fifths__note"/g),
        ).toHaveLength(card.notes.length);
        for (const visibleNote of card.notes) {
          expect(backSvg).toContain(`data-note="${visibleNote}"`);
        }
      } else {
        expect(frontFilename).toBe(sharedFront.filename);
        expect(backSvg).toContain(
          'class="circle-of-fifths circle-of-fifths--single-note"',
        );
        expect(
          backSvg.match(/class="circle-of-fifths__note"/g),
          card.id,
        ).toHaveLength(card.kind === "interval" ? 2 : 1);
        if (card.kind === "interval") {
          expect(backSvg).toContain(`data-note="${card.outerNote}"`);
          expect(backSvg).toContain(`data-note="${card.innerNote}"`);
        } else {
          expect(backSvg).toContain(`data-note="${card.note}"`);
          expect(note.fields[3]).toBe("");
        }
      }
    });
  });

  test("preserves note-name case on note-to-cell cards", () => {
    const artifacts = createDeckArtifacts();
    const outerE = artifacts.notes.find(
      ({ id }) => id === "outer-note-e",
    );
    const innerE = artifacts.notes.find(
      ({ id }) => id === "inner-note-e",
    );

    expect(outerE?.fields.slice(1, 4)).toEqual(["", "E", ""]);
    expect(innerE?.fields.slice(1, 4)).toEqual(["", "e", ""]);
  });

  test("starts every child deck hidden in the web app", () => {
    const artifacts = createDeckArtifacts();
    const deck = createWebDeckData(artifacts.notes, artifacts.media);
    const hiddenNames = deck.decks
      .filter(({ hiddenByDefault }) => hiddenByDefault === true)
      .map(({ name }) => name);

    expect(hiddenNames).toEqual([
      NOTE_TO_CELL_DECK_NAME,
      OUTER_NOTE_TO_CELL_DECK_NAME,
      INNER_NOTE_TO_CELL_DECK_NAME,
      CELL_TO_NOTES_DECK_NAME,
      OUTER_CELL_TO_NOTES_DECK_NAME,
      INNER_CELL_TO_NOTES_DECK_NAME,
      INTERVALS_DECK_NAME,
      FLAT3_DECK_NAME,
      MAJOR3_DECK_NAME,
    ]);
    expect(deck.rootDeckNames).toEqual([ROOT_DECK_NAME]);
  });

  test("keeps the web deck small and free of SVG media", () => {
    const artifacts = createWebDeckArtifacts();
    const deck = createWebDeckData(artifacts.notes, artifacts.media);
    const cell = artifacts.notes.find(({ id }) => id === "outer-cell-12")!;
    const interval = artifacts.notes.find(({ id }) => id === "flat3-a")!;

    expect(artifacts.media).toEqual([]);
    expect(cell.fields[4]).toBe("cell|outer|12");
    expect(cell.fields[5]).toMatch(/^standard\|/);
    expect(interval.fields[4]).toBe("empty");
    expect(interval.fields[5]).toMatch(/^single\|/);
    expect(WEB_FRONT_TEMPLATE).toContain("data-circle-of-fifths");
    expect(WEB_BACK_TEMPLATE).toContain("circle-of-fifths--single-note");
    expect(JSON.stringify(deck).length).toBeLessThan(130_000);
  });

  test("writes an inspectable Anki package", async () => {
    const directory = await mkdtemp(join(tmpdir(), "circle-of-fifths-test-"));
    const outputPath = join(directory, "deck.apkg");

    try {
      const summary = await generateAnkiDeck(outputPath);

      expect(summary.noteCount).toBe(135);
      expect(summary.cardCount).toBe(135);
      expect(summary.deckCount).toBe(9);
      expect(summary.cardsByDeck).toEqual({
        [CELL_TO_NOTES_DECK_NAME]: 0,
        [OUTER_CELL_TO_NOTES_DECK_NAME]: 12,
        [INNER_CELL_TO_NOTES_DECK_NAME]: 12,
        [NOTE_TO_CELL_DECK_NAME]: 0,
        [OUTER_NOTE_TO_CELL_DECK_NAME]: 35,
        [INNER_NOTE_TO_CELL_DECK_NAME]: 35,
        [INTERVALS_DECK_NAME]: 0,
        [FLAT3_DECK_NAME]: 20,
        [MAJOR3_DECK_NAME]: 21,
      });
      expect(summary.modelCount).toBe(1);
      expect(summary.mediaCount).toBe(160);
      expect(new Set(summary.mediaFilenames).size).toBe(160);
      expect(new Set(summary.noteGuids).size).toBe(135);
      expect(summary.noteFields.every((fields) => fields.length === 6)).toBe(
        true,
      );
      expect(new Set(summary.newCardIdsByDue)).toEqual(
        new Set(CARDS.map(({ id }) => id)),
      );
      expect(summary.newCardIdsByDue).not.toEqual(
        CARDS.map(({ id }) => id),
      );
      expect(summary.deckConfigs).toEqual({
        [DECK_CONFIG_ID]: {
          name: "(Experimental) Circle of Fifths — Random New Cards",
          newCardGatherPriority: 4,
          newCardSortOrder: 4,
        },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

function asText(content: string | Uint8Array): string {
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

function imageFilename(field: string): string {
  const match = /^<img src="([^"]+)" alt="">$/.exec(field);
  if (!match) {
    throw new Error(`invalid image field: ${field}`);
  }
  return match[1];
}
