// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  DECK_CONFIG_ID,
  NOTE_TO_POSITIONS_DECK_ID,
  POSITION_TO_NOTE_DECK_ID,
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
  FRONT_TEMPLATE,
  NOTE_TO_POSITIONS_DECK_NAME,
  POSITION_TO_NOTE_DECK_NAME,
  ROOT_DECK_NAME,
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
    for (const template of [
      FRONT_TEMPLATE,
      BACK_TEMPLATE,
      WEB_FRONT_TEMPLATE,
      WEB_BACK_TEMPLATE,
    ]) {
      expect(template.indexOf('class="position"')).toBeLessThan(
        template.indexOf('class="diagram"'),
      );
    }
    for (const template of [FRONT_TEMPLATE, WEB_FRONT_TEMPLATE]) {
      expect(template).toContain('{{#Fret}}<span class="position-pair"><span class="position-question">{{String}}-{{Fret}}</span><span class="position-answer" style="visibility: hidden" aria-hidden="true">{{Note}}</span></span>{{/Fret}}');
    }
    for (const template of [BACK_TEMPLATE, WEB_BACK_TEMPLATE]) {
      expect(template).toContain('{{#Fret}}<span class="position-pair"><span class="position-question">{{String}}-{{Fret}}</span><span class="position-answer">{{Note}}</span></span>{{/Fret}}');
    }
    expect(FRONT_TEMPLATE).toContain(
      '{{#Positions}}<span class="position-pair"><span class="position-question">{{Note}}</span><span class="position-answer" style="visibility: hidden" aria-hidden="true">{{Positions}}</span></span>{{/Positions}}',
    );
    expect(BACK_TEMPLATE).toContain(
      '{{#Positions}}<span class="position-pair"><span class="position-question">{{Note}}</span><span class="position-answer">{{Positions}}</span></span>{{/Positions}}',
    );
  });

  test("creates both drill directions with front and back images", () => {
    const artifacts = createDeckArtifacts();

    expect(artifacts.notes).toHaveLength(282);
    expect(artifacts.media).toHaveLength(564);
    expect(new Set(artifacts.media.map(({ filename }) => filename)).size).toBe(
      564,
    );
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === POSITION_TO_NOTE_DECK_ID,
      ),
    ).toHaveLength(150);
    expect(
      artifacts.notes.filter(
        ({ deckId }) => deckId === NOTE_TO_POSITIONS_DECK_ID,
      ),
    ).toHaveLength(132);

    const mediaByFilename = new Map(
      artifacts.media.map(({ filename, content }) => [filename, content]),
    );

    // Every question dot carries the same mark, whichever note answers it, and
    // an answer with two names writes them one over the other.
    const accidental = artifacts.notes.find(
      ({ id }) => id === "position-to-note-string-3-fret-1",
    );
    expect(accidental?.fields.slice(1, 5)).toEqual([
      "enharmonic",
      "3",
      "1",
      "G♯A♭",
    ]);
    expect(accidental?.tags).toEqual([
      "spelling::enharmonic",
      "direction::position-to-note",
    ]);
    const accidentalFrontSvg = asText(
      mediaByFilename.get(imageFilename(accidental!.fields[5]))!,
    );
    const accidentalBackSvg = asText(
      mediaByFilename.get(imageFilename(accidental!.fields[6]))!,
    );
    expect(accidentalFrontSvg).toContain('data-label-kind="cue"');
    expect(accidentalFrontSvg).toContain(">?</text>");
    expect(accidentalBackSvg).toContain(
      'class="fretboard__label fretboard__label--stacked"',
    );
    expect(accidentalBackSvg).toContain(">G♯</tspan>");
    expect(accidentalBackSvg).toContain(">A♭</tspan>");

    const natural = artifacts.notes.find(
      ({ id }) => id === "position-to-note-string-3-fret-0",
    );
    expect(natural?.fields.slice(1, 5)).toEqual(["natural", "3", "0", "G"]);
    const naturalFrontSvg = asText(
      mediaByFilename.get(imageFilename(natural!.fields[5]))!,
    );
    const naturalBackSvg = asText(
      mediaByFilename.get(imageFilename(natural!.fields[6]))!,
    );
    expect(naturalFrontSvg).toContain(
      'class="fretboard__target" data-string="3" data-fret="0"',
    );
    expect(naturalFrontSvg).toContain(">?</text>");
    expect(naturalBackSvg).toContain(">G</text>");
    expect(artifacts.media[0].filename).toMatch(
      /^guitar-fretboard-position-to-note-string-1-fret-0-front-[0-9a-f]{12}\.svg$/,
    );

    const openE = artifacts.notes.find(
      ({ id }) => id === "note-to-positions-natural-string-1-pitch-7",
    );
    expect(openE?.fields.slice(1, 8)).toEqual([
      "natural",
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

    // A pitch with two names is also asked under both at once.
    const enharmonic = artifacts.notes.find(
      ({ id }) => id === "note-to-positions-enharmonic-string-3-pitch-11",
    );
    expect(enharmonic?.fields.slice(1, 5)).toEqual([
      "enharmonic",
      "3",
      "",
      "G♯A♭",
    ]);
    const enharmonicBackSvg = asText(
      mediaByFilename.get(imageFilename(enharmonic!.fields[6]))!,
    );
    expect(enharmonicBackSvg).toContain(">G♯</tspan>");
    expect(enharmonicBackSvg).toContain(">A♭</tspan>");
  });

  test("creates stable, unique IDs and GUIDs", () => {
    const first = createDeckArtifacts();
    const second = createDeckArtifacts();

    expect(first.notes.map(({ id }) => id)).toEqual(CARDS.map(({ id }) => id));
    expect(first.notes.map(({ guid }) => guid)).toEqual(
      second.notes.map(({ guid }) => guid),
    );
    expect(new Set(first.notes.map(({ guid }) => guid)).size).toBe(282);
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

      expect(summary.noteCount).toBe(282);
      expect(summary.cardCount).toBe(282);
      expect(summary.deckCount).toBe(3);
      expect(summary.cardsByDeck).toEqual({
        [ROOT_DECK_NAME]: 0,
        [POSITION_TO_NOTE_DECK_NAME]: 150,
        [NOTE_TO_POSITIONS_DECK_NAME]: 132,
      });
      expect(summary.modelCount).toBe(1);
      expect(summary.mediaCount).toBe(564);
      expect(new Set(summary.mediaFilenames).size).toBe(564);
      expect(new Set(summary.noteGuids).size).toBe(282);
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
