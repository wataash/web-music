// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from 'vitest';
import { scramble } from '@web-music/ireal';
import { parseChordImport } from './chord-import';
import { exportIrealHtml } from './chord-export';
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
