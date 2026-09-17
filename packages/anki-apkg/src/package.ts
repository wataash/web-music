// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

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
} from "./index";
import { buildRows, type PackageMedia, type PackageNote, type PackageSpec } from "./web-package";

export {
  createWebPackage,
  stablePackageGuid,
  type PackageDeck,
  type PackageMedia,
  type PackageModel,
  type PackageNote,
  type PackageSpec,
} from "./web-package";

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
