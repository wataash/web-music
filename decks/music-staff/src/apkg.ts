// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import JSZip from "jszip";

import {
  ANKI21B_META,
  type Anki21bCollectionInput,
  decodeMediaEntryNames,
  decodeProtoVarintField,
  encodeMediaEntries,
  writeAnki21bDatabase,
  writeLegacyUpgradeNoticeDatabase,
  zstdCompress,
  zstdDecompress,
} from "@web-music/anki-apkg";

import {
  CLEF_LABELS,
  CLEFS,
  DIRECTIONS,
  type Clef,
  type Direction,
} from "./cards";
import {
  BACK_TEMPLATE,
  CARD_CSS,
  FIELD_NAMES,
  FRONT_TEMPLATE,
  MODEL_NAME,
  OCTAVE_NUMBER_CLEF_DECK_NAMES,
  OCTAVE_NUMBER_DIRECTION_DECK_NAMES,
  OCTAVE_NUMBER_ROOT_DECK_NAME,
  ROOT_DECK_NAME,
  STAFF_TO_NOTE_CLEF_DECK_NAMES,
  STAFF_TO_NOTE_DECK_NAME,
  WEB_BACK_TEMPLATE,
  WEB_FRONT_TEMPLATE,
} from "./template";

// A block of its own, clear of the circle-of-fifths (1_785_040_*) and guitar
// fretboard (1_786_800_*) decks, and well inside Number.MAX_SAFE_INTEGER.
export const MODEL_ID = 1_787_950_000_000;
export const ROOT_DECK_ID = 1_787_950_000_001;
export const STAFF_TO_NOTE_DECK_ID = 1_787_950_000_002;
export const STAFF_TO_NOTE_TREBLE_DECK_ID = 1_787_950_000_003;
export const STAFF_TO_NOTE_BASS_DECK_ID = 1_787_950_000_004;
export const STAFF_TO_NOTE_ALTO_DECK_ID = 1_787_950_000_005;
export const STAFF_TO_NOTE_TENOR_DECK_ID = 1_787_950_000_006;
// 1_787_950_000_007 through 1_787_950_000_011 belonged to the removed
// ambiguous Note → Staff subtree. Never reuse them.
export const DECK_CONFIG_ID = 1_787_950_000_012;
export const OCTAVE_NUMBER_ROOT_DECK_ID = 1_787_950_000_013;
export const OCTAVE_NUMBER_STAFF_TO_NOTE_DECK_ID = 1_787_950_000_014;
export const OCTAVE_NUMBER_STAFF_TO_NOTE_TREBLE_DECK_ID =
  1_787_950_000_015;
export const OCTAVE_NUMBER_STAFF_TO_NOTE_BASS_DECK_ID = 1_787_950_000_016;
export const OCTAVE_NUMBER_STAFF_TO_NOTE_ALTO_DECK_ID = 1_787_950_000_017;
export const OCTAVE_NUMBER_STAFF_TO_NOTE_TENOR_DECK_ID = 1_787_950_000_018;
export const OCTAVE_NUMBER_NOTE_TO_STAFF_DECK_ID = 1_787_950_000_019;
export const OCTAVE_NUMBER_NOTE_TO_STAFF_TREBLE_DECK_ID =
  1_787_950_000_020;
export const OCTAVE_NUMBER_NOTE_TO_STAFF_BASS_DECK_ID = 1_787_950_000_021;
export const OCTAVE_NUMBER_NOTE_TO_STAFF_ALTO_DECK_ID = 1_787_950_000_022;
export const OCTAVE_NUMBER_NOTE_TO_STAFF_TENOR_DECK_ID = 1_787_950_000_023;
export const NOTE_ID_BASE = 1_787_950_100_000;
export const CARD_ID_BASE = 1_787_950_200_000;
// Reserved for this model's single card template. Schema V18 keys templates by
// ordinal, so nothing writes it today.
export const TEMPLATE_ID = 1_787_950_300_000;

