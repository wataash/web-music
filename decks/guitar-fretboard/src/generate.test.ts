// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeAll, describe, expect, test } from "vitest";

import {
  DECK_CONFIG_ID,
  NOTE_TO_POSITIONS_DECK_ID,
  POSITION_TO_NOTE_DECK_ID,
  createWebDeckData,
} from "./apkg";
import { CARDS } from "./cards";
import {
  createDeckArtifacts,
  createDeckNotes,
  createWebDeck,
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
  let artifacts: ReturnType<typeof createDeckArtifacts>;
  beforeAll(() => {
    artifacts = createDeckArtifacts();
  });
  test("uses a fixed dark card theme", () => {
    expect(CARD_CSS).toContain("background: #111827");
    expect(CARD_CSS).toContain("color: #f3f4f6");
    expect(CARD_CSS).toContain("color-scheme: dark");
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
    for (const [front, back] of [[FRONT_TEMPLATE, BACK_TEMPLATE], [WEB_FRONT_TEMPLATE, WEB_BACK_TEMPLATE]]) {
      for (const template of [front, back]) {
        expect(template).toContain("{{#Fret}}");
        expect(template).toContain("{{String}}-{{Fret}}");
      }
      const hiddenAnswer = front.match(/<span([^>]*)>{{Note}}<\/span>/)![1];
      expect(hiddenAnswer).toContain('aria-hidden="true"');
      expect(hiddenAnswer).toMatch(/visibility:\s*hidden/);
      expect(back.match(/<span([^>]*)>{{Note}}<\/span>/)![1]).not.toMatch(/aria-hidden|visibility/);
    }
    for (const template of [FRONT_TEMPLATE, BACK_TEMPLATE]) {
      expect(template).toContain("{{#Positions}}");
      expect(template).toContain("{{Positions}}");
    }
    expect(FRONT_TEMPLATE.match(/<span([^>]*)>{{Positions}}<\/span>/)![1]).toContain('aria-hidden="true"');
    expect(BACK_TEMPLATE.match(/<span([^>]*)>{{Positions}}<\/span>/)![1]).not.toMatch(/aria-hidden|visibility/);
  });

  test("creates both drill directions with front and back images", () => {
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
    const first = artifacts;
    const second = createDeckArtifacts();
    expect(first.media.map(({ filename }) => filename)).toEqual(second.media.map(({ filename }) => filename));

    expect(first.notes.map(({ id }) => id)).toEqual(CARDS.map(({ id }) => id));
    expect(first.notes.map(({ guid }) => guid)).toEqual(
      second.notes.map(({ guid }) => guid),
    );
    expect(new Set(first.notes.map(({ guid }) => guid)).size).toBe(282);
  });

  test("keeps the web deck small and free of SVG media", () => {
    const notes = createDeckNotes();
    const deck = createWebDeck();

    expect(deck.media).toEqual([]);
    expect(
      notes.every(
        ({ fields }) => fields[5] === "" && fields[6] === "" && fields[8] === "64 59 55 50 45 40",
      ),
    ).toBe(true);
    expect(createWebDeckData(notes, [])).toEqual(deck);
    expect(WEB_FRONT_TEMPLATE).not.toContain('data-note="{{Note}}" data-fret');
    expect(WEB_BACK_TEMPLATE).toContain('data-note="{{Note}}"');
    expect(JSON.stringify(deck).length).toBeLessThan(250_000);
  });

  test("draws another instrument its own neck under its own guids", () => {
    const bass = [43, 38, 33, 28];
    const deck = createWebDeck(bass);
    const standard = createWebDeck();
    expect(deck.notes).toHaveLength(4 * 25 + 4 * 22);
    expect(deck.decks).toEqual(standard.decks);
    const standardGuids = new Set(standard.notes.map(({ guid }) => guid));
    expect(deck.notes.some(({ guid }) => standardGuids.has(guid))).toBe(false);
    for (const note of deck.notes) {
      expect(note.fields[8]).toBe("43 38 33 28");
      expect(Number(note.fields[2])).toBeLessThanOrEqual(4);
    }
    // The open E on the lowest string: string 4 of a bass is E1.
    const lowE = deck.notes.find((note) => note.fields[0] === "position-to-note-string-4-fret-0");
    expect(lowE?.fields[4]).toBe("E");
    // A card's tuning is what the template draws the neck from.
    expect(WEB_FRONT_TEMPLATE).toContain('data-tuning="{{Tuning}}"');
    expect(WEB_BACK_TEMPLATE).toContain('data-tuning="{{Tuning}}"');
    // The heading drops 24F on whichever string, not only a guitar's six.
    expect(WEB_BACK_TEMPLATE).toContain("/^\\d+-24$/");
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
      expect(summary.noteFields.every((fields) => fields.length === 9)).toBe(
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
