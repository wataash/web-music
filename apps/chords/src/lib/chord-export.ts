// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { scramble } from '@web-music/ireal';
import { irealLabel } from './ireal-labels';
import type { ImportedSong } from './chord-import';

const headers = ['Title', 'Composer / artist', 'Additional information', 'Style', 'Original key', 'Transpose setting'];
const playback = ['Accompaniment style', 'Tempo (BPM)', 'Choruses'];

function songPayload(song: ImportedSong): string {
  if (song.customText !== undefined) throw new Error('Use text export for custom charts.');
  const before: string[] = Array(6).fill('');
  const after: string[] = [];
  for (const field of song.metadata.score.fields) {
    const label = irealLabel(field.label);
    const headerIndex = headers.indexOf(label);
    const playbackIndex = playback.indexOf(label);
    const extraHeader = /^Additional information (\d+)$/.exec(label);
    const extraPlayback = /^Playback setting (\d+)$/.exec(label);
    if (headerIndex >= 0) before[headerIndex] = field.value;
    else if (playbackIndex >= 0) after[playbackIndex] = field.value;
    else if (extraHeader) before[Number(extraHeader[1]) - 1] = field.value;
    else if (extraPlayback) after[Number(extraPlayback[1]) - 1] = field.value;
    else throw new Error(`Cannot export an unknown song field: ${label}`);
  }
  // Source spelling includes compressed spacing, alternatives and annotations.
  // Never serialize the expanded practice sequence or the transposed display.
  const raw = song.metadata.score.blocks.flat().map(token => token.raw).join('');
  return [...before, '1r34LbKcu7' + scramble(raw), ...after].join('=');
}

export function exportIrealLink(songs: readonly ImportedSong[], playlist = ''): string {
  if (!songs.length) throw new Error('No imported songs to export.');
  const payload = songs.map(songPayload).join('===') + (playlist ? '===' + playlist : '');
  return 'irealb://' + encodeURIComponent(payload).replaceAll("'", '%27');
}

export function exportIrealHtml(songs: readonly ImportedSong[], playlist = ''): string {
  if (!songs.length) throw new Error('No imported songs to export.');
  const title = songs.length === 1 ? songs[0].title : playlist || 'Imported charts';
  const link = exportIrealLink(songs, playlist);
  const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  return `<!doctype html>\n<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><body><h1>${escape(title)}</h1><p><a href="${escape(link)}">Open ${songs.length} ${songs.length === 1 ? 'song' : 'songs'} in iReal Pro</a></p><ul>${songs.map(song => `<li>${escape(song.title)} — ${escape(song.artist)}</li>`).join('')}</ul></body></html>\n`;
}
