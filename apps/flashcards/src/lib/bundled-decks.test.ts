// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

import {
  type BundledDeckImport,
  type BundledDeckManifestEntry,
  changedBundledDeckEntries,
  fetchBundledDeck,
  rememberImportedBundledDecks,
  selectChangedBundledDecks,
} from "./bundled-decks";

async function fetchChangedBundledDecks(
  force: boolean,
  fetcher: (url: string, init?: RequestInit) => Promise<Response>,
  storage: Parameters<typeof changedBundledDeckEntries>[2],
): Promise<readonly BundledDeckImport[]> {
  const entries = await changedBundledDeckEntries(force, fetcher, storage);
  return Promise.all(entries.map((entry) => fetchBundledDeck(entry, fetcher)));
}

const manifest: readonly BundledDeckManifestEntry[] = [
  {
    id: "guitar-fretboard",
    filename: "guitar.json",
    url: "/decks/guitar.json",
    version: "guitar-v2",
  },
  {
    id: "circle-of-fifths",
    filename: "circle.json",
    url: "/decks/circle.json",
    version: "circle-v1",
  },
];

describe("production bundled decks", () => {
  it("selects newly added and updated decks independently", () => {
    expect(
      selectChangedBundledDecks(manifest, {
        "guitar-fretboard": "guitar-v1",
        "circle-of-fifths": "circle-v1",
      }).map(({ id }) => id),
    ).toEqual(["guitar-fretboard"]);
    expect(
      selectChangedBundledDecks(manifest, {
        "guitar-fretboard": "guitar-v2",
      }).map(({ id }) => id),
    ).toEqual(["circle-of-fifths"]);
    expect(selectChangedBundledDecks(manifest, {}, true)).toEqual(manifest);
  });

  it("downloads only decks whose manifest version changed", async () => {
    const storage = memoryStorage({
      "music-flashcards:bundled-deck-versions": JSON.stringify({
        "guitar-fretboard": "guitar-v2",
        "circle-of-fifths": "circle-v0",
      }),
    });
    const requestedUrls: string[] = [];
    const fetcher = vi.fn(async (url: string) => {
      requestedUrls.push(url);
      if (url === "/decks/manifest.json") {
        return Response.json(manifestDocument(manifest));
      }
      return Response.json(deckDocument(url));
    });

    const imported = await fetchChangedBundledDecks(false, fetcher, storage);

    expect(requestedUrls).toEqual([
      "/decks/manifest.json",
      "/decks/circle.json",
    ]);
    expect(imported).toEqual([
      {
        id: "circle-of-fifths",
        version: "circle-v1",
        deck: deckDocument("/decks/circle.json").deck,
      },
    ]);
  });

  it("remembers successful imports and skips them on the next load", async () => {
    const storage = memoryStorage();
    const imported: readonly BundledDeckImport[] = manifest.map((entry) => ({
      id: entry.id,
      version: entry.version,
      deck: deckDocument(entry.url).deck,
    }));
    rememberImportedBundledDecks(imported, storage);
    const fetcher = vi.fn(async (url: string) => {
      if (url === "/decks/manifest.json") {
        return Response.json(manifestDocument(manifest));
      }
      throw new Error(`unexpected deck request: ${url}`);
    });

    await expect(
      fetchChangedBundledDecks(false, fetcher, storage),
    ).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reports manifest and deck download failures", async () => {
    await expect(
      fetchChangedBundledDecks(
        false,
        async () => new Response(null, { status: 503 }),
        memoryStorage(),
      ),
    ).rejects.toThrow("bundled deck manifest import failed");

    await expect(
      fetchChangedBundledDecks(
        false,
        async (url: string) =>
          url === "/decks/manifest.json"
            ? Response.json(manifestDocument(manifest))
            : new Response(null, { status: 503 }),
        memoryStorage(),
      ),
    ).rejects.toThrow("guitar.json: bundled deck import failed");
  });
});

function manifestDocument(decks: readonly BundledDeckManifestEntry[]) {
  return {
    format: "web-music-flashcards-manifest",
    version: 1,
    decks,
  };
}

function deckDocument(rootName: string) {
  return {
    format: "web-music-flashcards-deck" as const,
    version: 1 as const,
    deck: {
      models: [],
      decks: [],
      notes: [],
      cards: [],
      media: [],
      rootDeckNames: [rootName],
    },
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}
