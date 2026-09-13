// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// IndexedDB persistence. Deck content (notes/cards/models/decks/media) is
// replaced wholesale per package on (re-)import, keyed by `pkg` (the sorted
// root deck names). Study state and the review log are keyed by
// `<note guid>#<template ord>` (or a shared guitar shape key) and survive
// re-imports of regenerated decks.

import Dexie, { type Table, type Transaction } from "dexie";
import { guitarShapeKey, mergeGuitarStates, normalizeGuitarLevels } from "./guitar-shapes";

import { IMPORTED_VERSIONS_KEY as BUNDLED_DECK_VERSIONS_KEY } from "./bundled-decks";
import { supersededPackages, type DeckData } from "./deck-data";
import { IMPORTED_VERSIONS_KEY as DEV_DECK_VERSIONS_KEY } from "./dev-decks";

const DECK_CONTENT_TABLES = ["decks", "models", "notes", "cards", "media"];

export type DeckRow = Readonly<{
  did: number;
  name: string;
  hiddenByDefault: boolean;
  pkg: string;
}>;

export type ModelRow = Readonly<{
  mid: number;
  name: string;
  css: string;
  fieldNames: readonly string[];
  templates: readonly {
    name: string;
    ord: number;
    qfmt: string;
    afmt: string;
  }[];
  pkg: string;
}>;

export type NoteRow = Readonly<{
  id: number;
  guid: string;
  mid: number;
  fields: readonly string[];
  tags: string;
  pkg: string;
}>;

export type CardRow = Readonly<{
  id: number;
  key: string; // Stable study identity; guitar shape variants share one key.
  nid: number;
  did: number;
  ord: number;
  newOrder: number;
  pkg: string;
}>;

export type MediaRow = Readonly<{
  filename: string;
  // The file's text, as it comes out of the deck package. Turning every file
  // into a Blob at import time cost about half a second on the fretboard deck
  // and its thousand-odd diagrams, so a Blob is made only for the files a card
  // actually shows. Databases written before this held a Blob here, which
  // `new Blob([...])` accepts unchanged.
  data: string;
  pkg: string;
}>;

// Serialized ts-fsrs Card: Date fields flattened to epoch ms.
export type FsrsCardJson = Readonly<Record<string, number | string | null>>;

export type StateRow = Readonly<{
  key: string;
  fsrs: FsrsCardJson;
  due: number; // epoch ms, denormalized from fsrs.due for indexed queries
  stateKind: "learning" | "review";
  introducedDay: number; // day number when first studied (new-per-day limit)
  updatedAt: number;
  updatedBy: string;
}>;

export type RevlogRow = Readonly<{
  id?: number;
  eventId: string;
  deviceId: string;
  key: string;
  rating: number;
  ts: number;
}>;

export type SyncMetaRow = Readonly<{
  key: string;
  value: string;
}>;

class FlashcardsDatabase extends Dexie {
  decks!: Table<DeckRow, number>;
  models!: Table<ModelRow, number>;
  notes!: Table<NoteRow, number>;
  cards!: Table<CardRow, number>;
  media!: Table<MediaRow, string>;
  states!: Table<StateRow, string>;
  revlog!: Table<RevlogRow, number>;
  syncMeta!: Table<SyncMetaRow, string>;

  constructor() {
    super("music-flashcards");
    this.version(1).stores({
      decks: "did, name, pkg",
      models: "mid, pkg",
      notes: "id, guid, pkg",
      cards: "id, key, did, pkg",
      media: "filename, pkg",
      states: "key, due, introducedDay",
      revlog: "++id, key, ts",
    });
    this.version(2)
      .stores({
        decks: "did, name, pkg",
        models: "mid, pkg",
        notes: "id, guid, pkg",
        cards: "id, key, did, pkg",
        media: "filename, pkg",
        states: "key, due, introducedDay",
        revlog: "++id, &eventId, key, ts",
        syncMeta: "key",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<StateRow>("states")
          .toCollection()
          .modify((state) => {
            const lastReview = state.fsrs.last_review;
            const mutable = state as {
              updatedAt: number;
              updatedBy: string;
            };
            mutable.updatedAt =
              typeof lastReview === "number" ? lastReview : 0;
            mutable.updatedBy = `legacy:${state.key}:${mutable.updatedAt}`;
          });
        await transaction
          .table<RevlogRow>("revlog")
          .toCollection()
          .modify((log) => {
            const mutable = log as {
              eventId: string;
              deviceId: string;
            };
            mutable.eventId = `legacy:${log.id ?? 0}:${log.key}:${log.ts}:${log.rating}`;
            mutable.deviceId = "legacy";
          });
      });
    // Deck content is keyed by the root deck names a package had when it was
    // imported, so a package that stopped naming one used to leave that tree
    // behind — the interval degree subdecks outlived the flat deck that
    // replaced them. importDeckData clears such a package now, but only when
    // it next imports, and a package whose file has not changed since never
    // does. Drop the content and let every package import again; study state
    // is keyed by note guid and survives.
    this.version(3).upgrade(async (transaction) => {
      for (const table of DECK_CONTENT_TABLES) {
        await transaction.table(table).clear();
      }
      forgetImportedDeckVersions();
    });
    this.version(4).upgrade(normalizeGuitarStudy);
  }
}

function forgetImportedDeckVersions(): void {
  try {
    localStorage.removeItem(BUNDLED_DECK_VERSIONS_KEY);
    localStorage.removeItem(DEV_DECK_VERSIONS_KEY);
  } catch {
    // Without storage nothing was remembered, so nothing needs forgetting.
  }
}

