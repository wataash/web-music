// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { decodeHTMLAttribute } from "entities/decode";
import { IREAL_HEADER_LABELS, irealScore } from "./score.js";
export { IREAL_HEADER_LABELS, IREAL_PLAYBACK_LABELS, irealScore } from "./score.js";

// Marks the music field of a song entry.
export const IREAL_MUSIC_PREFIX = "1r34LbKcu7";
const PREFIX = IREAL_MUSIC_PREFIX;
const QUALITIES = new Map(Object.entries({
  "": "", "-": "m", "-6": "m6", "-7": "m7", "-9": "m9", "-11": "m11",
  "-^7": "mM7", "-7b5": "m7b5", h7: "m7b5", "^7": "M7", "^9": "M9",
  o7: "dim7", "+": "aug", "7#5": "aug7", "7b9#5": "aug7(b9)",
  "7#9#5": "aug7(#9)", "7b9": "7(b9)", "9sus": "9sus4", sus: "sus4",
  sus4: "sus4", "6": "6", "7": "7", "9": "9", "11": "11", "13": "13",
}));

// iReal's 50-character permutation is its own inverse. Format reference:
// https://github.com/pianosnake/ireal-reader/blob/master/unscramble.js
export function scramble(encoded) {
  const letters = Array.from(encoded);
  for (let offset = 0; letters.length - offset >= 52; offset += 50) {
    for (let index = 0; index < 24; index++) {
      if (index >= 5 && index < 10) continue;
      const left = offset + index;
      const right = offset + 49 - index;
      [letters[left], letters[right]] = [letters[right], letters[left]];
    }
  }
  return letters.join("");
}

export function containsIrealLink(text) {
  return /ireal(?:b|book):\/\//i.test(text);
}

export function extractIreal(html) {
  const collection = readPlaylist(html, true);
  if (collection.errors.length) throw new Error(collection.errors[0].message);
  if (collection.songs.length !== 1) throw new Error("Expected exactly one song; use extractIrealPlaylist for playlists");
  return collection.songs[0];
}

// Parse links as text, never as executable HTML. A bad chart must not prevent
// the remaining songs in a shared playlist from being imported.
export function extractIrealPlaylist(text, { includeLegacyIdSource = false } = {}) {
  return readPlaylist(text, false, includeLegacyIdSource);
}

