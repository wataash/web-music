// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { legacyIrealLabel } from "./ireal-labels";
import Dexie, { type Table } from "dexie";
import { containsIrealLink, extractIrealPlaylist } from "@web-music/ireal";
import type { ChordSong } from "./chord-songs";
import type { SongMetadata } from "./chord-metadata";
import { describeChord, parseNote } from "./chords";
import { createCustomChart, refreshCustomChart } from "./custom-chart";
import { parseChordWiki } from "./chordwiki-import";

export type ChordImportFormat = "ireal" | "chordwiki" | "list";

export type ImportedSong = ChordSong & { metadata: SongMetadata; playlist: string; additionalPlaylists?: string[]; playlistPositions?: Record<string, number[]>; importedAt?: number; customText?: string };

export function songPlaylists(song: ImportedSong): string[] {
  return [song.playlist, ...(song.additionalPlaylists ?? [])];
}

function mergeMembership(song: ImportedSong, existing?: ImportedSong): ImportedSong {
  if (!existing) return song;
  const [playlist, ...additionalPlaylists] = new Set([...songPlaylists(existing), ...songPlaylists(song)]);
  return additionalPlaylists.length ? { ...song, playlist, additionalPlaylists } : song;
}

function uniqueSongs(songs: ImportedSong[]): ImportedSong[] {
  const unique = new Map<string, ImportedSong>();
  for (const song of songs) unique.set(song.id, mergeMembership(song, unique.get(song.id)));
  return [...unique.values()];
}

// IndexedDB has room for whole playlists, including their source notation.
// No uploaded chart is sent to a server or added to the built-in song data.
class ChordLibrary extends Dexie {
  songs!: Table<ImportedSong, string>;
  playlistOrders!: Table<{ name: string; ids: string[] }, string>;
  constructor() {
    super("music-flashcards-chord-library");
    this.version(1).stores({ songs: "id" });
    this.version(2).stores({ playlistOrders: "name" });
    this.version(3).stores({}).upgrade(async tx => {
      const orders = tx.table<{ name: string; ids: string[] }>("playlistOrders");
      const songs = await tx.table<ImportedSong>("songs").toArray();
      songs.sort((a, b) => (a.importedAt ?? 0) - (b.importedAt ?? 0));
      const memberships = new Map<string, string[]>();
      for (const song of songs) {
        if (!song.id.startsWith("ireal-")) continue;
        for (const name of songPlaylists(song)) {
          const ids = memberships.get(name) ?? [];
          ids.push(song.id);
          memberships.set(name, ids);
        }
      }
      for (const [name, members] of memberships) {
        const order = await orders.get(name);
        const ranked = new Set(order?.ids);
        const missing = members.filter(id => !ranked.has(id));
        if (missing.length) await orders.put({ name, ids: missing.concat(order?.ids ?? []) });
      }
    });
  }
}
function normalizeAccidentals(note: string): string {
  return note.replaceAll("♭", "b").replaceAll("♯", "#");
}