export const STAFF_TO_NOTE_CLEF_DECK_IDS = {
  treble: STAFF_TO_NOTE_TREBLE_DECK_ID,
  bass: STAFF_TO_NOTE_BASS_DECK_ID,
  alto: STAFF_TO_NOTE_ALTO_DECK_ID,
  tenor: STAFF_TO_NOTE_TENOR_DECK_ID,
} as const satisfies Record<Clef, number>;

export const OCTAVE_NUMBER_DIRECTION_DECK_IDS = {
  "staff-to-note": OCTAVE_NUMBER_STAFF_TO_NOTE_DECK_ID,
  "note-to-staff": OCTAVE_NUMBER_NOTE_TO_STAFF_DECK_ID,
} as const satisfies Record<Direction, number>;

export const OCTAVE_NUMBER_CLEF_DECK_IDS = {
  "staff-to-note": {
    treble: OCTAVE_NUMBER_STAFF_TO_NOTE_TREBLE_DECK_ID,
    bass: OCTAVE_NUMBER_STAFF_TO_NOTE_BASS_DECK_ID,
    alto: OCTAVE_NUMBER_STAFF_TO_NOTE_ALTO_DECK_ID,
    tenor: OCTAVE_NUMBER_STAFF_TO_NOTE_TENOR_DECK_ID,
  },
  "note-to-staff": {
    treble: OCTAVE_NUMBER_NOTE_TO_STAFF_TREBLE_DECK_ID,
    bass: OCTAVE_NUMBER_NOTE_TO_STAFF_BASS_DECK_ID,
    alto: OCTAVE_NUMBER_NOTE_TO_STAFF_ALTO_DECK_ID,
    tenor: OCTAVE_NUMBER_NOTE_TO_STAFF_TENOR_DECK_ID,
  },
} as const satisfies Record<Direction, Record<Clef, number>>;

const TEMPLATE_NAME = "Card 1";
const DECK_CONFIG_NAME = "Music Staff — Random New Cards";
const NEW_CARD_GATHER_PRIORITY = 4; // NEW_CARD_GATHER_PRIORITY_RANDOM_CARDS
const NEW_CARD_SORT_ORDER = 4; // NEW_CARD_SORT_ORDER_RANDOM
const QUESTION_IMAGE_FIELD_ORD = FIELD_NAMES.indexOf("QuestionImage");

type DeckDefinition = Readonly<{
  id: number;
  name: string;
  description: string;
  hiddenByDefault?: boolean;
}>;

const DIRECTION_DESCRIPTIONS = {
  "staff-to-note": "Name the note drawn on the staff.",
  "note-to-staff": "Place a named pitch on an empty staff.",
} as const satisfies Record<Direction, string>;

const DECK_DEFINITIONS: readonly DeckDefinition[] = [
  {
    id: ROOT_DECK_ID,
    name: ROOT_DECK_NAME,
    description:
      "Read and write note names on the staff, without octave numbers.",
  },
  {
    id: STAFF_TO_NOTE_DECK_ID,
    name: STAFF_TO_NOTE_DECK_NAME,
    description: DIRECTION_DESCRIPTIONS["staff-to-note"],
  },
  // The alto and tenor clefs are read by violists, cellists and trombonists;
  // the deck ships them off so the list starts with the two clefs everyone
  // reads.
  ...CLEFS.map((clef) => ({
    id: STAFF_TO_NOTE_CLEF_DECK_IDS[clef],
    name: STAFF_TO_NOTE_CLEF_DECK_NAMES[clef],
    description: `${DIRECTION_DESCRIPTIONS["staff-to-note"].slice(0, -1)} on the ${CLEF_LABELS[clef].toLowerCase()} clef.`,
    ...(clef === "alto" || clef === "tenor"
      ? { hiddenByDefault: true as const }
      : {}),
  })),
  {
    id: OCTAVE_NUMBER_ROOT_DECK_ID,
    name: OCTAVE_NUMBER_ROOT_DECK_NAME,
    description:
      "Read and write notes on the staff, with octave numbers shown.",
    hiddenByDefault: true,
  },
  ...DIRECTIONS.flatMap((direction) => [
    {
      id: OCTAVE_NUMBER_DIRECTION_DECK_IDS[direction],
      name: OCTAVE_NUMBER_DIRECTION_DECK_NAMES[direction],
      description: DIRECTION_DESCRIPTIONS[direction],
      hiddenByDefault: true,
    },
    ...CLEFS.map((clef) => ({
      id: OCTAVE_NUMBER_CLEF_DECK_IDS[direction][clef],
      name: OCTAVE_NUMBER_CLEF_DECK_NAMES[direction][clef],
      description: `${DIRECTION_DESCRIPTIONS[direction].slice(0, -1)} on the ${CLEF_LABELS[clef].toLowerCase()} clef.`,
      hiddenByDefault: true,
    })),
  ]),
];

