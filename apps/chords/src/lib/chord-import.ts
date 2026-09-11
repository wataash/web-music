// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { legacyIrealLabel } from "./ireal-labels";
import Dexie, { type Table } from "dexie";
import { extractIrealPlaylist } from "@web-music/ireal";
import type { ChordSong } from "./chord-songs";
import type { SongMetadata } from "./chord-metadata";
import { describeChord, parseNote } from "./chords";

export type ImportedSong = ChordSong & { metadata: SongMetadata; playlist: string };

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
export const loadImportedSongs = () => library.songs.toArray();
export const saveImportedSongs = (songs: ImportedSong[]) => library.transaction("rw", library.songs, () => library.songs.bulkPut(songs));
export const deleteImportedSong = (id: string) => library.songs.delete(id);

export async function parseChordImport(text: string) {
  const parsed = extractIrealPlaylist(text);
  const songs: ImportedSong[] = [];
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
