// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { DEGREES, intervalsForQuality } from "./intervals.js";
import { spellDegree } from "./notes.js";

const chordPattern = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/;

function increment(counts, key) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function addSong(songIndexes, key, songIndex) {
  if (!songIndexes.has(key)) songIndexes.set(key, new Set());
  songIndexes.get(key).add(songIndex);
}

function compareNames(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function ranked(counts, songIndexes, limit = Infinity) {
  return [...counts]
    .map(([name, count]) => ({
      name,
      count,
      ...(songIndexes === undefined
        ? {}
        : { songs: songIndexes.get(name)?.size ?? 0 }),
    }))
    .sort(
      (left, right) =>
        right.count - left.count || compareNames(left.name, right.name),
    )
    .slice(0, limit);
}

function qualityFamily(quality) {
  if (["", "2", "add9", "6", "69"].includes(quality)) return "major/6";
  if (quality.startsWith("^")) return "major 7";
  if (quality.startsWith("-")) return "minor";
  if (quality.startsWith("h")) return "half-diminished";
  if (quality.startsWith("o")) return "diminished";
  if (quality === "+") return "augmented";
  if (quality === "sus") return "suspended triad";
  if (/^(7|9|11|13)/.test(quality)) return "dominant/sus";
  return "other";
}

function validatePlaylist(playlist) {
  if (playlist === null || typeof playlist !== "object") {
    throw new TypeError("playlist must be an object");
  }
  if (!Array.isArray(playlist.songs)) {
    throw new TypeError("playlist.songs must be an array");
  }
}

export function analyzePlaylist(playlist, { exactLimit = Infinity } = {}) {
  validatePlaylist(playlist);
  if (
    exactLimit !== Infinity &&
    (!Number.isSafeInteger(exactLimit) || exactLimit < 0)
  ) {
    throw new TypeError("exactLimit must be a non-negative integer");
  }

  const exact = new Map();
  const exactSongs = new Map();
  const roots = new Map();
  const rootSongs = new Map();
  const qualities = new Map();
  const qualitySongs = new Map();
  const families = new Map();
  const familySongs = new Map();
  const intervals = new Map();
  const intervalSongs = new Map();
  const noteIntervals = new Map();
  const noteIntervalSongs = new Map();
  const tones = new Map();
  const toneSongs = new Map();
  const basses = new Map();
  const keySignatures = new Map();
  let measures = 0;
  let occurrences = 0;
  let slashChords = 0;
  let unspelledTones = 0;

  playlist.songs.forEach((song, songIndex) => {
    if (!Array.isArray(song?.music?.measures)) {
      throw new TypeError(`songs[${songIndex}].music.measures must be an array`);
    }
    if (typeof song.key === "string") increment(keySignatures, song.key);
    measures += song.music.measures.length;

    song.music.measures.forEach((measure, measureIndex) => {
      if (!Array.isArray(measure)) {
        throw new TypeError(
          `songs[${songIndex}].music.measures[${measureIndex}] must be an array`,
        );
      }

      for (const chord of measure) {
        if (chord === null) continue;
        if (typeof chord !== "string") {
          throw new TypeError(
            `songs[${songIndex}].music.measures[${measureIndex}] contains a non-string chord`,
          );
        }

        const match = chord.match(chordPattern);
        if (match === null) throw new TypeError(`unparsed chord: ${chord}`);
        const [, root, quality, bass] = match;
        const family = qualityFamily(quality);

        occurrences += 1;
        increment(exact, chord);
        addSong(exactSongs, chord, songIndex);
        increment(roots, root);
        addSong(rootSongs, root, songIndex);
        increment(qualities, quality || "(triad)");
        addSong(qualitySongs, quality || "(triad)", songIndex);
        increment(families, family);
        addSong(familySongs, family, songIndex);
        for (const interval of intervalsForQuality(quality)) {
          const pair = `${root} ${interval}`;
          increment(intervals, interval);
          addSong(intervalSongs, interval, songIndex);
          increment(noteIntervals, pair);
          addSong(noteIntervalSongs, pair, songIndex);
          const tone = spellDegree(root, DEGREES.get(interval));
          if (tone === null) {
            unspelledTones += 1;
            continue;
          }
          increment(tones, tone);
          addSong(toneSongs, tone, songIndex);
        }
        if (bass !== undefined) {
          slashChords += 1;
          increment(basses, bass);
        }
      }
    });
  });

  return {
    playlist: playlist.name,
    songs: playlist.songs.length,
    measures,
    occurrences,
    uniqueExactChords: exact.size,
    uniqueQualities: qualities.size,
    slashChords,
    unspelledTones,
    roots: ranked(roots, rootSongs),
    qualities: ranked(qualities, qualitySongs),
    families: ranked(families, familySongs),
    intervals: ranked(intervals, intervalSongs),
    noteIntervals: ranked(noteIntervals, noteIntervalSongs),
    tones: ranked(tones, toneSongs),
    exact: ranked(exact, exactSongs, exactLimit),
    basses: ranked(basses),
    keySignatures: ranked(keySignatures),
  };
}
