// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type ChordWikiSong = {
  format: "chordwiki"; title: string | null; artist: string | null; originalKey: string | null;
  chords: string[]; comments: string[];
  annotations: { chordIndex: number; section?: string; comments: string[] }[];
  score: { format: "chordwiki"; fields: { label: string; value: string }[];
    blocks: { kind: string; raw: string; text?: string; chordIndex?: number; label?: string; name?: string; italic?: boolean }[][] };
  unmappedSymbols: string[];
};
export function extractChordWiki(markdown: string): ChordWikiSong;