export const db = new FlashcardsDatabase();

// Used on upgrade, deck import and backup restore, including old backups
// restored before their deck is available. Original note GUIDs remain intact.
export async function normalizeGuitarStudy(transaction: Transaction): Promise<void> {
  const notes = await transaction.table<NoteRow>("notes").toArray();
  const normalized = normalizeGuitarLevels(notes);
  const changedNotes = normalized.filter((note, i) => note.tags !== notes[i].tags);
  if (changedNotes.length) await transaction.table("notes").bulkPut(changedNotes);
  const byId = new Map(notes.map((note) => [note.id, note]));
  const cards = await transaction.table<CardRow>("cards").toArray();
  const aliases = new Map<string, string>();
  const changedCards: CardRow[] = [];
  for (const card of cards) {
    const note = byId.get(card.nid);
    if (!note || note.fields[1] !== "guitar-interval") continue;
    const key = guitarShapeKey(card, note);
    aliases.set(`${note.guid}#${card.ord}`, key);
    if (key !== card.key) {
      aliases.set(card.key, key);
      changedCards.push({ ...card, key });
    }
  }
  if (changedCards.length) await transaction.table("cards").bulkPut(changedCards);
  const states = await transaction.table<StateRow>("states").toArray();
  const legacy = states.filter((state) => aliases.has(state.key) && aliases.get(state.key) !== state.key);
  if (legacy.length) {
    const keys = new Set(legacy.map((state) => aliases.get(state.key)!));
    const affected = states.filter((state) => keys.has(aliases.get(state.key) ?? state.key));
    await transaction.table("states").bulkDelete(legacy.map((state) => state.key));
    await transaction.table("states").bulkPut(mergeGuitarStates(affected, aliases));
  }
  const logs = await transaction.table<RevlogRow>("revlog").toArray();
  const changedLogs = logs.filter((log) => aliases.has(log.key) && aliases.get(log.key) !== log.key)
    .map((log) => ({ ...log, key: aliases.get(log.key)! }));
  if (changedLogs.length) await transaction.table("revlog").bulkPut(changedLogs);
}

export async function importDeckData(parsed: DeckData): Promise<string> {
  const pkg = parsed.rootDeckNames.join("|") || "(empty)";
  const guidByNoteId = new Map(parsed.notes.map((n) => [n.id, n.guid]));

  const deckRows: DeckRow[] = parsed.decks.map((d) => ({
    ...d,
    hiddenByDefault: d.hiddenByDefault === true,
    pkg,
  }));
  const modelRows: ModelRow[] = parsed.models.map((m) => ({
    ...m,
    templates: m.templates.map((t) => ({ ...t })),
    pkg,
  }));
  const noteRows: NoteRow[] = parsed.notes.map((n) => ({ ...n, pkg }));
  const cardRows: CardRow[] = parsed.cards.map((c) => {
    const guid = guidByNoteId.get(c.nid);
    if (!guid) throw new Error(`card ${c.id} references missing note ${c.nid}`);
    return { ...c, key: `${guid}#${c.ord}`, pkg };
  });
  const mediaRows: MediaRow[] = parsed.media.map((m) => ({
    filename: m.filename,
    data: m.data,
    pkg,
  }));

  await db.transaction(
    "rw",
    [db.decks, db.models, db.notes, db.cards, db.media, db.states, db.revlog],
    async (transaction) => {
      const stale = new Set([
        pkg,
        ...supersededPackages(parsed.rootDeckNames, await db.decks.toArray()),
      ]);
      for (const name of DECK_CONTENT_TABLES) {
        await db.table(name).where("pkg").anyOf([...stale]).delete();
      }
      await db.decks.bulkPut(deckRows);
      await db.models.bulkPut(modelRows);
      await db.notes.bulkPut(noteRows);
      await db.cards.bulkPut(cardRows);
      await db.media.bulkPut(mediaRows);
      await normalizeGuitarStudy(transaction);
    },
  );
  // The rows behind them are gone, so the cached object URLs are stale.
  invalidateMediaUrlCache();
  return pkg;
}

const MEDIA_MIME_TYPES: Readonly<Record<string, string>> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  mp4: "video/mp4",
  webm: "video/webm",
};

export function mediaMimeType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
  return MEDIA_MIME_TYPES[ext] ?? "application/octet-stream";
}

const mediaUrlCache = new Map<string, string>();

// Object URLs for the named files, kept for the session. A card names one or
// two diagrams, so only those are read and turned into a Blob.
export async function mediaUrls(
  filenames: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const missing = [...new Set(filenames)].filter(
    (filename) => !mediaUrlCache.has(filename),
  );
  if (missing.length > 0) {
    const rows = await db.media.bulkGet(missing);
    for (const row of rows) {
      if (!row) continue;
      // The MIME type matters: an <img> pointed at a typeless blob: URL
      // (notably SVG) renders as a broken 0x0 image.
      const blob = new Blob([row.data], {
        type: mediaMimeType(row.filename),
      });
      mediaUrlCache.set(row.filename, URL.createObjectURL(blob));
    }
  }
  // A fresh map rather than the cache itself: callers hold it in reactive
  // state, which only notices an assignment when the value differs.
  return new Map(
    filenames
      .filter((filename) => mediaUrlCache.has(filename))
      .map((filename) => [filename, mediaUrlCache.get(filename)!]),
  );
}

function invalidateMediaUrlCache(): void {
  for (const url of mediaUrlCache.values()) URL.revokeObjectURL(url);
  mediaUrlCache.clear();
}
