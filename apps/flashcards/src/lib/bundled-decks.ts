// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { parseDeckDocument, type DeckData } from "./deck-data";

const MANIFEST_URL = "/decks/manifest.json";
export const IMPORTED_VERSIONS_KEY =
  "music-flashcards:bundled-deck-versions";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type DeckFetcher = (url: string, init?: RequestInit) => Promise<Response>;

export type BundledDeckManifestEntry = Readonly<{
  id: string;
  filename: string;
  url: string;
  version: string;
}>;

export type BundledDeckImport = Readonly<{
  id: string;
  version: string;
  deck: DeckData;
}>;

type BundledDeckManifest = Readonly<{
  format: "web-music-flashcards-manifest";
  version: 1;
  decks: readonly BundledDeckManifestEntry[];
}>;

export function selectChangedBundledDecks(
  manifest: readonly BundledDeckManifestEntry[],
  importedVersions: Readonly<Record<string, string>>,
  force = false,
): readonly BundledDeckManifestEntry[] {
  return manifest.filter(
    (entry) => force || importedVersions[entry.id] !== entry.version,
  );
}

// The manifest entries that still need downloading. Kept separate from the
// download itself so a caller can import each deck as it arrives instead of
// waiting for the largest one.
export async function changedBundledDeckEntries(
  force = false,
  fetcher: DeckFetcher = (url, init) => fetch(url, init),
  storage: StorageLike | undefined = browserStorage(),
): Promise<readonly BundledDeckManifestEntry[]> {
  const manifestResponse = await fetcher(MANIFEST_URL, { cache: "no-store" });
  if (!manifestResponse.ok) {
    throw new Error(
      `bundled deck manifest import failed (HTTP ${manifestResponse.status})`,
    );
  }
  const manifest = parseBundledDeckManifest(await manifestResponse.json());
  return selectChangedBundledDecks(
    manifest.decks,
    loadImportedVersions(storage),
    force,
  );
}

export async function fetchBundledDeck(
  entry: BundledDeckManifestEntry,
  fetcher: DeckFetcher = (url, init) => fetch(url, init),
): Promise<BundledDeckImport> {
  const response = await fetcher(entry.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `${entry.filename}: bundled deck import failed (HTTP ${response.status})`,
    );
  }
  return {
    id: entry.id,
    version: entry.version,
    deck: parseDeckDocument(await response.json()),
  };
}

export function rememberImportedBundledDecks(
  imported: readonly BundledDeckImport[],
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  const versions = loadImportedVersions(storage);
  for (const entry of imported) versions[entry.id] = entry.version;
  storage.setItem(IMPORTED_VERSIONS_KEY, JSON.stringify(versions));
}

function parseBundledDeckManifest(value: unknown): BundledDeckManifest {
  if (!isRecord(value)) throw new Error("invalid bundled deck manifest");
  if (
    value.format !== "web-music-flashcards-manifest" ||
    value.version !== 1 ||
    !Array.isArray(value.decks)
  ) {
    throw new Error("unsupported bundled deck manifest format");
  }
  if (
    !value.decks.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.id === "string" &&
        typeof entry.filename === "string" &&
        typeof entry.url === "string" &&
        typeof entry.version === "string",
    )
  ) {
    throw new Error("invalid bundled deck manifest entry");
  }
  const manifest = value as unknown as BundledDeckManifest;
  if (
    new Set(manifest.decks.map(({ id }) => id)).size !== manifest.decks.length
  ) {
    throw new Error("duplicate bundled deck manifest id");
  }
  return manifest;
}

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function loadImportedVersions(
  storage: StorageLike | undefined,
): Record<string, string> {
  if (!storage) return {};
  try {
    const stored: unknown = JSON.parse(
      storage.getItem(IMPORTED_VERSIONS_KEY) ?? "{}",
    );
    if (!isRecord(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
