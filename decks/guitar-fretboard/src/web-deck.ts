// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The deck's notes and the document the web app imports, for any instrument.
// Nothing from node here: the app generates the deck for the reader's own
// tuning, and apkg.ts writes the Anki package from the same rows.

import { sha256Base64Url, sha256Hex } from "@web-music/anki-apkg/web-package";
import { tuningSlug } from "@web-music/practice-ui/tuning";

import {
  STANDARD_TUNING,
  fretboardCards,
  type FretboardCard,
  type Tuning,
} from "./cards";
import {
  CARD_CSS,
  FIELD_NAMES,
  MODEL_NAME,
  NOTE_TO_POSITIONS_DECK_NAME,
  POSITION_TO_NOTE_DECK_NAME,
  ROOT_DECK_NAME,
  WEB_BACK_TEMPLATE,
  WEB_FRONT_TEMPLATE,
} from "./template";

export const MODEL_ID = 1_786_800_000_000;
export const ROOT_DECK_ID = 1_786_800_000_001;
export const DECK_CONFIG_ID = 1_786_800_000_004;
export const POSITION_TO_NOTE_DECK_ID = 1_786_800_000_005;
export const NOTE_TO_POSITIONS_DECK_ID = 1_786_800_000_006;

const NOTE_ID_BASE = 1_786_800_100_000;
const CARD_ID_BASE = 1_786_800_200_000;
export const TEMPLATE_NAME = "Card 1";

type DeckDefinition = Readonly<{
  id: number;
  name: string;
  description: string;
}>;

export const DECK_DEFINITIONS: readonly DeckDefinition[] = [
  {
    id: ROOT_DECK_ID,
    name: ROOT_DECK_NAME,
    description:
      "Position-to-note and note-to-position drills for the guitar fretboard.",
  },
  {
    id: POSITION_TO_NOTE_DECK_ID,
    name: POSITION_TO_NOTE_DECK_NAME,
    description:
      "Identify the note name at a marked fretboard position, spelt under both of its names where it has two.",
  },
  {
    id: NOTE_TO_POSITIONS_DECK_ID,
    name: NOTE_TO_POSITIONS_DECK_NAME,
    description:
      "Recall every occurrence of a note on one guitar string, under its natural, flat, sharp or both-names spelling.",
  },
];

export type PackageNote = Readonly<{
  id: string;
  guid: string;
  deckId: number;
  fields: readonly string[];
  tags: readonly string[];
}>;

export type MediaFile = Readonly<{
  filename: string;
  content: string | Uint8Array;
}>;

export type NoteRow = Readonly<{
  noteId: number;
  cardId: number;
  deckId: number;
  guid: string;
  fields: readonly string[];
  tags: readonly string[];
  due: number;
}>;

// Another instrument is another deck of cards under the same names: its guids
// come from its own namespace, so its study state is its own, and it replaces
// the previous instrument's content on import. Standard guitar keeps the
// namespace everything was written under before there were other instruments.
export function packageNamespace(tuning: Tuning): string {
  const slug = tuningSlug(tuning);
  return slug === "" ? "guitar-fretboard" : `guitar-fretboard:${slug}`;
}

export function stableNoteGuid(id: string, tuning: Tuning = STANDARD_TUNING): string {
  return sha256Base64Url(`${packageNamespace(tuning)}:${id}`).slice(0, 16);
}

function shuffledOrderKey(noteId: string, namespace: string): string {
  return sha256Hex(`${namespace}:new-card-order:${noteId}`);
}

export function buildNoteRows(
  notes: readonly PackageNote[],
  tuning: Tuning = STANDARD_TUNING,
): readonly NoteRow[] {
  const namespace = packageNamespace(tuning);
  const dueByNoteId = new Map(
    [...notes]
      .sort((left, right) =>
        shuffledOrderKey(left.id, namespace).localeCompare(shuffledOrderKey(right.id, namespace)),
      )
      .map(({ id }, index) => [id, index + 1]),
  );
  return notes.map((note, index) => {
    const due = dueByNoteId.get(note.id);
    if (due === undefined) {
      throw new Error(`${note.id}: missing shuffled due position`);
    }
    return {
      noteId: NOTE_ID_BASE + index,
      cardId: CARD_ID_BASE + index,
      deckId: note.deckId,
      guid: note.guid,
      fields: note.fields,
      tags: note.tags,
      due,
    };
  });
}

export function createDeckNotes(tuning: Tuning = STANDARD_TUNING): readonly PackageNote[] {
  return fretboardCards(tuning).map((card) => createPackageNote(card, "", "", tuning));
}

