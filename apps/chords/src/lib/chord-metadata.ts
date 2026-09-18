// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { resolveIreal, commentText, type IrealEvent } from "./ireal-layout";
import type { ChordDescription } from "./chords";
import type { IrealSong } from "@web-music/ireal";

export type ChordAnnotation = Readonly<{ section?: string; comments: readonly string[] }>;
export type AnnotatedChord = ChordDescription & { annotation?: ChordAnnotation; sourceIndices?: number[]; sourceSymbol?: string };
export type SourceScore = IrealSong["score"];
export type ScoreToken = SourceScore["blocks"][number][number];
export type SongMetadata = Pick<IrealSong, "comments" | "annotations" | "score">;
let practiceCache: Record<string, IrealEvent[]> = {};
let bySong: Record<string, SongMetadata> = {};
export function setImportedMetadata(songs: readonly { id: string; metadata: SongMetadata }[]): void {
  practiceCache = {};
  bySong = Object.fromEntries(songs.map(song => [song.id, song.metadata]));
}

export function songScore(id: string): SourceScore | undefined {
  return bySong[id]?.score;
}

// The lines a chord sits on and the lyric lines under them, up to the next
// line with a chord: a ChordWiki chart is read a line at a time.
export function scoreContext(id: string, index: number): ScoreToken[][] {
  const blocks = songScore(id)?.blocks ?? [];
  const start = blocks.findIndex(block => block.some(token => token.chordIndex === index));
  if (start < 0) return [];
  let end = start + 1;
  while (end < blocks.length && !blocks[end].some(token => token.kind === "chord")) end++;
  return blocks.slice(start, end);
}

// The words a ChordWiki chord is sung on: the text after it up to the next
// chord, carried over a line break when the next line starts without one,
// since a chord at the end of a line is the first chord of the next. A
// ChordWiki chart is practised in written order, so a practice index is
// its chord index.
export function chordLyric(id: string, index: number): string {
  const score = songScore(id);
  if (score?.format !== "chordwiki") return "";
  const words: string[] = [];
  let after = false;
  lines: for (const block of score.blocks) {
    if (after && block.every(token => token.kind === "break")) break;
    for (const token of block) {
      if (token.chordIndex === index) after = true;
      else if (!after) continue;
      else if (token.chordIndex !== undefined) break lines;
      else if (token.kind === "text") words.push(token.text ?? "");
    }
  }
  return words.join(" ").replace(/\s+/g, " ").trim();
}

// ChordWiki marks no sections; a blank line is where one ends.
function blankLineSections(blocks: ScoreToken[][]): number[] {
  const starts: number[] = [];
  let pending = true;
  for (const block of blocks) {
    if (block.every(token => token.kind === "break")) { pending = true; continue; }
    for (const token of block) {
      if (token.chordIndex === undefined) continue;
      if (pending) starts.push(token.chordIndex);
      pending = false;
    }
  }
  return starts;
}

// Without sections a symbol is kept once for the whole song; with them it is
// kept once per section, so a chord reused later starts its section again.
export function uniqueAnnotatedChords(chords: AnnotatedChord[], sections: readonly number[] = []): AnnotatedChord[] {
  const unique = new Map<string, AnnotatedChord>();
  for (const chord of chords) {
    const section = sections.filter(start => start <= (chord.sourceIndices?.[0] ?? 0)).length;
    const key = `${section}:${chord.symbol}`;
    const existing = unique.get(key);
    if (existing) existing.sourceIndices!.push(...chord.sourceIndices ?? []);
    else unique.set(key, { ...chord, sourceIndices: [...chord.sourceIndices ?? []] });
  }
  return [...unique.values()];
}

// Positions where the section marker changes, for uniqueAnnotatedChords.
export function sectionStarts(chords: AnnotatedChord[]): number[] {
  return chords.flatMap((chord, i) => chord.annotation?.section !== chords[i - 1]?.annotation?.section ? [i] : []);
}

export function songComments(id: string): readonly string[] {
  return bySong[id]?.comments ?? [];
}

export function chordAnnotation(id: string, index: number): ChordAnnotation {
  let section: string | undefined;
  const comments: string[] = [];
  for (const annotation of bySong[id]?.annotations ?? []) {
    if (annotation.chordIndex > index) continue;
    if (annotation.section) section = annotation.section;
    if (annotation.chordIndex === index) comments.push(...annotation.comments);
  }
  const score = songScore(id);
  if (!section && score?.format === "chordwiki") {
    const ordinal = blankLineSections(score.blocks).filter(start => start <= index).length;
    if (ordinal) section = String(ordinal);
  }
  return { section, comments };
}

// Resolve repetitions at read time so existing imports and their IDs stay intact.
export function practiceEntries(id: string, chordCount: number): IrealEvent[] {
  const score = songScore(id);
  return score?.format === "ireal" ? practiceCache[id] ??= resolveIreal(score.blocks).events : Array.from({ length: chordCount }, (_, chordIndex) => ({ chordIndex, comments: [] }));
}

export function practiceAnnotation(id: string, index: number): ChordAnnotation {
  const entry = practiceEntries(id, 0)[index];
  if (!entry) return chordAnnotation(id, index);
  const original = chordAnnotation(id, entry.chordIndex);
  return { section: entry.section ?? original.section,
    comments: entry.repeated ? entry.comments : original.comments.map(commentText) };
}
