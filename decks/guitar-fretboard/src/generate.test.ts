// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  DECK_CONFIG_ID,
  FLATS_DECK_ID,
  NATURALS_DECK_ID,
  NOTE_TO_POSITIONS_FLATS_DECK_ID,
  NOTE_TO_POSITIONS_NATURALS_DECK_ID,
  NOTE_TO_POSITIONS_SHARPS_DECK_ID,
  SHARPS_DECK_ID,
  createWebDeckData,
} from "./apkg";
import { CARDS } from "./cards";
import {
  createDeckArtifacts,
  createWebDeckArtifacts,
  generateAnkiDeck,
} from "./generate";
import {
  BACK_TEMPLATE,
  CARD_CSS,
  FLATS_DECK_NAME,
  FRONT_TEMPLATE,
  NATURALS_DECK_NAME,
  NOTE_TO_POSITIONS_DECK_NAME,
  NOTE_TO_POSITIONS_FLATS_DECK_NAME,
  NOTE_TO_POSITIONS_NATURALS_DECK_NAME,
  NOTE_TO_POSITIONS_SHARPS_DECK_NAME,
  POSITION_TO_NOTE_DECK_NAME,
  ROOT_DECK_NAME,
  SHARPS_DECK_NAME,
  WEB_BACK_TEMPLATE,
  WEB_FRONT_TEMPLATE,
} from "./template";

