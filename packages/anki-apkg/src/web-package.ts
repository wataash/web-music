// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The part of a package the web app can build for itself: the rows a deck
// document carries, without node. The Anki archive is written by package.ts.

import { sha256Base64Url, sha256Hex } from "./sha256";

export { sha256Base64Url, sha256Hex } from "./sha256";
import type { Anki21bCardRequirement } from "./index";

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

export type WebPackage = ReturnType<typeof createWebPackage>;

export function stablePackageGuid(namespace: string, id: string): string {
  return sha256Base64Url(`${namespace}:${id}`).slice(0, 16);
}

export function mediaDigest(content: string): string {
  return sha256Hex(content).slice(0, 12);
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

export function buildRows(
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
  return sha256Hex(`${namespace}:new-card-order:${id}`);
}
