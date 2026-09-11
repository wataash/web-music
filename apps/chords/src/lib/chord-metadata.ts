// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { ChordDescription } from "./chords";
import type { IrealSong } from "@web-music/ireal";

export type ChordAnnotation = Readonly<{ section?: string; comments: readonly string[] }>;
export type AnnotatedChord = ChordDescription & { annotation?: ChordAnnotation; sourceIndices?: number[] };
export type SourceScore = IrealSong["score"];
export type ScoreToken = SourceScore["blocks"][number][number];
export type SongMetadata = Pick<IrealSong, "comments" | "annotations" | "score">;
let bySong: Record<string, SongMetadata> = {};
export function setImportedMetadata(songs: readonly { id: string; metadata: SongMetadata }[]): void {
  bySong = Object.fromEntries(songs.map(song => [song.id, song.metadata]));
}

export function songScore(id: string): SourceScore | undefined {
  return bySong[id]?.score;
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

// Section boundaries come from the imported chart markers.
export function sectionStarts(id: string): readonly number[] {
  const song = bySong[id];
  const marked = [...new Set(song?.annotations.filter(annotation => annotation.section).map(annotation => annotation.chordIndex) ?? [])];
  return marked.sort((a, b) => a - b);
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
  return { section, comments };
}