type NoteRow = Readonly<{
  noteId: number;
  cardId: number;
  deckId: number;
  guid: string;
  fields: readonly string[];
  tags: readonly string[];
  due: number;
}>;

// New cards are stored in a reproducible shuffle so that a fresh import does
// not walk the staff from the lowest note to the highest.
function buildNoteRows(notes: readonly PackageNote[]): readonly NoteRow[] {
  const dueByNoteId = new Map(
    [...notes]
      .sort((left, right) =>
        shuffledOrderKey(left.id).localeCompare(shuffledOrderKey(right.id)),
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

const ZIP_DATE = new Date("1980-01-01T00:00:00.000Z");
const FIELD_SEPARATOR = "\u001f";

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

export type AnkiPackageInput = Readonly<{
  outputPath: string;
  notes: readonly PackageNote[];
  media: readonly MediaFile[];
  modifiedAt?: Date;
}>;

export type AnkiPackageSummary = Readonly<{
  noteCount: number;
  cardCount: number;
  deckCount: number;
  cardsByDeck: Readonly<Record<string, number>>;
  modelCount: number;
  mediaCount: number;
  mediaFilenames: readonly string[];
  noteGuids: readonly string[];
  noteFields: readonly (readonly string[])[];
  newCardIdsByDue: readonly string[];
  deckConfigs: Readonly<
    Record<
      string,
      Readonly<{
        name: string;
        newCardGatherPriority: number;
        newCardSortOrder: number;
      }>
    >
  >;
}>;

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
  decks: readonly Readonly<{
    did: number;
    name: string;
    hiddenByDefault?: boolean;
  }>[];
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
): WebDeckData {
  validatePackageInput(notes, media);
  const rows = buildNoteRows(notes);
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
    decks: DECK_DEFINITIONS.map(({ id, name, hiddenByDefault }) => ({
      did: id,
      name,
      ...(hiddenByDefault === undefined ? {} : { hiddenByDefault }),
    })),
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
    rootDeckNames: [ROOT_DECK_NAME, OCTAVE_NUMBER_ROOT_DECK_NAME],
  };
}

export async function writeAnkiPackage({
  outputPath,
  notes,
  media,
  modifiedAt = new Date(),
}: AnkiPackageInput): Promise<void> {
  validatePackageInput(notes, media);
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "music-staff-anki-"),
  );
  const fallbackDatabasePath = join(
    temporaryDirectory,
    "collection.anki2",
  );

  try {
    const noteRows = buildNoteRows(notes);
    const v18DatabasePath = join(temporaryDirectory, "collection.v18");
    writeAnki21bDatabase(v18DatabasePath, buildV18Input(noteRows, modifiedAt));
    writeLegacyUpgradeNoticeDatabase(fallbackDatabasePath, modifiedAt);

    // Mirror modern Anki exports: the real V18 collection and media are zstd
    // compressed, while collection.anki2 is only an old-client upgrade notice.
    const zip = new JSZip();
    const entryOptions = { date: ZIP_DATE, compression: "STORE" } as const;
    zip.file("meta", ANKI21B_META, entryOptions);
    zip.file(
      "collection.anki21b",
      zstdCompress(await readFile(v18DatabasePath)),
      entryOptions,
    );
    zip.file(
      "collection.anki2",
      await readFile(fallbackDatabasePath),
      entryOptions,
    );

    const mediaFiles = media.map(({ filename, content }) => ({
      filename,
      data:
        typeof content === "string"
          ? new TextEncoder().encode(content)
          : content,
    }));
    mediaFiles.forEach(({ data }, index) => {
      zip.file(String(index), zstdCompress(data), entryOptions);
    });
    zip.file("media", zstdCompress(encodeMediaEntries(mediaFiles)), entryOptions);

    const archive = await zip.generateAsync({
      type: "nodebuffer",
      compression: "STORE",
      platform: "UNIX",
    });
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, archive);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
export async function inspectAnkiPackage(
  packagePath: string,
): Promise<AnkiPackageSummary> {
  const archive = await JSZip.loadAsync(await readFile(packagePath));
  const metaEntry = archive.file("meta");
  const collectionEntry = archive.file("collection.anki21b");
  const fallbackEntry = archive.file("collection.anki2");
  const mediaEntry = archive.file("media");
  if (!metaEntry || !collectionEntry || !fallbackEntry || !mediaEntry) {
    throw new Error(
      "invalid modern Anki package: missing meta, collection.anki21b, collection.anki2, or media",
    );
  }
  const meta = await metaEntry.async("uint8array");
  if (!Buffer.from(meta).equals(Buffer.from(ANKI21B_META))) {
    throw new Error("invalid modern Anki package metadata");
  }

  const mediaFilenames = decodeMediaEntryNames(
    zstdDecompress(await mediaEntry.async("uint8array")),
  );
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "music-staff-anki-inspect-"),
  );
  const databasePath = join(temporaryDirectory, "collection.anki21b");
  const fallbackDatabasePath = join(temporaryDirectory, "collection.anki2");

  try {
    await writeFile(
      databasePath,
      zstdDecompress(await collectionEntry.async("uint8array")),
    );
    await writeFile(
      fallbackDatabasePath,
      await fallbackEntry.async("nodebuffer"),
    );

    const fallbackDatabase = new DatabaseSync(fallbackDatabasePath, {
      readOnly: true,
    });
    try {
      const fallbackNote = fallbackDatabase
        .prepare("SELECT flds FROM notes")
        .get() as unknown as { flds: string } | undefined;
      if (
        countRows(fallbackDatabase, "notes") !== 1 ||
        !fallbackNote?.flds.includes("update to the latest Anki")
      ) {
        throw new Error("invalid collection.anki2 upgrade notice");
      }
    } finally {
      fallbackDatabase.close();
    }

    const database = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const notes = database
        .prepare("SELECT guid, flds FROM notes ORDER BY id")
        .all() as unknown as readonly { guid: string; flds: string }[];
      const decks = database
        .prepare("SELECT id, name FROM decks WHERE id != 1 ORDER BY id")
        .all() as unknown as readonly { id: number; name: string }[];
      const deckConfigs = database
        .prepare(
          "SELECT id, name, config FROM deck_config WHERE id != 1 ORDER BY id",
        )
        .all() as unknown as readonly {
        id: number;
        name: string;
        config: Uint8Array;
      }[];
      const cardCounts = new Map(
        (
          database
            .prepare("SELECT did, COUNT(*) AS count FROM cards GROUP BY did")
            .all() as unknown as readonly { did: number; count: number }[]
        ).map(({ did, count }) => [did, count]),
      );

      return {
        noteCount: countRows(database, "notes"),
        cardCount: countRows(database, "cards"),
        deckCount: decks.length,
        cardsByDeck: Object.fromEntries(
          decks.map(({ id, name }) => [
            name.split("\u001f").join("::"),
            cardCounts.get(id) ?? 0,
          ]),
        ),
        modelCount: countRows(database, "notetypes"),
        mediaCount: mediaFilenames.length,
        mediaFilenames,
        noteGuids: notes.map(({ guid }) => guid),
        noteFields: notes.map(({ flds }) => flds.split(FIELD_SEPARATOR)),
        newCardIdsByDue: (
          database
            .prepare(
              `SELECT notes.flds
               FROM cards
               JOIN notes ON notes.id = cards.nid
               ORDER BY cards.due`,
            )
            .all() as unknown as readonly { flds: string }[]
        ).map(({ flds }) => flds.split(FIELD_SEPARATOR)[0]),
        deckConfigs: Object.fromEntries(
          deckConfigs.map(({ id, name, config }) => [
            String(id),
            {
              name,
              newCardGatherPriority:
                decodeProtoVarintField(config, 34) ?? 0,
              newCardSortOrder: decodeProtoVarintField(config, 32) ?? 0,
            },
          ]),
        ),
      };
    } finally {
      database.close();
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export function stableNoteGuid(id: string): string {
  return createHash("sha256")
    .update(`music-staff:${id}`)
    .digest("base64url")
    .slice(0, 16);
}

function buildV18Input(
  noteRows: readonly NoteRow[],
  modifiedAt: Date,
): Anki21bCollectionInput {
  return {
    models: [
      {
        id: MODEL_ID,
        name: MODEL_NAME,
        css: CARD_CSS,
        fieldNames: FIELD_NAMES,
        templates: [
          {
            ord: 0,
            name: TEMPLATE_NAME,
            qfmt: FRONT_TEMPLATE,
            afmt: BACK_TEMPLATE,
          },
        ],
        sortFieldIndex: 0,
        requirements: [
          { cardOrd: 0, kind: "all", fieldOrds: [QUESTION_IMAGE_FIELD_ORD] },
        ],
      },
    ],
    decks: DECK_DEFINITIONS.map((deck) => ({
      ...deck,
      configId: DECK_CONFIG_ID,
    })),
    deckConfigs: [
      {
        id: DECK_CONFIG_ID,
        name: DECK_CONFIG_NAME,
        newCardGatherPriority: NEW_CARD_GATHER_PRIORITY,
        newCardSortOrder: NEW_CARD_SORT_ORDER,
      },
    ],
    notes: noteRows.map((row) => ({
      id: row.noteId,
      guid: row.guid,
      modelId: MODEL_ID,
      fields: row.fields,
      tags: row.tags,
    })),
    cards: noteRows.map((row) => ({
      id: row.cardId,
      noteId: row.noteId,
      deckId: row.deckId,
      ord: 0,
      due: row.due,
    })),
    modifiedAt,
  };
}

function shuffledOrderKey(noteId: string): string {
  return createHash("sha256")
    .update(`music-staff:new-card-order:${noteId}`)
    .digest("hex");
}

function countRows(
  database: DatabaseSync,
  table: "notes" | "cards" | "notetypes",
): number {
  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
    .get() as unknown as { count: number };
  return row.count;
}

function validatePackageInput(
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
  const childDeckIds: readonly number[] = [
    ...CLEFS.map((clef) => STAFF_TO_NOTE_CLEF_DECK_IDS[clef]),
    ...DIRECTIONS.flatMap((direction) =>
      CLEFS.map((clef) => OCTAVE_NUMBER_CLEF_DECK_IDS[direction][clef]),
    ),
  ];
  for (const note of notes) {
    if (!childDeckIds.includes(note.deckId)) {
      throw new Error(`${note.id}: invalid child deck id ${note.deckId}`);
    }
    if (note.fields.length !== FIELD_NAMES.length) {
      throw new Error(
        `${note.id}: expected ${FIELD_NAMES.length} fields, got ${note.fields.length}`,
      );
    }
  }
}
