// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { createWebPackage } from "@web-music/anki-apkg/package";

import { INTERVAL_CARDS, INTERVAL_IDENTIFICATION_CARDS } from "./cards";
import {
  createDeckArtifacts,
  createDeckNotes,
  createWebDeckArtifacts,
  generateAnkiDeck,
} from "./generate";
import { PACKAGE_SPEC, WEB_PACKAGE_SPEC } from "./package-spec";
import {
  BACK_TEMPLATE,
  CARD_CSS,
  FRONT_TEMPLATE,
  IDENTIFICATION_DECK_NAME,
  ROOT_DECK_NAME,
  WEB_BACK_TEMPLATE,
  WEB_FRONT_TEMPLATE,
} from "./template";

describe("interval deck generation", () => {
  it("holds one calculation card per pair and appends identification", () => {
    const notes = createDeckNotes();
    expect(notes).toHaveLength(
      INTERVAL_CARDS.length + INTERVAL_IDENTIFICATION_CARDS.length,
    );
    expect(new Set(notes.map(({ id }) => id)).size).toBe(notes.length);
    expect(
      notes.find(({ id }) => id === "interval-m3-c")?.fields.slice(0, 7),
    ).toEqual([
      "interval-m3-c", "interval", "C", "m3", "C m3", "E♭", "basic",
    ]);
    expect(
      notes
        .find(({ id }) => id === "identification-M3-c")
        ?.fields.slice(0, 7),
    ).toEqual([
      "identification-M3-c",
      "identification",
      "C",
      "M3",
      "C → E",
      "M3",
      "basic",
    ]);
    expect(notes.some(({ id }) => id === "identification-b9-c")).toBe(false);
    expect(notes[INTERVAL_CARDS.length]?.id).toMatch(/^identification-/);
  });

  it("introduces new cards by learning priority", () => {
    const deck = createWebPackage(PACKAGE_SPEC, createDeckNotes());
    const orderByNoteId = new Map(
      deck.cards.map(({ nid, newOrder }) => [nid, newOrder]),
    );
    // fields = [id, axis, root, interval label, question, answer, difficulty,
    // keyboard]
    const ordersOf = (label: string): readonly number[] => {
      const orders = deck.notes
        .filter(({ fields }) => fields[1] === "interval" && fields[3] === label)
        .map(({ id }) => orderByNoteId.get(id)!);
      expect(orders).toHaveLength(
        INTERVAL_CARDS.filter(({ interval }) => interval.label === label)
          .length,
      );
      return orders;
    };

    // Every P5 card is introduced before every ♭13 one, whatever the root.
    expect(Math.max(...ordersOf("P5"))).toBeLessThan(
      Math.min(...ordersOf("♭13")),
    );
    // Within one degree the roots stay shuffled rather than in fifths order.
    const p5 = ordersOf("P5");
    expect(p5).not.toEqual([...p5].sort((left, right) => left - right));
  });

  it("puts every calculation card in one flat deck", () => {
    const deck = createWebPackage(PACKAGE_SPEC, createDeckNotes());
    expect(deck.rootDeckNames).toEqual([
      ROOT_DECK_NAME,
      IDENTIFICATION_DECK_NAME,
    ]);
    expect(deck.decks.map(({ name }) => name)).toEqual([
      ROOT_DECK_NAME,
      IDENTIFICATION_DECK_NAME,
    ]);
    const calculationDid = deck.decks[0].did;
    expect(
      deck.cards.every(({ did }) => did === calculationDid || did === deck.decks[1].did),
    ).toBe(true);
  });

  it("draws fixed 37-key front and answer keyboards for Anki", () => {
    const { notes, media } = createDeckArtifacts();
    const filenames = new Set(media.map(({ filename }) => filename));
    const images = (field: string): readonly string[] =>
      [...field.matchAll(/src="([^"]+)"/g)].map(([, filename]) => filename);

    for (const { fields } of notes) {
      expect(images(fields[7])).toHaveLength(1);
      expect(images(fields[8])).toHaveLength(1);
      expect(images(fields[7]).every((filename) => filenames.has(filename))).toBe(
        true,
      );
      expect(images(fields[8]).every((filename) => filenames.has(filename))).toBe(
        true,
      );
    }
    expect(FRONT_TEMPLATE).toContain("{{Keyboard}}");
    expect(BACK_TEMPLATE).toContain("{{AnswerKeyboard}}");
    // The arrow stands between the two on both sides, so the answer takes the
    // question mark's place rather than moving the line.
    const question =
      '<span class="question">{{Question}}</span>' +
      '<span class="answer-arrow">→</span>';
    expect(FRONT_TEMPLATE).toContain(
      `${question}<span class="answer-value">?</span>`,
    );
    expect(BACK_TEMPLATE).toContain(
      `${question}<span class="answer-value">{{Answer}}</span>`,
    );
    expect(CARD_CSS).toMatch(
      /\.prompt-line \{[\s\S]*?grid-template-columns: 1fr auto 1fr;/,
    );
    expect(CARD_CSS).toMatch(/\.question \{\s*justify-self: end;/);
    expect(CARD_CSS).toMatch(
      /\.answer-value \{\s*justify-self: start;\s*color: #fcd34d;\s*\}/,
    );
    // C m3: the front names only the given note; the back also names E♭ on
    // both sides of it.
    const cm3 = notes.find(({ id }) => id === "interval-m3-c")!;
    expect(cm3.fields[7]).toContain(">C<");
    expect(cm3.fields[7]).not.toContain("E♭");
    expect(cm3.fields[8].match(/>E♭</g)).toHaveLength(2);
    expect(cm3.fields[8]).toContain(">C<");
    // Two cards that sound alike share a drawing: C→E♭ and B♯→D♯ are the same
    // root and answer keys on the fixed board.
    const bSharp = notes.find(({ id }) => id === "interval-m3-b-sharp")!;
    expect(images(cm3.fields[7])).toEqual(images(bSharp.fields[7]));
    expect(images(cm3.fields[8])).toEqual(images(bSharp.fields[8]));
    expect(cm3.fields[8]).not.toContain("keyboard-option");
  });

  it("keeps web notes small and draws them from note names", () => {
    const artifacts = createWebDeckArtifacts();
    const cm3 = artifacts.notes.find(({ id }) => id === "interval-m3-c")!;
    const identified = artifacts.notes.find(
      ({ id }) => id === "identification-M3-c",
    )!;

    expect(artifacts.media).toEqual([]);
    expect(
      artifacts.notes.every(
        ({ fields }) => fields[7] === "" && !fields.join("").includes("<svg"),
      ),
    ).toBe(true);
    expect(cm3.fields[7]).toBe("");
    expect(cm3.fields[8]).toBe("E♭");
    // Identification's displayed answer is M3, while its keyboard answer is E.
    expect(identified.fields[5]).toBe("M3");
    expect(identified.fields[8]).toBe("E");
    expect(WEB_FRONT_TEMPLATE).toContain('data-root="{{Root}}"');
    expect(WEB_FRONT_TEMPLATE).not.toContain("{{AnswerKeyboard}}");
    expect(WEB_BACK_TEMPLATE).toContain(
      'data-answer="{{AnswerKeyboard}}"',
    );
    expect(WEB_FRONT_TEMPLATE).toContain("drawIntervalKeyboard");

    const web = createWebPackage(WEB_PACKAGE_SPEC, artifacts.notes);
    expect(JSON.stringify(web).length).toBeLessThan(600_000);
  });

  it("writes a modern Anki package", async () => {
    const directory = await mkdtemp(join(tmpdir(), "intervals-test-"));
    const outputPath = join(directory, "intervals.apkg");
    try {
      const summary = await generateAnkiDeck(outputPath);
      expect(summary).toEqual({
        deckCount: 2,
        noteCount:
          INTERVAL_CARDS.length + INTERVAL_IDENTIFICATION_CARDS.length,
        mediaCount: createDeckArtifacts().media.length,
      });
      const zip = await JSZip.loadAsync(await readFile(outputPath));
      expect(zip.file("meta")).not.toBeNull();
      expect(zip.file("collection.anki21b")).not.toBeNull();
      expect(zip.file("collection.anki2")).not.toBeNull();
      expect(zip.file("media")).not.toBeNull();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
