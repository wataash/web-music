// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from 'vitest';
import { scramble } from '@web-music/ireal';
import { parseChordImport } from './chord-import';
import { exportIrealLink, exportIrealHtml } from './chord-export';
import { legacyIrealLabel } from './ireal-labels';

const chart = (name: string, music: string) => `${name}=Writer=Note=Swing=C-=-2=1r34LbKcu7${scramble(music)}=Jazz=123=2`;
it('round-trips raw notation, settings, IDs and playlist names, including legacy labels', async () => {
  const input = 'irealb://' + encodeURIComponent(chart("A & B's <chart>", '*A[T34C-7(G7)XyQ|W/E<*32XyQFine>XyQ|xXyQZ') + '===' + chart('Second', '{C7XyQ|N1G7XyQ}N2C7XyQZ') + '===Practice & Friends').replaceAll("'", '%27');
  const first = await parseChordImport(input);
  expect(first.errors).toEqual([]);
  const restored = await parseChordImport(exportIrealHtml(first.songs, 'Practice & Friends'));
  expect(restored).toEqual(first);
  const legacy = structuredClone(first.songs);
  for (const song of legacy) for (const field of song.metadata.score.fields) field.label = legacyIrealLabel(field.label);
  expect(await parseChordImport(exportIrealHtml(legacy, 'Practice & Friends'))).toEqual(first);
  const html = exportIrealHtml(first.songs);
  expect(html).not.toContain('<chart>');
  expect(html).toContain('&lt;chart&gt;');
});
it('round-trips old uncompressed links and songs without playback settings', async () => {
  const first = await parseChordImport('irealbook://' + encodeURIComponent('Old=Artist=Swing=C==C7   |G7   Z=Collection'));
  expect(first.errors).toEqual([]);
  expect(await parseChordImport(exportIrealHtml(first.songs, 'Collection'))).toEqual(first);
});
it.skipIf(!process.env.IREAL_PLAYLIST_PATH)('round-trips every chart in the local playlist', async () => {
  const { readFileSync } = await import('node:fs');
  const first = await parseChordImport(readFileSync(process.env.IREAL_PLAYLIST_PATH!, 'utf8'));
  expect(first.songs).toHaveLength(1460);
  expect(await parseChordImport(exportIrealHtml(first.songs, first.songs[0].playlist))).toEqual(first);
}, 30000);

it('round-trips equals signs in playlist names through song links and playlist HTML', async () => {
  const input = [chart('Study', 'C7Z'), chart('Encore', 'F7Z'), 'Set A=B'].join('===');
  const imported = await parseChordImport('irealb://' + encodeURIComponent(input));
  expect(imported.errors).toEqual([]);
  expect(imported.songs).toHaveLength(2);
  const [song] = imported.songs;
  expect(song.playlist).toBe('Set A=B');
  expect(await parseChordImport(exportIrealLink([song], song.playlist))).toEqual({ songs: [song], errors: [] });
  expect(await parseChordImport(exportIrealHtml(imported.songs, song.playlist))).toEqual(imported);
});

it('preserves a chorus count without style or tempo when exporting one song', async () => {
  const input = ['Study=Writer==Swing=C==1r34LbKcu7C7Z===3', chart('Encore', 'F7Z'), 'Set A=B'].join('===');
  const { songs: [song] } = await parseChordImport('irealb://' + encodeURIComponent(input));
  expect(song.metadata.score.fields).toContainEqual({ label: 'Choruses', value: '3' });
  for (const playlist of [song.playlist, '']) {
    expect(await parseChordImport(exportIrealLink([song], playlist))).toEqual({ songs: [{ ...song, playlist }], errors: [] });
  }
  const numeric = await parseChordImport('irealb://' + encodeURIComponent('Study=Writer==Swing=C==1r34LbKcu7C7Z===3'));
  expect(numeric.songs[0].playlist).toBe('3');
});

it('rejects a playlist name that would be read as a chorus count', async () => {
  const { songs } = await parseChordImport('irealb://Study=Writer==Swing=C==1r34LbKcu7C7Z');
  expect(() => exportIrealLink(songs, '3===Set')).toThrow('Rename the playlist');
  const valid = await parseChordImport(exportIrealHtml(songs, 'Set===Three'));
  expect(valid.songs[0].playlist).toBe('Set===Three');
});