describe("Anki deck generation", () => {
  test("uses a fixed dark card theme", () => {
    expect(CARD_CSS).toContain("background: #111827");
    expect(CARD_CSS).toContain("color: #f3f4f6");
    expect(CARD_CSS).toContain("color-scheme: dark");
    expect(CARD_CSS).not.toContain(".nightMode .diagram");
    expect(CARD_CSS).not.toContain(".night_mode .diagram");
  });

  test("shows the string-fret position above the diagram on both sides", () => {
    for (const template of [FRONT_TEMPLATE, BACK_TEMPLATE]) {
      expect(template).toContain("{{#Fret}}{{String}}-{{Fret}}{{/Fret}}");
      expect(template.indexOf('class="position"')).toBeLessThan(
        template.indexOf('class="diagram"'),
      );
    }
    expect(FRONT_TEMPLATE).toContain(
      "{{#Positions}}{{Note}}{{/Positions}}",
    );
    expect(BACK_TEMPLATE).toContain(
      "{{#Positions}}{{Note}} {{Positions}}{{/Positions}}",
    );
  });

  test("creates both drill directions with front and back images", () => {
    const artifacts = createDeckArtifacts();

    expect(artifacts.notes).toHaveLength(576);
    expect(artifacts.media).toHaveLength(1152);
    expect(new Set(artifacts.media.map(({ filename }) => filename)).size).toBe(
      1152,
    );
    expect(
      artifacts.notes.filter(({ deckId }) => deckId === NATURALS_DECK_ID),
    ).toHaveLength(90);
    expect(
      artifacts.notes.filter(({ deckId }) => deckId === FLATS_DECK_ID),
    ).toHaveLength(150);
    expect(
      artifacts.notes.filter(({ deckId }) => deckId === SHARPS_DECK_ID),
    ).toHaveLength(150);
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === NOTE_TO_POSITIONS_NATURALS_DECK_ID,
      ),
    ).toHaveLength(42);
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === NOTE_TO_POSITIONS_FLATS_DECK_ID,
      ),
    ).toHaveLength(72);
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === NOTE_TO_POSITIONS_SHARPS_DECK_ID,
      ),
    ).toHaveLength(72);

    const flats = artifacts.notes.find(
      ({ id }) => id === "flats-string-3-fret-1",
    );
    const sharps = artifacts.notes.find(
      ({ id }) => id === "sharps-string-3-fret-1",
    );
    expect(flats?.fields.slice(1, 5)).toEqual(["flats", "3", "1", "A♭"]);
    expect(sharps?.fields.slice(1, 5)).toEqual([
      "sharps",
      "3",
      "1",
      "G♯",
    ]);
    expect(flats?.fields[5]).not.toBe(sharps?.fields[5]);
    expect(flats?.fields[6]).not.toBe(sharps?.fields[6]);

    const mediaByFilename = new Map(
      artifacts.media.map(({ filename, content }) => [filename, content]),
    );
    const flatFrontSvg = asText(
      mediaByFilename.get(imageFilename(flats!.fields[5]))!,
    );
    const sharpFrontSvg = asText(
      mediaByFilename.get(imageFilename(sharps!.fields[5]))!,
    );
    const flatBackSvg = asText(
      mediaByFilename.get(imageFilename(flats!.fields[6]))!,
    );
    const sharpBackSvg = asText(
      mediaByFilename.get(imageFilename(sharps!.fields[6]))!,
    );

    expect(flatFrontSvg).toContain('data-label-kind="cue"');
    expect(flatFrontSvg).toContain(">♭</text>");
    expect(sharpFrontSvg).toContain('data-label-kind="cue"');
    expect(sharpFrontSvg).toContain(">♯</text>");
    expect(flatBackSvg).toContain(">A♭</text>");
    expect(sharpBackSvg).toContain(">G♯</text>");
    expect(artifacts.media[0].filename).toMatch(
      /^guitar-fretboard-flats-string-1-fret-0-front-[0-9a-f]{12}\.svg$/,
    );

    const natural = artifacts.notes.find(
      ({ id }) => id === "naturals-string-3-fret-0",
    );
    expect(natural?.fields.slice(1, 5)).toEqual([
      "naturals",
      "3",
      "0",
      "G",
    ]);
    const naturalFrontSvg = asText(
      mediaByFilename.get(imageFilename(natural!.fields[5]))!,
    );
    expect(naturalFrontSvg).toContain(
      'class="fretboard__target" data-string="3" data-fret="0"',
    );
    expect(naturalFrontSvg).not.toContain('class="fretboard__label"');

    const openE = artifacts.notes.find(
      ({ id }) => id === "flats-note-to-positions-string-1-pitch-7",
    );
    expect(openE?.fields.slice(1, 8)).toEqual([
      "flats",
      "1",
      "",
      "E",
      expect.any(String),
      expect.any(String),
      "1-0 1-12 1-24",
    ]);
    expect(openE?.fields[7]).not.toContain("[");

    const openEFrontSvg = asText(
      mediaByFilename.get(imageFilename(openE!.fields[5]))!,
    );
    const openEBackSvg = asText(
      mediaByFilename.get(imageFilename(openE!.fields[6]))!,
    );
    expect(openEFrontSvg).toContain(
      'class="fretboard__string-highlight" data-string="1"',
    );
    expect(openEFrontSvg).not.toContain('class="fretboard__target"');
    expect(openEBackSvg.match(/class="fretboard__target"/g)).toHaveLength(3);
  });

  test("creates stable, unique IDs and GUIDs", () => {
    const first = createDeckArtifacts();
    const second = createDeckArtifacts();

    expect(first.notes.map(({ id }) => id)).toEqual(CARDS.map(({ id }) => id));
    expect(first.notes.map(({ guid }) => guid)).toEqual(
      second.notes.map(({ guid }) => guid),
    );
    expect(new Set(first.notes.map(({ guid }) => guid)).size).toBe(576);
  });

  test("keeps the web deck small and free of SVG media", () => {
    const artifacts = createWebDeckArtifacts();
    const deck = createWebDeckData(artifacts.notes, artifacts.media);

    expect(artifacts.media).toEqual([]);
    expect(
      artifacts.notes.every(
        ({ fields }) => fields[5] === "" && fields[6] === "",
      ),
    ).toBe(true);
    expect(WEB_FRONT_TEMPLATE).toContain("renderFretboardSvg");
    expect(WEB_FRONT_TEMPLATE).not.toContain('data-note="{{Note}}" data-fret');
    expect(WEB_BACK_TEMPLATE).toContain('data-note="{{Note}}"');
    expect(JSON.stringify(deck).length).toBeLessThan(250_000);
  });

  test("writes an inspectable Anki package", async () => {
    const directory = await mkdtemp(join(tmpdir(), "guitar-fretboard-test-"));
    const outputPath = join(directory, "deck.apkg");

    try {
      const summary = await generateAnkiDeck(outputPath);

      expect(summary.noteCount).toBe(576);
      expect(summary.cardCount).toBe(576);
      expect(summary.deckCount).toBe(9);
      expect(summary.cardsByDeck).toEqual({
        [ROOT_DECK_NAME]: 0,
        [POSITION_TO_NOTE_DECK_NAME]: 0,
        [NATURALS_DECK_NAME]: 90,
        [FLATS_DECK_NAME]: 150,
        [SHARPS_DECK_NAME]: 150,
        [NOTE_TO_POSITIONS_DECK_NAME]: 0,
        [NOTE_TO_POSITIONS_NATURALS_DECK_NAME]: 42,
        [NOTE_TO_POSITIONS_FLATS_DECK_NAME]: 72,
        [NOTE_TO_POSITIONS_SHARPS_DECK_NAME]: 72,
      });
      expect(summary.modelCount).toBe(1);
      expect(summary.mediaCount).toBe(1152);
      expect(new Set(summary.mediaFilenames).size).toBe(1152);
      expect(new Set(summary.noteGuids).size).toBe(576);
      expect(summary.noteFields.every((fields) => fields.length === 8)).toBe(
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
          name: "Guitar Fretboard — Random New Cards",
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
