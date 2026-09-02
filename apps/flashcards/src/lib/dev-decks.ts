// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { parseDeckDocument, type DeckData } from "./deck-data";

export const IMPORTED_VERSIONS_KEY = "music-flashcards:dev-deck-versions";

export type DevDeckManifestEntry = Readonly<{
  id: string;
  filename: string;
  url: string;
  version: string;
}>;

export type DevDeckImport = Readonly<{
  id: string;
  version: string;
  deck: DeckData;
}>;

export function selectChangedDevDecks(
  manifest: readonly DevDeckManifestEntry[],
  importedVersions: Readonly<Record<string, string>>,
  requestedIds?: readonly string[],
  force = false,
): readonly DevDeckManifestEntry[] {
  const requested = requestedIds ? new Set(requestedIds) : null;
  return manifest.filter(
    (entry) =>
      (requested === null || requested.has(entry.id)) &&
      (force || importedVersions[entry.id] !== entry.version),
  );
}

// See changedBundledDeckEntries: the caller imports each deck as it arrives.
export async function changedDevDeckEntries(
  requestedIds?: readonly string[],
  force = false,
): Promise<readonly DevDeckManifestEntry[]> {
  const manifestResponse = await fetch("/__dev_deck/manifest", {
    cache: "no-store",
  });
  if (!manifestResponse.ok) {
    throw new Error(
      `automatic deck manifest failed: HTTP ${manifestResponse.status}`,
    );
  }
  const manifest =
    (await manifestResponse.json()) as readonly DevDeckManifestEntry[];
  return selectChangedDevDecks(
    manifest,
    loadImportedVersions(),
    requestedIds,
    force,
  );
}

export async function fetchDevDeck(
  entry: DevDeckManifestEntry,
): Promise<DevDeckImport> {
  const response = await fetch(entry.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `${entry.filename}: automatic import failed (HTTP ${response.status})`,
    );
  }
  return {
    id: entry.id,
    version: entry.version,
    deck: parseDeckDocument(await response.json()),
  };
}

export function rememberImportedDevDecks(
  imported: readonly DevDeckImport[],
): void {
  const versions = loadImportedVersions();
  for (const entry of imported) versions[entry.id] = entry.version;
  localStorage.setItem(IMPORTED_VERSIONS_KEY, JSON.stringify(versions));
}

export function listenForDevDeckUpdates(
  listener: (id: string) => void,
): () => void {
  const hot = import.meta.hot;
  if (!hot) return () => {};
  const handler = (data: { id: string }): void => listener(data.id);
  hot.on("dev-deck-updated", handler);
  return () => hot.off("dev-deck-updated", handler);
}

function loadImportedVersions(): Record<string, string> {
  try {
    const stored = localStorage.getItem(IMPORTED_VERSIONS_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return {};
  }
}
