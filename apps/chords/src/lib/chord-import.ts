// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { legacyIrealLabel } from "./ireal-labels";
import Dexie, { type Table } from "dexie";
import { extractIrealPlaylist } from "@web-music/ireal";
import type { ChordSong } from "./chord-songs";
import type { SongMetadata } from "./chord-metadata";
import { describeChord, parseNote } from "./chords";
import { createCustomChart, refreshCustomChart } from "./custom-chart";
import { parseChordWiki } from "./chordwiki-import";

export type ChordImportFormat = "ireal" | "chordwiki" | "list";

export type ImportedSong = ChordSong & { metadata: SongMetadata; playlist: string; importedAt?: number; customText?: string };

// IndexedDB has room for whole playlists, including their source notation.
// No uploaded chart is sent to a server or added to the built-in song data.
class ChordLibrary extends Dexie {
  songs!: Table<ImportedSong, string>;
  constructor() {
    super("music-flashcards-chord-library");
    this.version(1).stores({ songs: "id" });
  }
}
const library = new ChordLibrary();
export const loadImportedSongs = async () => (await library.songs.toArray()).map(refreshCustomChart);
export const saveImportedSongs = (songs: ImportedSong[]) => library.transaction("rw", library.songs, async () => {
  const existing = await library.songs.bulkGet(songs.map(song => song.id));
  const start = Date.now();
  return library.songs.bulkPut(songs.map((song, index) => ({ ...song, importedAt: existing[index]?.importedAt ?? start + index / Math.max(1, songs.length) })));
});
export const deleteImportedSong = (id: string) => library.songs.delete(id);

// What a chart typed as a chord list needs besides its text, and what an
// edited chart keeps.
export type ChordImportOptions = Readonly<{ title?: string; key?: string; id?: string }>;

// The reader names the notation; a paste that plainly belongs to another
// one is pointed there rather than parsed as nothing.
export async function parseChordImport(text: string, format: ChordImportFormat = "ireal", options: ChordImportOptions = {}) {
  const songs: ImportedSong[] = [];
  const irealLink = /ireal(?:book|b)?:\/\//.test(text);
  if (format === "list") {
    try { songs.push(createCustomChart(text, options.title ?? "", options.key ?? "C", options.id)); }
    catch (error) { return { songs, errors: [error instanceof Error ? error.message : String(error)] }; }
    return { songs, errors: [] };
  }
  if (format === "chordwiki") {
    if (irealLink) return { songs, errors: ["This is an iReal Pro link. Choose iReal Pro to import it."] };
    try { songs.push(await parseChordWiki(text, options.id)); }
    catch (error) { return { songs, errors: [`ChordWiki: ${error instanceof Error ? error.message : String(error)}`] }; }
    return { songs, errors: [] };
  }
  if (!irealLink && /\[[A-G][^\]]*\]/.test(text)) return { songs, errors: ["No iReal Pro link found. This looks like a ChordWiki chart: choose ChordWiki to import it."] };
  const parsed = extractIrealPlaylist(text);
  const errors = parsed.errors.map(error => `${error.title}: ${error.message}`);
  for (const source of parsed.songs) {
    try {
      const originalKey = source.originalKey.replace(/[-m]$/, "");
      parseNote(originalKey);
      for (const chord of new Set(source.chords)) describeChord(chord, originalKey, originalKey, true);
      const content = JSON.stringify(source, function (key, value) {
        if (key === "label") return legacyIrealLabel(value);
        if (key === "text" && this.kind === "size") return value === "Narrow" ? "狭" : value === "Standard" ? "標準" : value;
        return value;
      });
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
      const id = "ireal-" + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
      songs.push({ id, title: source.title || "Untitled", artist: source.artist,
        originalKey, chords: source.chords, playlist: parsed.name,
        metadata: { comments: source.comments, annotations: source.annotations, score: source.score } });
    } catch (error) {
      errors.push(`${source.title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { songs: [...new Map(songs.map(song => [song.id, song])).values()], errors };
}
