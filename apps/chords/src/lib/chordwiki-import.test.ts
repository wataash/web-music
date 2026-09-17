// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { chordWikiText, parseChordWiki } from './chordwiki-import';
import { parseChordImport } from './chord-import';
import { chordAnnotation, chordLyric, practiceEntries, scoreContext, setImportedMetadata } from './chord-metadata';
import { describeChord } from './chords';

// An original chart in ChordWiki notation; no third-party chart is stored here.
const chart = `{title:Evening Practice}
{subtitle:歌：Example Singer　作詞・作曲：Example Writer}
{c:BPM=100　4/4拍子}
{key:Am}
[Am7(11)]●●●[D7(b9,b13)]●●[GM7]●
●●[Cm7(#13)]●[N.C.]●[F#m7-5]●

{ci:Chorus}
[Am]●●[G/B]●●[Fadd9]●
`;

describe('ChordWiki import', () => {
  it('points a paste at the notation it belongs to', async () => {
    expect((await parseChordImport(chart, 'ireal')).errors).toEqual(['No iReal Pro link found. This looks like a ChordWiki chart: choose ChordWiki to import it.']);
    expect((await parseChordImport('irealb://Song%3DA%3D%3D', 'chordwiki')).errors).toEqual(['This is an iReal Pro link. Choose iReal Pro to import it.']);
    expect((await parseChordImport('<a href="irealbook://x">[C]</a>', 'ireal')).songs).toEqual([]);
  });

  it('respells the chords the way the editor does, keeps the ones it cannot, and reads the key', async () => {
    const song = await parseChordWiki(chart);
    expect(song.id).toMatch(/^chordwiki-[0-9a-f]{64}$/);
    expect(song.title).toBe('Evening Practice');
    expect(song.artist).toBe('Example Singer');
    expect(song.originalKey).toBe('A');
    expect(song.playlist).toBe('ChordWiki');
    expect(song.chords).toEqual(['A-7(11)', 'D7(b9,b13)', 'G^7', 'Cm7(#13)', 'N.C.', 'F#h7', 'A-', 'G/B', 'Fadd2']);
    expect(describeChord(song.chords[0], 'A', 'A').tones.map(tone => tone.note)).toEqual(['A', 'C', 'E', 'G', 'D']);
    expect(describeChord(song.chords[1], 'A', 'A').tones.map(tone => tone.interval)).toEqual(['R', 'M3', 'P5', 'm7', 'b9', 'b13']);
    expect(describeChord(song.chords[3], 'A', 'A', true).unsupported).toBe(true);
    expect(describeChord(song.chords[0], 'A', 'C').symbol).toBe('C-7(11)');
    expect(song.metadata.score.format).toBe('chordwiki');
    expect(song.metadata.comments).toEqual(['BPM=100　4/4拍子']);
    expect(song.metadata.annotations).toEqual([{ chordIndex: 6, comments: ['Chorus'] }]);
    expect(chordWikiText(song)).toBe(chart);
    expect((await parseChordWiki(chart)).id).toBe(song.id);
  });

  it('falls back to the first chord when no key is written', async () => {
    const song = await parseChordWiki('{title:No key}\n[Bb]la [F]la');
    expect(song.originalKey).toBe('Bb');
    expect((await parseChordWiki('{title:Sharp}\n{key:D#m}\n[D#m]la')).originalKey).toBe('D#');
  });

  it('imports through the same entry point as iReal, reporting a chart without chords', async () => {
    expect((await parseChordImport(chart, 'chordwiki')).songs.map(song => song.title)).toEqual(['Evening Practice']);
    const empty = await parseChordImport('{title:Nothing}\nla la', 'chordwiki');
    expect(empty.songs).toEqual([]);
    expect(empty.errors).toEqual(['ChordWiki: No chords found']);
  });

  it('reads sections from blank lines and practises the chart in written order', async () => {
    const song = await parseChordWiki(chart);
    setImportedMetadata([song]);
    expect(practiceEntries(song.id, song.chords.length).map(entry => entry.chordIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(chordAnnotation(song.id, 2).section).toBe('1');
    expect(chordAnnotation(song.id, 7).section).toBe('2');
    expect(chordAnnotation(song.id, 6).comments).toEqual(['Chorus']);
    // The words each chord is sung on: up to the next chord, carried over a
    // line break, never past a blank line; rhythm marks in brackets are not words.
    expect(chordLyric(song.id, 0)).toBe('●●●');
    expect(chordLyric(song.id, 2)).toBe('● ●●');
    expect(chordLyric(song.id, 5)).toBe('●');
    expect(chordLyric(song.id, 8)).toBe('●');
    // A chord's context is its line and the lyric lines under it.
    expect(scoreContext(song.id, 2).length).toBe(1);
    expect(scoreContext(song.id, 2)[0].some(token => token.chordIndex === 2)).toBe(true);
  });
});