// Interpret the same key annotations on fresh imports and previously saved songs.
function restoreChartKeys(song: ImportedSong): ImportedSong {
  if (song.customText !== undefined) return refreshCustomChart(song);
  if (song.metadata.score.format !== 'ireal') return song;
  let tonic = song.originalKey;
  let keys: string[] | undefined;
  for (const block of song.metadata.score.blocks) {
    for (const token of block) {
      const change = token.kind === 'comment' && /^<(?:\*\d+)?Key: ([A-G](?:b*|#*))([m-]?)>$/.exec(normalizeAccidentals(token.raw));
      if (change) {
        tonic = change[1];
        keys ??= Array(song.chords.length).fill(song.originalKey);
        token.name = 'key-change';
        token.text = tonic + (change[2] ? 'm' : '');
      } else if (keys && token.chordIndex !== undefined) {
        keys[token.chordIndex] = tonic;
      }
    }
  }
  return keys ? { ...song, chordKeys: keys } : song;
}

const library = new ChordLibrary();
export const loadImportedSongs = async () => {
  await library.open();
  return library.transaction("r", library.songs, library.playlistOrders, async () => {
    const songs = (await library.songs.toArray()).map(restoreChartKeys);
    const byId = new Map(songs.map(song => [song.id, song]));
    for (const { name, ids } of await library.playlistOrders.toArray()) {
      ids.forEach((id, index) => {
        const song = byId.get(id);
        if (song) {
          const positions = song.playlistPositions ??= Object.create(null);
          (positions[name] ??= []).push(index);
        }
      });
    }
    return songs;
  });
};
export const saveImportedSongs = async (songs: ImportedSong[]) => {
  // Dexie retains a failed automatic open. Explicitly open again so a later
  // import can recover after a temporary storage failure without a reload.
  await library.open();
  return library.transaction("rw", library.songs, library.playlistOrders, async () => {
    const groups = new Map<string, string[]>();
    for (const song of songs) {
      if (!song.id.startsWith("ireal-")) continue;
      let ids = groups.get(song.playlist);
      if (!ids) groups.set(song.playlist, ids = []);
      ids.push(song.id);
    }
    for (const [name, incoming] of groups) {
      const previous = (await library.playlistOrders.get(name))?.ids ?? [];
      // A partial import is already represented if its entries appear in order.
      let matched = 0;
      for (const id of previous) {
        if (id === incoming[matched]) matched++;
      }
      if (matched === incoming.length) continue;

      // Replace one slot per incoming occurrence, keeping extra repeats in place.
      const remaining = new Map<string, number>();
      for (const id of incoming) remaining.set(id, (remaining.get(id) ?? 0) + 1);
      const ids: string[] = [];
      let index = 0;
      for (const id of previous) {
        const count = remaining.get(id) ?? 0;
        if (count > 0) {
          ids.push(incoming[index++]);
          remaining.set(id, count - 1);
        } else ids.push(id);
      }
      ids.push(...incoming.slice(index));
      await library.playlistOrders.put({ name, ids });
    }
    const batch = uniqueSongs(songs);
    const existing = await library.songs.bulkGet(batch.map(song => song.id));
    const start = Date.now();
    return library.songs.bulkPut(batch.map((song, index) => ({ ...mergeMembership(song, existing[index]), importedAt: existing[index]?.importedAt ?? start + index / batch.length })));
  });
};
export const deleteImportedSong = (id: string) => library.transaction("rw", library.songs, library.playlistOrders, async () => {
  const song = await library.songs.get(id);
  if (!song) return;
  for (const name of songPlaylists(song)) {
    const order = await library.playlistOrders.get(name);
    if (order) await library.playlistOrders.put({ name, ids: order.ids.filter(member => member !== id) });
  }
  await library.songs.delete(id);
});

// What a chart typed as a chord list needs besides its text, and what an
// edited chart keeps.
export type ChordImportOptions = Readonly<{ title?: string; key?: string; id?: string; retainPlaylistEntries?: boolean }>;

// The reader names the notation; a paste that plainly belongs to another
// one is pointed there rather than parsed as nothing.
export async function parseChordImport(text: string, format: ChordImportFormat = "ireal", options: ChordImportOptions = {}) {
  const songs: ImportedSong[] = [];
  const irealLink = containsIrealLink(text);
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
  const parsed = extractIrealPlaylist(text, { includeLegacyIdSource: true });
  const errors = parsed.errors.map(error => `${error.title}: ${error.message}`);
  for (const { playlist, legacyIdSource, ...source } of parsed.songs) {
    try {
      const originalKey = normalizeAccidentals(source.originalKey).replace(/[-m]$/, "");
      parseNote(originalKey);
      for (const chord of new Set(source.chords)) describeChord(chord, originalKey, originalKey, true);
      const content = JSON.stringify(legacyIdSource ?? source, function (key, value) {
        if (key === "label") return legacyIrealLabel(value);
        if (key === "text" && this.kind === "size") return value === "Narrow" ? "狭" : value === "Standard" ? "標準" : value;
        return value;
      });
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
      const id = "ireal-" + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
      songs.push(restoreChartKeys({ id, title: source.title || "Untitled", artist: source.artist,
        originalKey, chords: source.chords, playlist,
        metadata: { comments: source.comments, annotations: source.annotations, score: source.score } }));
    } catch (error) {
      errors.push(`${source.title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { songs: options.retainPlaylistEntries ? songs : uniqueSongs(songs), errors };
}