function songEntries(payload) {
  const entries = [];
  let start = 0;
  let previousMusic = -1;
  for (const marker of payload.matchAll(/=1r34LbKcu7/g)) {
    if (previousMusic < 0) {
      if (payload.slice(0, marker.index).split("=").length < IREAL_HEADER_LABELS.length) continue;
    } else {
      // Search between music fields so empty playback or header fields in
      // another song cannot be mistaken for this song's boundary.
      const gap = payload.slice(previousMusic, marker.index);
      let boundary = -1;
      for (let split = gap.lastIndexOf("==="); split >= 0; split = gap.lastIndexOf("===", split - 1)) {
        const header = gap.slice(split + 3).split("=");
        // Prefer a header with a recognizable key over a six-field suffix.
        if (header.length === 6) boundary = previousMusic + split;
        if (header.length >= 6 && /^[A-G][#b♯♭]*[-m]?$/.test(header[4])) {
          boundary = previousMusic + split;
          // A suffix can also contain a note name in the key slot. Check
          // the following transpose field before accepting that boundary.
          if (/^(?:[+-]?\d+)?$/.test(header[5])) break;
        }
        if (split === 0) break;
      }
      if (boundary < 0) continue;
      entries.push(payload.slice(start, boundary));
      start = boundary + 3;
    }
    previousMusic = marker.index + marker[0].length;
  }
  entries.push(payload.slice(start));
  return { entries, lastMusicAt: previousMusic < 0 ? -1 : previousMusic - PREFIX.length - start };
}

function readPlaylist(text, strictLinks, includeLegacyIdSource = false) {
  // In HTML, a URL printed in a heading or link label is just display text.
  // Also accept plain links and newline-separated pasted playlists.
  const links = [];
  if (/^\s*</.test(text)) {
    for (const tag of text.matchAll(/<!--[\s\S]*?-->|<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
      if (tag[1] === undefined) continue;
      for (const attr of tag[1].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        if (attr[1].toLowerCase() !== 'href') continue;
        const href = decodeHTMLAttribute(attr[2] ?? attr[3] ?? attr[4] ?? '').trim();
        const match = /^(irealb|irealbook):\/\/(.*)$/i.exec(href);
        if (match) links.push(match);
        break;
      }
    }
  } else {
    for (const match of text.matchAll(/(irealb|irealbook):\/\/([^"<>\s]*)/gi)) links.push(match);
  }
  if (!links.length) throw new Error("iReal Proの共有リンクが見つかりません。");
  const songs = [], errors = [];
  let name = "";
  for (const [index, [, scheme, encoded]] of links.entries()) {
    if (!encoded) {
      errors.push({ title: `Link ${index + 1}`, message: "Empty iReal sharing link." });
      continue;
    }
    let payload;
    try { payload = decodeURIComponent(encoded); }
    catch (error) {
      if (strictLinks) throw error;
      errors.push({ title: `Link ${index + 1}`, message: error.message });
      continue;
    }
    let entries;
    let playlist = "";
    if (scheme.toLowerCase() === "irealbook") {
      const fields = payload.split("=");
      if (fields.length < 6) {
        errors.push({ title: fields[0] || `Link ${index + 1}`, message: "Incomplete iRealBook song: expected six fields." });
        continue;
      }
      entries = [];
      while (fields.length >= 6) {
        const [title, artist, style, key, , raw] = fields.splice(0, 6);
        entries.push([title, artist, "", style, key, "", PREFIX + scramble(raw)].join("="));
      }
      playlist = fields.join("=");
    } else {
      const parsed = songEntries(payload);
      entries = parsed.entries;
      const last = entries.at(-1);
      const musicAt = parsed.lastMusicAt;
      let end = last.indexOf("===", musicAt + PREFIX.length);
      // Empty style and tempo put === before the numeric chorus count itself.
      if (end >= 0) {
        const fieldsBefore = last.slice(musicAt, end).split("=").length - 1;
        const next = last.indexOf("===", end + 3);
        // Empty fields after any playback setting can precede an extension.
        if (next >= 0 && fieldsBefore >= 1) end = next;
        else if (fieldsBefore === 0) {
          const choruses = /^===\d+(?:=(?!==)[^=]*)*(?====)/.exec(last.slice(end));
          if (choruses) end += choruses[0].length;
        }
      }
      if (musicAt >= 0 && end >= 0) {
        playlist = last.slice(end + 3);
        entries[entries.length - 1] = last.slice(0, end);
      }
    }
    for (const entry of entries) {
      try {
        const song = extractSong(entry);
        if (includeLegacyIdSource && song.score.blocks.some(block =>
          block.some((token, i) => token.kind === "size" && block[i - 1]?.kind === "chord"))) {
          try { song.legacyIdSource = extractSong(entry, chordForLegacyId); }
          catch { /* A chart rejected by the old parser has no existing ID. */ }
        }
        songs.push(strictLinks ? song : { ...song, playlist });
        name ||= playlist;
      }
      catch (error) { errors.push({ title: entry.split("=")[0], message: error.message }); }
    }
  }
  return { name, songs, errors };
}

function chordPattern(quality) {
  return new RegExp(String.raw`^([A-G][b#]*|W)(\*[^*]*\*|(?:maj|min)?${quality}(?:\((?=[a-z+#-]*\d)[a-z0-9+#,-]+\))?)(\/[A-G][#b]*)?`);
}
const chordWithSpacing = chordPattern(String.raw`(?:sus|alt|add|[+\-^\dhob#])*`);
// Previous imports hashed the parsed score, including spacing misread as chord text.
const chordForLegacyId = chordPattern(String.raw`[+\-^\dhob#suadlt]*`);

function extractSong(payload, pattern = chordWithSpacing) {
  const fields = payload.split("=");
  const musicIndex = fields.findIndex((field, index) => index >= IREAL_HEADER_LABELS.length && field.startsWith(PREFIX));
  const music = fields[musicIndex];
  if (!music) throw new Error("Unsupported iReal encoding (expected 1r34LbKcu7)");
  const raw = scramble(music.slice(PREFIX.length));
  const chords = [];
  const positions = [];
  const annotations = [];
  let chordInMeasure = null;
  const unmappedSymbols = new Set();
  let lastChord = null;
  let offset = 0;
  while (offset < raw.length) {
    const rest = raw.slice(offset);
    const section = /^\*(\w)/.exec(rest);
    if (section) {
      annotations.push({ chordIndex: chords.length, section: section[1], comments: [] });
      chordInMeasure = null;
      offset += section[0].length;
      continue;
    }
    const comment = /^<([^>]*)>/.exec(rest);
    if (comment) {
      const text = comment[1].replace(/^\*\d+/, "").trim();
      if (text) annotations.push({ chordIndex: chordInMeasure ?? chords.length, comments: [text] });
      offset += comment[0].length;
      continue;
    }
    // Ignore layout and navigation. Do not expand repeats.
    // Token reference: https://github.com/pianosnake/ireal-reader/blob/master/Parser.js
    const control = /^(?:T\d+|N\d|XyQ|Kcl|LZ|[\s,|{}\[\]()YZSQUxpsrlf]+)/.exec(rest);
    if (control) {
      if (/LZ|Kcl|[|{}\[\]]/.test(control[0])) chordInMeasure = null;
      offset += control[0].length; continue;
    }
    if (rest[0] === "n") {
      positions.push({ start: offset, end: offset + 1, chordIndex: chords.length });
      chordInMeasure = chords.length;
      chords.push("N.C.");
      offset++;
      continue;
    }
    const chord = pattern.exec(rest);
    if (!chord) throw new Error(`Unrecognized iReal token at ${offset}: ${rest.slice(0, 24)}`);
    positions.push({ start: offset, end: offset + chord[0].length, chordIndex: chords.length });
    let [, root, quality, bass = ""] = chord;
    chordInMeasure = chords.length;
    if (root === "W") {
      if (!lastChord) throw new Error("Bass-only chord has no preceding chord");
      chords.push(lastChord + bass);
    } else {
      if (!QUALITIES.has(quality)) unmappedSymbols.add(chord[0]);
      lastChord = root + (QUALITIES.get(quality) ?? quality);
      chords.push(lastChord + bass);
    }
    offset += chord[0].length;
  }
  if (!chords.length) throw new Error("No chords found");
  return {
    format: "ireal", title: fields[0], artist: fields[1], originalKey: fields[4],
    chords, comments: [], annotations, score: irealScore(raw, positions, fields, musicIndex), unmappedSymbols: [...unmappedSymbols],
  };
}
