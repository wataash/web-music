// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type DeckTemplate = Readonly<{
  name: string;
  ord: number;
  qfmt: string;
  afmt: string;
}>;

export type DeckModel = Readonly<{
  mid: number;
  name: string;
  css: string;
  fieldNames: readonly string[];
  templates: readonly DeckTemplate[];
}>;

export type DeckDefinition = Readonly<{
  did: number;
  name: string;
  hiddenByDefault?: boolean;
}>;

export type DeckNote = Readonly<{
  id: number;
  guid: string;
  mid: number;
  fields: readonly string[];
  tags: string;
}>;

export type DeckCard = Readonly<{
  id: number;
  nid: number;
  did: number;
  ord: number;
  newOrder: number;
}>;

export type DeckMediaFile = Readonly<{ filename: string; data: string }>;

export type DeckData = Readonly<{
  models: readonly DeckModel[];
  decks: readonly DeckDefinition[];
  notes: readonly DeckNote[];
  cards: readonly DeckCard[];
  media: readonly DeckMediaFile[];
  rootDeckNames: readonly string[];
}>;

export type DeckDocument = Readonly<{
  format: "web-music-flashcards-deck";
  version: 1;
  deck: DeckData;
}>;

export function parseDeckDocument(value: unknown): DeckData {
  if (!isRecord(value)) throw new Error("invalid deck document");
  if (value.format !== "web-music-flashcards-deck" || value.version !== 1) {
    throw new Error("unsupported deck document format");
  }
  const deck = value.deck;
  if (!isRecord(deck)) throw new Error("invalid deck data");
  for (const key of [
    "models",
    "decks",
    "notes",
    "cards",
    "media",
    "rootDeckNames",
  ] as const) {
    if (!Array.isArray(deck[key])) throw new Error(`invalid deck ${key}`);
  }
  const media: unknown = deck.media;
  if (
    !Array.isArray(media) ||
    !media.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.filename === "string" &&
        typeof entry.data === "string",
    )
  ) {
    throw new Error("invalid deck media");
  }
  return deck as DeckData;
}

// A package owns the deck trees its root names cover, and its stored rows are
// keyed by the names it had when it was imported. An older version that named
// more trees — `Intervals` once had a subdeck per degree, and a separate
// `Intervals by Note` — is therefore stored under a key the new one never
// writes, and its decks and cards would be left behind. Find those packages by
// the decks of ours they still hold, so the import can clear them too.
export function supersededPackages(
  rootDeckNames: readonly string[],
  decks: readonly Readonly<{ name: string; pkg: string }>[],
): readonly string[] {
  const owns = (name: string): boolean =>
    rootDeckNames.some(
      (root) => name === root || name.startsWith(`${root}::`),
    );
  return [...new Set(decks.filter(({ name }) => owns(name)).map(({ pkg }) => pkg))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
