// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import JSZip from "jszip";

import {
  ANKI21B_META,
  encodeMediaEntries,
  writeAnki21bDatabase,
  writeLegacyUpgradeNoticeDatabase,
  zstdCompress,
  type Anki21bCardRequirement,
} from "./index";

export type PackageModel = Readonly<{
  id: number;
  name: string;
  css: string;
  fieldNames: readonly string[];
  templates: readonly Readonly<{
    name: string;
    ord: number;
    qfmt: string;
    afmt: string;
  }>[];
  requirements: readonly Anki21bCardRequirement[];
}>;

export type PackageDeck = Readonly<{
  id: number;
  name: string;
  description: string;
  hiddenByDefault?: boolean;
}>;

export type PackageNote = Readonly<{
  id: string;
  guid: string;
  deckId: number;
  fields: readonly string[];
  tags: readonly string[];
  // New cards are introduced lowest group first; within a group the order is
  // the usual stable shuffle. Decks that have a teaching order use this to put
  // the cards worth learning first at the front. Defaults to 0.
  orderGroup?: number;
}>;

export type PackageMedia = Readonly<{
  filename: string;
  content: string | Uint8Array;
}>;

export type PackageSpec = Readonly<{
  namespace: string;
  model: PackageModel;
  decks: readonly PackageDeck[];
  deckConfig: Readonly<{ id: number; name: string }>;
  noteIdBase: number;
  cardIdBase: number;
  rootDeckNames: readonly string[];
}>;

export function stablePackageGuid(namespace: string, id: string): string {
  return createHash("sha256")
    .update(`${namespace}:${id}`)
    .digest("base64url")
    .slice(0, 16);
}

export function createWebPackage(
  spec: PackageSpec,
  notes: readonly PackageNote[],
  media: readonly PackageMedia[] = [],
) {
  const rows = buildRows(spec, notes, media);
  return {
    models: [
      {
        mid: spec.model.id,
        name: spec.model.name,
        css: spec.model.css,
        fieldNames: spec.model.fieldNames,
        templates: spec.model.templates,
      },
    ],
    decks: spec.decks.map(({ id, name, hiddenByDefault }) => ({
      did: id,
      name,
      ...(hiddenByDefault === undefined ? {} : { hiddenByDefault }),
    })),
    notes: rows.map((row) => ({
      id: row.noteId,
      guid: row.note.guid,
      mid: spec.model.id,
      fields: row.note.fields,
      tags: row.note.tags.join(" "),
    })),
    cards: rows.map((row) => ({
      id: row.cardId,
      nid: row.noteId,
      did: row.note.deckId,
      ord: 0,
      newOrder: row.due,
    })),
    media: media.map(({ filename, content }) => {
      if (typeof content !== "string") {
        throw new Error(`${filename}: web deck media must be text`);
      }
      return { filename, data: content };
    }),
    rootDeckNames: spec.rootDeckNames,
  };
}

export async function writePackage(
  outputPath: string,
  spec: PackageSpec,
  notes: readonly PackageNote[],
  media: readonly PackageMedia[] = [],
  modifiedAt = new Date(),
): Promise<void> {
  const rows = buildRows(spec, notes, media);
  const directory = await mkdtemp(join(tmpdir(), `${spec.namespace}-anki-`));
  try {
    const collectionPath = join(directory, "collection.anki21b");
    const fallbackPath = join(directory, "collection.anki2");
    writeAnki21bDatabase(collectionPath, {
      models: [
        {
          ...spec.model,
          sortFieldIndex: 0,
        },
      ],
      decks: spec.decks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        configId: spec.deckConfig.id,
      })),
      deckConfigs: [
        {
          ...spec.deckConfig,
          newCardGatherPriority: 4,
          newCardSortOrder: 4,
        },
      ],
      notes: rows.map((row) => ({
        id: row.noteId,
        guid: row.note.guid,
        modelId: spec.model.id,
        fields: row.note.fields,
        tags: row.note.tags,
      })),
      cards: rows.map((row) => ({
        id: row.cardId,
        noteId: row.noteId,
        deckId: row.note.deckId,
        ord: 0,
        due: row.due,
      })),
      modifiedAt,
    });
    writeLegacyUpgradeNoticeDatabase(fallbackPath, modifiedAt);

    const zip = new JSZip();
    const options = {
      date: new Date("1980-01-01T00:00:00.000Z"),
      compression: "STORE",
    } as const;
    zip.file("meta", ANKI21B_META, options);
    zip.file(
      "collection.anki21b",
      zstdCompress(await readFile(collectionPath)),
      options,
    );
    zip.file("collection.anki2", await readFile(fallbackPath), options);
    const mediaEntries = media.map(({ filename, content }) => ({
      filename,
      data:
        typeof content === "string"
          ? new TextEncoder().encode(content)
          : content,
    }));
    mediaEntries.forEach(({ data }, index) => {
      zip.file(String(index), zstdCompress(data), options);
    });
    zip.file(
      "media",
      zstdCompress(encodeMediaEntries(mediaEntries)),
      options,
    );
    await mkdir(dirname(outputPath), { recursive: true });
    const archive = await zip.generateAsync({
      type: "nodebuffer",
      compression: "STORE",
      platform: "UNIX",
    });
    await writeFile(outputPath, archive);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function buildRows(
  spec: PackageSpec,
  notes: readonly PackageNote[],
  media: readonly PackageMedia[],
) {
  if (new Set(notes.map(({ id }) => id)).size !== notes.length) {
    throw new Error("duplicate note id");
  }
  if (new Set(notes.map(({ guid }) => guid)).size !== notes.length) {
    throw new Error("duplicate note guid");
  }
  if (new Set(media.map(({ filename }) => filename)).size !== media.length) {
    throw new Error("duplicate media filename");
  }
  const deckIds = new Set(spec.decks.map(({ id }) => id));
  const dueById = new Map(
    [...notes]
      .sort(
        (left, right) =>
          (left.orderGroup ?? 0) - (right.orderGroup ?? 0) ||
          orderKey(spec.namespace, left.id).localeCompare(
            orderKey(spec.namespace, right.id),
          ),
      )
      .map(({ id }, index) => [id, index + 1]),
  );
  return notes.map((note, index) => {
    if (!deckIds.has(note.deckId)) {
      throw new Error(`${note.id}: invalid deck id ${note.deckId}`);
    }
    if (note.fields.length !== spec.model.fieldNames.length) {
      throw new Error(`${note.id}: invalid field count`);
    }
    return {
      note,
      noteId: spec.noteIdBase + index,
      cardId: spec.cardIdBase + index,
      due: dueById.get(note.id)!,
    };
  });
}

function orderKey(namespace: string, id: string): string {
  return createHash("sha256")
    .update(`${namespace}:new-card-order:${id}`)
    .digest("hex");
}