export function createWebDeck(tuning: Tuning = STANDARD_TUNING): WebDeckData {
  return createWebDeckData(createDeckNotes(tuning), [], tuning);
}

// The Anki package carries an image per side; the web app's template draws
// the neck itself from the fields, so those are left empty.
export function createPackageNote(
  card: FretboardCard,
  frontImage: string,
  backImage: string,
  tuning: Tuning = STANDARD_TUNING,
): PackageNote {
  return {
    id: card.id,
    guid: stableNoteGuid(card.id, tuning),
    deckId: deckIdForCard(card),
    fields: [
      card.id,
      card.spelling,
      String(card.string),
      card.kind === "position-to-note" ? String(card.fret) : "",
      card.note,
      frontImage,
      backImage,
      card.kind === "note-to-positions" ? formatPositions(card) : "",
      tuning.join(" "),
    ],
    tags: [card.tag, `direction::${card.kind}`],
  };
}

function deckIdForCard(card: FretboardCard): number {
  return card.kind === "position-to-note"
    ? POSITION_TO_NOTE_DECK_ID
    : NOTE_TO_POSITIONS_DECK_ID;
}

export function formatPositions(
  card: Extract<FretboardCard, { kind: "note-to-positions" }>,
): string {
  return card.frets.map((fret) => `${card.string}-${fret}`).join(" ");
}

export type WebDeckData = Readonly<{
  models: readonly Readonly<{
    mid: number;
    name: string;
    css: string;
    fieldNames: readonly string[];
    templates: readonly Readonly<{
      name: string;
      ord: number;
      qfmt: string;
      afmt: string;
    }>[];
  }>[];
  decks: readonly Readonly<{ did: number; name: string }>[];
  notes: readonly Readonly<{
    id: number;
    guid: string;
    mid: number;
    fields: readonly string[];
    tags: string;
  }>[];
  cards: readonly Readonly<{
    id: number;
    nid: number;
    did: number;
    ord: number;
    newOrder: number;
  }>[];
  media: readonly Readonly<{ filename: string; data: string }>[];
  rootDeckNames: readonly string[];
}>;

export function createWebDeckData(
  notes: readonly PackageNote[],
  media: readonly MediaFile[],
  tuning: Tuning = STANDARD_TUNING,
): WebDeckData {
  validatePackageInput(notes, media);
  const rows = buildNoteRows(notes, tuning);
  return {
    models: [
      {
        mid: MODEL_ID,
        name: MODEL_NAME,
        css: CARD_CSS,
        fieldNames: FIELD_NAMES,
        templates: [
          {
            ord: 0,
            name: TEMPLATE_NAME,
            qfmt: WEB_FRONT_TEMPLATE,
            afmt: WEB_BACK_TEMPLATE,
          },
        ],
      },
    ],
    decks: DECK_DEFINITIONS.map(({ id, name }) => ({ did: id, name })),
    notes: rows.map((row) => ({
      id: row.noteId,
      guid: row.guid,
      mid: MODEL_ID,
      fields: row.fields,
      tags: row.tags.join(" "),
    })),
    cards: rows.map((row) => ({
      id: row.cardId,
      nid: row.noteId,
      did: row.deckId,
      ord: 0,
      newOrder: row.due,
    })),
    media: media.map(({ filename, content }) => {
      if (typeof content !== "string") {
        throw new Error(`${filename}: web deck media must be text`);
      }
      return { filename, data: content };
    }),
    rootDeckNames: [ROOT_DECK_NAME],
  };
}

export function validatePackageInput(
  notes: readonly PackageNote[],
  media: readonly MediaFile[],
): void {
  if (new Set(notes.map(({ id }) => id)).size !== notes.length) {
    throw new Error("duplicate note id");
  }
  if (new Set(notes.map(({ guid }) => guid)).size !== notes.length) {
    throw new Error("duplicate note guid");
  }
  if (new Set(media.map(({ filename }) => filename)).size !== media.length) {
    throw new Error("duplicate media filename");
  }
  for (const note of notes) {
    if (
      ![POSITION_TO_NOTE_DECK_ID, NOTE_TO_POSITIONS_DECK_ID].includes(
        note.deckId,
      )
    ) {
      throw new Error(`${note.id}: invalid child deck id ${note.deckId}`);
    }
    if (note.fields.length !== FIELD_NAMES.length) {
      throw new Error(
        `${note.id}: expected ${FIELD_NAMES.length} fields, got ${note.fields.length}`,
      );
    }
  }
}