it.each([['===3=Extra', 'Choruses', '3'], ['=Jazz===Extra', 'Accompaniment style', 'Jazz'], ['=Jazz=120===Extra', 'Tempo (BPM)', '120']])('preserves extended fields in every song position with %s', async (settings, label, value) => {
  const extended = 'Study===Swing=C==Info=G=Three=1r34LbKcu7C7Z' + settings;
  const other = chart('Encore', 'F7Z');
  for (const entries of [[extended], [extended, other], [other, extended]]) {
    const source = 'irealb://' + encodeURIComponent([...entries, 'Set'].join('==='));
    const imported = await parseChordImport(source);
    expect(imported.errors).toEqual([]);
    expect(imported.songs.map(song => song.title)).toEqual(entries.map(entry => entry.split('=')[0]));
    const study = imported.songs.find(song => song.title === 'Study')!;
    expect(study.metadata.score.fields).toEqual(expect.arrayContaining([
      { label: 'Additional information 7', value: 'Info' },
      { label: 'Additional information 9', value: 'Three' },
      { label, value },
      { label: settings.includes('120') ? 'Playback setting 5' : 'Playback setting 4', value: 'Extra' },
    ]));
    expect(await parseChordImport(exportIrealHtml(imported.songs, 'Set'))).toEqual(imported);
    for (const playlist of ['', 'Set']) {
      expect(await parseChordImport(exportIrealLink([study], playlist))).toEqual({ songs: [{ ...study, playlist }], errors: [] });
    }
  }
});

it('rejects a playlist that would silently shift metadata between songs', async () => {
  const parseSong = async (entry: string) => (await parseChordImport('irealb://' + encodeURIComponent(entry))).songs[0];
  const first = await parseSong(chart('First', 'C7Z'));
  const second = await parseSong('Study===Swing=C==Info=G=0=1r34LbKcu7F7Z');
  expect(() => exportIrealLink([first, second], 'Set')).toThrow('metadata');
});

it('keeps encoding-marker text in titles and composers when round-tripping a playlist', async () => {
  const marker = '1r34LbKcu7';
  const entries = [
    `Study===Swing=C==${marker}C7Z==120=2`,
    `${marker}G7Z=${marker}Writer==Swing=C==${marker}G7Z==140=3`,
  ];
  for (const order of [entries, [...entries].reverse()]) {
    const input = 'irealb://' + encodeURIComponent([...order, 'Practice'].join('==='));
    const imported = await parseChordImport(input);
    expect(imported.errors).toEqual([]);
    expect(imported.songs.map(song => song.title)).toEqual(order.map(entry => entry.split('=')[0]));
    const marked = imported.songs.find(song => song.title.startsWith(marker))!;
    expect(marked.artist).toBe(marker + 'Writer');
    expect(marked.chords).toEqual(['G7']);
    expect(marked.metadata.score.fields).toContainEqual({ label: 'Choruses', value: '3' });
    expect(marked.playlist).toBe('Practice');
    expect(await parseChordImport(exportIrealHtml(imported.songs, 'Practice'))).toEqual(imported);
  }
});

it('restores written keys with musical accidentals and positioned modulation marks', async () => {
  const raw = 'Bb7|<*32Key: F♯m>F#-7|<Key: E♭>Eb7Z';
  const link = 'irealb://' + encodeURIComponent(chart('Intro', 'C7') + '===Modulations=Writer==Swing=B♭==Extra=1r34LbKcu7' + scramble(raw));
  const imported = await parseChordImport(link);
  expect(imported.errors).toEqual([]);
  expect(imported.songs.map(song => song.title)).toEqual(['Intro', 'Modulations']);
  const song = imported.songs[1];
  expect(song.originalKey).toBe('Bb');
  expect(song.chordKeys).toEqual(['Bb', 'F#', 'Eb']);
  expect(song.metadata.score.blocks.flat().filter(t => t.name === 'key-change')).toMatchObject([
    { raw: '<*32Key: F♯m>', text: 'F#m', position: 32 }, { raw: '<Key: E♭>', text: 'Eb' },
  ]);
  expect(await parseChordImport(exportIrealHtml(imported.songs))).toEqual(imported);
});
