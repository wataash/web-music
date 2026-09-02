// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  createWebDeckData,
  DECK_CONFIG_ID,
  MODEL_ID,
  OCTAVE_NUMBER_CLEF_DECK_IDS,
  STAFF_TO_NOTE_CLEF_DECK_IDS,
} from "./apkg";
import { CARDS, CLEFS, DIRECTIONS } from "./cards";
import {
  createDeckArtifacts,
  createWebDeckArtifacts,
  generateAnkiDeck,
} from "./generate";
import {
  BACK_TEMPLATE,
  CARD_CSS,
  FIELD_NAMES,
  FRONT_TEMPLATE,
  OCTAVE_NUMBER_CLEF_DECK_NAMES,
  OCTAVE_NUMBER_DIRECTION_DECK_NAMES,
  OCTAVE_NUMBER_ROOT_DECK_NAME,
  ROOT_DECK_NAME,
  STAFF_TO_NOTE_CLEF_DECK_NAMES,
  STAFF_TO_NOTE_DECK_NAME,
  WEB_BACK_TEMPLATE,
  WEB_FRONT_TEMPLATE,
} from "./template";

function asText(content: string | Uint8Array): string {
  return typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
}

function imageFilename(field: string): string {
  const match = /^<img(?: class="[^"]*")? src="([^"]+)" alt="">$/.exec(field);
  if (!match) throw new Error(`invalid image field: ${field}`);
  return match[1];
}

describe("staff reading deck generation", () => {
  test("uses a fixed dark card theme", () => {
    expect(CARD_CSS).toContain("background: #111827");
    expect(CARD_CSS).toContain("color: #f3f4f6");
    expect(CARD_CSS).toContain("color-scheme: dark");
    expect(CARD_CSS).not.toContain(".nightMode");
    expect(CARD_CSS).not.toContain(".night_mode");
  });

  test("drives both directions from whether Prompt is filled", () => {
    expect(FRONT_TEMPLATE).toContain('<div class="prompt">{{Prompt}}</div>');
    expect(FRONT_TEMPLATE).toContain(
      '<div class="diagram">{{QuestionImage}}</div>',
    );
    expect(FRONT_TEMPLATE).not.toContain("{{Pitch}}");
    expect(FRONT_TEMPLATE).not.toContain("{{AnswerImage}}");
    expect(BACK_TEMPLATE).toContain('<div class="prompt">{{Prompt}}</div>');
    expect(BACK_TEMPLATE).toContain(
      '<div class="diagram">{{AnswerImage}}</div>',
    );
    // The keyboard carries the answer, so the back never writes it out.
    expect(BACK_TEMPLATE).not.toContain("DisplayPitch");
    // The keyboard is given on a note-to-staff question and revealed on every
    // answer; on a staff-to-note question it would be the answer itself.
    // Both keyboards are diagrams, which is what makes tapping one reveal
    // the answer.
    expect(FRONT_TEMPLATE).toContain(
      '{{#Prompt}}<div class="diagram keyboard">{{KeyboardImage}}</div>{{/Prompt}}',
    );
    // A staff-to-note question shows the keyboard with nothing on it yet.
    expect(FRONT_TEMPLATE).toContain(
      '{{^Prompt}}<div class="diagram keyboard">{{BlankKeyboardImage}}</div>{{/Prompt}}',
    );
    expect(BACK_TEMPLATE).toContain(
      '<div class="diagram keyboard">{{KeyboardImage}}</div>',
    );
    expect(CARD_CSS).toContain(".prompt:empty");
  });

  test("creates one note per card and shares staff images between them", () => {
    const artifacts = createDeckArtifacts();

    expect(artifacts.notes).toHaveLength(396);
    // 132 drawn staves reused by both directions, plus one empty staff per
    // clef, plus a keyboard per pitch in each of its two layouts and a bare
    // one per octave in each. The four clefs share those, since a keyboard
    // does not depend on the clef.
    expect(artifacts.media).toHaveLength(235);
    expect(new Set(artifacts.media.map(({ filename }) => filename)).size).toBe(
      235,
    );
    expect(
      artifacts.media.filter(({ filename }) =>
        filename.startsWith("music-staff-keyboard-"),
      ),
    ).toHaveLength(99);
    // A bare keyboard per octave the deck spans, and a single bare piano.
    expect(
      artifacts.media.filter(({ filename }) => filename.includes("-blank-")),
    ).toHaveLength(9);
    for (const clef of CLEFS) {
      expect(
        artifacts.notes.filter(
          ({ deckId }) => deckId === STAFF_TO_NOTE_CLEF_DECK_IDS[clef],
        ),
      ).toHaveLength(33);
      for (const direction of DIRECTIONS) {
        expect(
          artifacts.notes.filter(
            ({ deckId }) =>
              deckId === OCTAVE_NUMBER_CLEF_DECK_IDS[direction][clef],
          ),
        ).toHaveLength(33);
      }
    }
  });

  test("fills every field from the card data", () => {
    const artifacts = createDeckArtifacts();
    const mediaByFilename = new Map(
      artifacts.media.map(({ filename, content }) => [filename, content]),
    );

    const read = artifacts.notes.find(
      ({ id }) => id === "staff-to-note-treble-c4",
    );
    expect(read?.fields).toHaveLength(FIELD_NAMES.length);
    expect(read?.fields.slice(0, 7)).toEqual([
      "staff-to-note-treble-c4",
      "treble",
      "C4",
      "C",
      "4",
      "",
      "C",
    ]);
    expect(read?.tags).toEqual(["clef::treble", "direction::staff-to-note"]);

    // Reading a staff shows the same image on both sides.
    expect(read?.fields[7]).toBe(read?.fields[8]);

    const octaveRead = artifacts.notes.find(
      ({ id }) => id === "staff-to-note-treble-c4-with-octave-numbers",
    );
    const octaveWrite = artifacts.notes.find(
      ({ id }) => id === "note-to-staff-treble-c4-with-octave-numbers",
    );
    expect(octaveRead?.fields.slice(0, 7)).toEqual([
      "staff-to-note-treble-c4-with-octave-numbers",
      "treble",
      "C4",
      "C",
      "4",
      "",
      "C4",
    ]);
    expect(octaveWrite?.fields.slice(0, 7)).toEqual([
      "note-to-staff-treble-c4-with-octave-numbers",
      "treble",
      "C4",
      "C",
      "4",
      "C4",
      "C4",
    ]);
    expect(octaveRead?.tags).toContain("notation::with-octave-numbers");
    expect(octaveWrite?.tags).toEqual([
      "clef::treble",
      "direction::note-to-staff",
      "notation::with-octave-numbers",
    ]);

    // The octave-number writing card asks against an empty staff and answers
    // with the same drawn note used by both reading decks.
    expect(octaveWrite?.fields[7]).not.toBe(octaveWrite?.fields[8]);
    expect(octaveWrite?.fields[8]).toBe(read?.fields[8]);
    expect(octaveRead?.fields[8]).toBe(read?.fields[8]);

    const questionSvg = asText(
      mediaByFilename.get(imageFilename(octaveWrite!.fields[7]))!,
    );
    const answerSvg = asText(
      mediaByFilename.get(imageFilename(octaveWrite!.fields[8]))!,
    );
    expect(questionSvg).toContain('data-clef="treble"');
    expect(questionSvg).not.toContain('<g class="staff__note"');
    expect(answerSvg).toContain('<g class="staff__note" data-step="-2"');
    // The shared image is also a question, so it must not name the note.
    expect(answerSvg).not.toContain('class="staff__answer"');
    expect(answerSvg).not.toContain('<title id="title">C4');

    const altoC4 = artifacts.notes.find(
      ({ id }) => id === "staff-to-note-alto-c4",
    );
    const tenorC4 = artifacts.notes.find(
      ({ id }) => id === "staff-to-note-tenor-c4",
    );
    expect(altoC4?.fields[8]).not.toBe(tenorC4?.fields[8]);
    expect(
      asText(mediaByFilename.get(imageFilename(altoC4!.fields[8]))!),
    ).toContain('<g class="staff__note" data-step="4"');
    expect(
      asText(mediaByFilename.get(imageFilename(tenorC4!.fields[8]))!),
    ).toContain('<g class="staff__note" data-step="6"');
  });

  test("names media files after their staff and content hash", () => {
    const artifacts = createDeckArtifacts();

    expect(artifacts.media[0].filename).toMatch(
      /^music-staff-treble-g2-[0-9a-f]{12}\.svg$/,
    );
    for (const { filename } of artifacts.media) {
      expect(filename).toMatch(
        /^music-staff-((treble|bass|alto|tenor)-([a-g]-?\d+|empty)|keyboard-(octave|piano)-([a-g]-?\d+|blank))-[0-9a-f]{12}\.svg$/,
      );
    }
    expect(
      artifacts.media.filter(({ filename }) => filename.includes("-empty-")),
    ).toHaveLength(4);
    expect(artifacts.media.map(({ filename }) => filename)).toEqual(
      createDeckArtifacts().media.map(({ filename }) => filename),
    );
  });

  test("creates stable, unique IDs and GUIDs", () => {
    const first = createDeckArtifacts();
    const second = createDeckArtifacts();

    expect(first.notes.map(({ id }) => id)).toEqual([
      ...CARDS.filter(({ direction }) => direction === "staff-to-note").map(
        ({ id }) => id,
      ),
      ...CARDS.map(({ id }) => `${id}-with-octave-numbers`),
    ]);
    expect(first.notes.map(({ guid }) => guid)).toEqual(
      second.notes.map(({ guid }) => guid),
    );
    expect(new Set(first.notes.map(({ guid }) => guid)).size).toBe(396);
  });

  test("creates web deck data the flashcards app can import", () => {
    const artifacts = createWebDeckArtifacts();
    const deck = createWebDeckData(artifacts.notes, artifacts.media);

    expect(deck.rootDeckNames).toEqual([
      ROOT_DECK_NAME,
      OCTAVE_NUMBER_ROOT_DECK_NAME,
    ]);
    expect(deck.decks).toHaveLength(17);
    expect(deck.decks.map(({ name }) => name)).toEqual([
      ROOT_DECK_NAME,
      STAFF_TO_NOTE_DECK_NAME,
      ...CLEFS.map((clef) => STAFF_TO_NOTE_CLEF_DECK_NAMES[clef]),
      OCTAVE_NUMBER_ROOT_DECK_NAME,
      OCTAVE_NUMBER_DIRECTION_DECK_NAMES["staff-to-note"],
      ...CLEFS.map(
        (clef) => OCTAVE_NUMBER_CLEF_DECK_NAMES["staff-to-note"][clef],
      ),
      OCTAVE_NUMBER_DIRECTION_DECK_NAMES["note-to-staff"],
      ...CLEFS.map(
        (clef) => OCTAVE_NUMBER_CLEF_DECK_NAMES["note-to-staff"][clef],
      ),
    ]);
    expect(
      deck.decks
        .filter(({ hiddenByDefault }) => hiddenByDefault === true)
        .map(({ name }) => name),
    ).toEqual([
      // The clefs a violist or a trombonist reads, and the whole deck with
      // octave numbers.
      STAFF_TO_NOTE_CLEF_DECK_NAMES.alto,
      STAFF_TO_NOTE_CLEF_DECK_NAMES.tenor,
      OCTAVE_NUMBER_ROOT_DECK_NAME,
      OCTAVE_NUMBER_DIRECTION_DECK_NAMES["staff-to-note"],
      ...CLEFS.map(
        (clef) => OCTAVE_NUMBER_CLEF_DECK_NAMES["staff-to-note"][clef],
      ),
      OCTAVE_NUMBER_DIRECTION_DECK_NAMES["note-to-staff"],
      ...CLEFS.map(
        (clef) => OCTAVE_NUMBER_CLEF_DECK_NAMES["note-to-staff"][clef],
      ),
    ]);
    expect(deck.models).toHaveLength(1);
    expect(deck.models[0].mid).toBe(MODEL_ID);
    expect(deck.models[0].fieldNames).toEqual(FIELD_NAMES);
    expect(deck.models[0].templates).toHaveLength(1);
    expect(deck.notes).toHaveLength(396);
    expect(deck.cards).toHaveLength(396);
    expect(deck.media).toEqual([]);
    const read = artifacts.notes.find(
      ({ id }) => id === "staff-to-note-treble-c4",
    )!;
    const write = artifacts.notes.find(
      ({ id }) => id === "note-to-staff-treble-c4-with-octave-numbers",
    )!;
    expect(read.fields.slice(7)).toEqual([
      "treble|C4",
      "treble|C4",
      "octave|C4|C",
      "octave|4",
    ]);
    expect(write.fields.slice(7)).toEqual([
      "treble",
      "treble|C4",
      "piano|C4|C4",
      "piano",
    ]);
    expect(WEB_FRONT_TEMPLATE).toContain("data-staff");
    expect(WEB_FRONT_TEMPLATE).toContain('scopeLabels(svg, "keyboard")');
    expect(WEB_BACK_TEMPLATE).toContain("staff__ledger-line");
    expect(JSON.stringify(deck).length).toBeLessThan(300_000);
    expect(deck.notes[0].tags).toBe("clef::treble direction::staff-to-note");
    expect(new Set(deck.cards.map(({ did }) => did)).size).toBe(12);
    expect(new Set(deck.cards.map(({ newOrder }) => newOrder)).size).toBe(396);
  });

  test("writes an inspectable Anki package", async () => {
    const directory = await mkdtemp(join(tmpdir(), "music-staff-test-"));
    const outputPath = join(directory, "deck.apkg");

    try {
      const summary = await generateAnkiDeck(outputPath);

      expect(summary.noteCount).toBe(396);
      expect(summary.cardCount).toBe(396);
      expect(summary.deckCount).toBe(17);
      expect(summary.cardsByDeck).toEqual({
        [ROOT_DECK_NAME]: 0,
        [STAFF_TO_NOTE_DECK_NAME]: 0,
        [STAFF_TO_NOTE_CLEF_DECK_NAMES.treble]: 33,
        [STAFF_TO_NOTE_CLEF_DECK_NAMES.bass]: 33,
        [STAFF_TO_NOTE_CLEF_DECK_NAMES.alto]: 33,
        [STAFF_TO_NOTE_CLEF_DECK_NAMES.tenor]: 33,
        [OCTAVE_NUMBER_ROOT_DECK_NAME]: 0,
        [OCTAVE_NUMBER_DIRECTION_DECK_NAMES["staff-to-note"]]: 0,
        [OCTAVE_NUMBER_CLEF_DECK_NAMES["staff-to-note"].treble]: 33,
        [OCTAVE_NUMBER_CLEF_DECK_NAMES["staff-to-note"].bass]: 33,
        [OCTAVE_NUMBER_CLEF_DECK_NAMES["staff-to-note"].alto]: 33,
        [OCTAVE_NUMBER_CLEF_DECK_NAMES["staff-to-note"].tenor]: 33,
        [OCTAVE_NUMBER_DIRECTION_DECK_NAMES["note-to-staff"]]: 0,
        [OCTAVE_NUMBER_CLEF_DECK_NAMES["note-to-staff"].treble]: 33,
        [OCTAVE_NUMBER_CLEF_DECK_NAMES["note-to-staff"].bass]: 33,
        [OCTAVE_NUMBER_CLEF_DECK_NAMES["note-to-staff"].alto]: 33,
        [OCTAVE_NUMBER_CLEF_DECK_NAMES["note-to-staff"].tenor]: 33,
      });
      expect(summary.modelCount).toBe(1);
      expect(summary.mediaCount).toBe(235);
      expect(new Set(summary.mediaFilenames).size).toBe(235);
      expect(new Set(summary.noteGuids).size).toBe(396);
      expect(
        summary.noteFields.every(
          (fields) => fields.length === FIELD_NAMES.length,
        ),
      ).toBe(true);
      expect(new Set(summary.newCardIdsByDue)).toEqual(
        new Set(
          [
            ...CARDS.filter(
              ({ direction }) => direction === "staff-to-note",
            ).map(({ id }) => id),
            ...CARDS.map(({ id }) => `${id}-with-octave-numbers`),
          ],
        ),
      );
      expect(summary.newCardIdsByDue).not.toEqual(
        [
          ...CARDS.filter(
            ({ direction }) => direction === "staff-to-note",
          ).map(({ id }) => id),
          ...CARDS.map(({ id }) => `${id}-with-octave-numbers`),
        ],
      );
      expect(summary.deckConfigs).toEqual({
        [DECK_CONFIG_ID]: {
          name: "Music Staff — Random New Cards",
          newCardGatherPriority: 4,
          newCardSortOrder: 4,
        },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
