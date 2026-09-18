// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// A ChordWiki chart pasted as text: one song, its chords written `[C]` before
// the lyric they fall on and its details in `{title:…}` directives. The
// chords are respelled the way the custom chart editor respells its input,
// so a chart reads the same as the rest of the library; the source text is
// kept token for token in the score, which is what the chart view draws and
// what an export writes back out.

import { extractChordWiki } from '@web-music/chordwiki';

import type { ImportedSong } from './chord-import';
import { normalizeInputChord } from './custom-chart';
import { formatNote, parseChordSymbol, parseNote } from './chords';

// The playlist every ChordWiki chart belongs to.
export const CHORDWIKI_PLAYLIST = 'ChordWiki';

// A chord the app cannot spell is kept as written, with its root readable, so
// the chart still shows it and practice passes over it.
function chordSymbol(chord: string): string {
  try { return normalizeInputChord(chord); }
  catch {
    const symbol = chord.replaceAll('♭', 'b').replaceAll('♯', '#');
    parseChordSymbol(symbol, true);
    return symbol;
  }
}

// ChordWiki writes a minor key with an m; the app keeps the tonic. Without a
// key the first chord's root stands in, and the reader can transpose from it.
function originalKeyOf(key: string | null, chords: readonly string[]): string {
  const written = key?.replace(/[-m]$/, '').replaceAll('♭', 'b').replaceAll('♯', '#').trim() ?? '';
  try { return formatNote(parseNote(written)); } catch { /* No usable key directive. */ }
  for (const chord of chords) {
    const parsed = parseChordSymbol(chord, true);
    if (parsed) return formatNote(parsed.root);
  }
  return 'C';
}

// An edited chart keeps its id, and with it its favorite and its place.
export async function parseChordWiki(text: string, id?: string): Promise<ImportedSong> {
  const source = extractChordWiki(text);
  const chords = source.chords.map(chordSymbol);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  id ??= 'chordwiki-' + [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return {
    id,
    title: source.title?.trim() || 'Untitled',
    artist: source.artist?.trim() ?? '',
    originalKey: originalKeyOf(source.originalKey, chords),
    chords,
    playlist: CHORDWIKI_PLAYLIST,
    metadata: { comments: source.comments, annotations: source.annotations, score: source.score },
  };
}

// The score keeps every character of the source, so the text comes back out
// of it the way it went in.
export function chordWikiText(song: ImportedSong): string | undefined {
  return song.metadata.score.format === 'chordwiki' ? song.metadata.score.blocks.flat().map(token => token.raw).join('') : undefined;
}
