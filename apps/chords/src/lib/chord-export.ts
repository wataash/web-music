// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { extractIrealPlaylist, IREAL_HEADER_LABELS as headers, IREAL_MUSIC_PREFIX, IREAL_PLAYBACK_LABELS as playback, scramble } from '@web-music/ireal';
import { irealLabel } from './ireal-labels';
import type { ImportedSong } from './chord-import';

function validateIrealField(value: string, label: string): void {
  if (value.includes('=')) throw new Error(
    'Cannot export to iReal Pro: ' + label + ' contains "=". Remove it or use text export to preserve the original chart.',
  );
}

function songPayload(score: ImportedSong['metadata']['score']): string {
  if (score.format === 'chordwiki') throw new Error('Use text export for ChordWiki charts.');
  const before: string[] = Array(headers.length).fill('');
  const after: string[] = [];
  for (const field of score.fields) {
    const label = irealLabel(field.label);
    validateIrealField(field.value, label);
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
  const tokens = score.blocks.flat();
  const unsupportedMeter = tokens.find(token => token.name === 'custom-meter');
  if (unsupportedMeter) throw new Error(`iReal Pro does not support ${unsupportedMeter.text} time. Use text export to keep this meter.`);
  const raw = tokens.map(token => token.raw).join('');
  validateIrealField(raw, 'Chart notation');
  return [...before, IREAL_MUSIC_PREFIX + scramble(raw), ...after].join('=');
}

export function exportIrealLink(songs: readonly ImportedSong[], playlist = ''): string {
  if (!songs.length) throw new Error('No imported songs to export.');
  const entries = songs.map(song => songPayload(song.metadata.score));
  // Empty playback fields can look like a playlist delimiter. Terminate them explicitly.
  const last = entries.at(-1)!;
  if (playlist || last.includes('===', last.indexOf(IREAL_MUSIC_PREFIX))) entries.push(playlist);
  const payload = entries.join('===');
  const link = 'irealb://' + encodeURIComponent(payload).replaceAll("'", '%27');
  const decoded = extractIrealPlaylist(link);
  if (decoded.name !== playlist) {
    throw new Error('Cannot export this playlist name unambiguously. Rename the playlist to remove "===".');
  }
  if (decoded.errors.length || decoded.songs.length !== songs.length ||
      decoded.songs.some((song, index) => songPayload(song.score) !== entries[index])) {
    throw new Error('Cannot export this chart without changing its notation or metadata.');
  }
  return link;
}

export function exportIrealHtml(songs: readonly ImportedSong[], playlist = ''): string {
  if (!songs.length) throw new Error('No imported songs to export.');
  const title = songs.length === 1 ? songs[0].title : playlist || 'Imported charts';
  const link = exportIrealLink(songs, playlist);
  const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  return `<!doctype html>\n<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><body><h1>${escape(title)}</h1><p><a href="${escape(link)}">Open ${songs.length} ${songs.length === 1 ? 'song' : 'songs'} in iReal Pro</a></p><ul>${songs.map(song => `<li>${escape(song.title)} — ${escape(song.artist)}</li>`).join('')}</ul></body></html>\n`;
}
