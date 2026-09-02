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
  BACK_TEMPLATE,
  CARD_CSS,
  FIELD_NAMES,
  FLATS_DECK_NAME,
  FRONT_TEMPLATE,
  MODEL_NAME,
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

export const MODEL_ID = 1_786_800_000_000;
export const ROOT_DECK_ID = 1_786_800_000_001;
export const FLATS_DECK_ID = 1_786_800_000_002;
export const SHARPS_DECK_ID = 1_786_800_000_003;
export const DECK_CONFIG_ID = 1_786_800_000_004;
export const POSITION_TO_NOTE_DECK_ID = 1_786_800_000_005;
export const NOTE_TO_POSITIONS_DECK_ID = 1_786_800_000_006;
export const NOTE_TO_POSITIONS_FLATS_DECK_ID = 1_786_800_000_007;
export const NOTE_TO_POSITIONS_SHARPS_DECK_ID = 1_786_800_000_008;
export const NATURALS_DECK_ID = 1_786_800_000_009;
export const NOTE_TO_POSITIONS_NATURALS_DECK_ID = 1_786_800_000_010;

const NOTE_ID_BASE = 1_786_800_100_000;
const CARD_ID_BASE = 1_786_800_200_000;
const TEMPLATE_ID = 1_786_800_300_000;
const TEMPLATE_NAME = "Card 1";
const DECK_CONFIG_NAME = "Guitar Fretboard — Random New Cards";
const NEW_CARD_GATHER_PRIORITY = 4; // NEW_CARD_GATHER_PRIORITY_RANDOM_CARDS
const NEW_CARD_SORT_ORDER = 4; // NEW_CARD_SORT_ORDER_RANDOM

type DeckDefinition = Readonly<{
  id: number;
  name: string;
  description: string;
}>;

const DECK_DEFINITIONS: readonly DeckDefinition[] = [
  {
    id: ROOT_DECK_ID,
    name: ROOT_DECK_NAME,
    description:
      "Position-to-note and note-to-position drills for the guitar fretboard.",
  },
  {
    id: POSITION_TO_NOTE_DECK_ID,
    name: POSITION_TO_NOTE_DECK_NAME,
    description: "Identify the note name at a marked fretboard position.",
  },
  {
    id: NATURALS_DECK_ID,
    name: NATURALS_DECK_NAME,
    description: "Identify fretboard positions containing natural notes.",
  },
  {
    id: FLATS_DECK_ID,
    name: FLATS_DECK_NAME,
    description:
      "Identify each fretboard position using natural and flat note names.",
  },
  {
    id: SHARPS_DECK_ID,
    name: SHARPS_DECK_NAME,
    description:
      "Identify each fretboard position using natural and sharp note names.",
  },
  {
    id: NOTE_TO_POSITIONS_DECK_ID,
    name: NOTE_TO_POSITIONS_DECK_NAME,
    description: "Recall every occurrence of a note on one guitar string.",
  },
  {
    id: NOTE_TO_POSITIONS_NATURALS_DECK_ID,
    name: NOTE_TO_POSITIONS_NATURALS_DECK_NAME,
    description: "Recall natural-note positions on one string.",
  },
  {
    id: NOTE_TO_POSITIONS_FLATS_DECK_ID,
    name: NOTE_TO_POSITIONS_FLATS_DECK_NAME,
    description:
      "Recall positions on one string using natural and flat note names.",
  },
  {
    id: NOTE_TO_POSITIONS_SHARPS_DECK_ID,
    name: NOTE_TO_POSITIONS_SHARPS_DECK_NAME,
    description:
      "Recall positions on one string using natural and sharp note names.",
  },
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

export async function writeAnkiPackage({
  outputPath,
  notes,
  media,
  modifiedAt = new Date(),
}: AnkiPackageInput): Promise<void> {
  validatePackageInput(notes, media);
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "guitar-fretboard-anki-"),
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
    join(tmpdir(), "guitar-fretboard-anki-inspect-"),
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
    .update(`guitar-fretboard:${id}`)
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
        requirements: [{ cardOrd: 0, kind: "all", fieldOrds: [5] }],
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
    .update(`guitar-fretboard:new-card-order:${noteId}`)
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
  for (const note of notes) {
    if (
      ![
        NATURALS_DECK_ID,
        FLATS_DECK_ID,
        SHARPS_DECK_ID,
        NOTE_TO_POSITIONS_NATURALS_DECK_ID,
        NOTE_TO_POSITIONS_FLATS_DECK_ID,
        NOTE_TO_POSITIONS_SHARPS_DECK_ID,
      ].includes(note.deckId)
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
