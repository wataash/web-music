// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { irealScore } from "./score.js";

const PREFIX = "1r34LbKcu7";
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
  let result = "";
  for (let offset = 0; offset < encoded.length; offset += 50) {
    const block = encoded.slice(offset, offset + 50);
    const letters = [...block];
    if (encoded.length - offset >= 52) {
      for (let index = 0; index < 24; index++) {
        if (index >= 5 && index < 10) continue;
        letters[index] = block[49 - index];
        letters[49 - index] = block[index];
      }
    }
    result += letters.join("");
  }
  return result;
}

export function extractIreal(html) {
  const links = [...html.matchAll(/irealb:\/\/([^"'<>\s]+)/g)];
  if (links.length !== 1) throw new Error("Expected exactly one irealb:// link");
  const payload = decodeURIComponent(links[0][1]);
  if (payload.split(PREFIX).length > 2) throw new Error("Playlists are not supported; export one song per HTML file");
  const fields = payload.split("=");
  const music = fields.find(field => field.startsWith(PREFIX));
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
    const control = /^(?:T\d+|N\d|XyQ|Kcl|LZ|[\s,|{}\[\]YZSQUxpsrlf]+)/.exec(rest);
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
    const chord = /^([A-G][b#]?|W)([+\-^\dhob#suadlt]*)(\/[A-G][#b]?)?/.exec(rest);
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
    chords, comments: [], annotations, score: irealScore(raw, positions, fields, fields.indexOf(music)), unmappedSymbols: [...unmappedSymbols],
  };
}
