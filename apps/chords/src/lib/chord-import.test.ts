// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { scramble } from "@web-music/ireal";
import { parseChordImport } from "./chord-import";
import { describeChord } from "./chords";

const song = (title: string, music: string, key = "C") => `${title}===Swing=${key}==1r34LbKcu7${scramble(music)}==120=2`;
const link = (payload: string) => `irealb://${encodeURIComponent(payload)}`;

it("imports extended chords and minor keys with stable duplicate IDs", async () => {
  const text = link(song("Practice", "C-69 F7#11 G7sus(A7b9) C*-^*", "C-"));
  const first = await parseChordImport(text);
  const second = await parseChordImport(text + "\n" + text);
  expect(first.errors).toEqual([]);
  expect(second.songs).toEqual(first.songs);
  expect(first.songs[0].originalKey).toBe("C");
  expect(first.songs[0].metadata.score.blocks.flat().filter(t => t.kind === "chord")).toHaveLength(5);
  expect(describeChord("F7#11", "C", "D").tones.map(t => t.note)).toContain("C#");
  expect(describeChord("C*-^*", "C", "D", true)).toMatchObject({ symbol: "D*-^*", tones: [], unsupported: true });
});

it("keeps good songs when a playlist contains an invalid key", async () => {
  const result = await parseChordImport(link(song("Bad", "C", "unknown") + "===" + song("Good", "G") + "===Examples"));
  expect(result.songs).toHaveLength(1);
  expect(result.songs[0].playlist).toBe("Examples");
  expect(result.errors).toHaveLength(1);
});

it("imports valid charts alongside malformed sharing links", async () => {
  const result = await parseChordImport('irealb://%ZZ\n' + link(song('Good', 'C|G7')));
  expect(result.songs.map(song => song.title)).toEqual(['Good']);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0]).toMatch(/^Link 1:/);
});

// Optional local fixture, never bundled or committed with the application.
it.skipIf(!process.env.IREAL_PLAYLIST_PATH)("imports all 1460 local playlist songs and transposes every chord", async () => {
  const result = await parseChordImport(readFileSync(process.env.IREAL_PLAYLIST_PATH!, "utf8"));
  expect(result.errors).toEqual([]);
  expect(result.songs).toHaveLength(1460);
  for (const song of result.songs) {
    for (const symbol of song.chords) {
      const chord = describeChord(symbol, song.originalKey, "D", true);
      expect(chord.symbol).toBeTruthy();
      expect(chord.tones.every(tone => Number.isFinite(tone.pitchClass))).toBe(true);
    }
  }
}, 30000);

it("preserves pre-English-parser song IDs while storing English labels", async () => {
  const text = link(`Compatibility=Artist==Swing=C==1r34LbKcu7${scramble('*AT44{C<*33Note>sG7lC|N1x}N2r|pS QfU Y')}==120=2`);
  const result = await parseChordImport(text);
  expect(result.errors).toEqual([]);
  expect(result.songs[0].id).toBe('ireal-e950163ec3ef474222866af40242a44bda1899d0d9a36eeb33259e2e1befcf92');
  expect(result.songs[0].metadata.score.fields[0].label).toBe('Title');
  expect(result.songs[0].metadata.score.blocks.flat()).toContainEqual(expect.objectContaining({ label: 'Time signature' }));
});
