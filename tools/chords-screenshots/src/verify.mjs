// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The two sides must differ in how the chart is drawn and in nothing else. A
// different song, a different number of rows, a different window or a chord
// that now says something else means the pictures are not comparable.
export function verifyCaptures(before, after) {
  const problems = [];
  const viewport = value => `${value.width}x${value.height}@${value.deviceScaleFactor}`;
  if (viewport(before.viewport) !== viewport(after.viewport)) {
    problems.push(`viewport: ${viewport(before.viewport)} before, ${viewport(after.viewport)} after`);
  }
  if (before.songs.length !== after.songs.length) {
    problems.push(`songs: ${before.songs.length} before, ${after.songs.length} after`);
    return problems;
  }
  for (const [index, song] of before.songs.entries()) {
    const other = after.songs[index];
    const where = `song ${index + 1}`;
    if (song.composer !== other.composer) problems.push(`${where}: composer differs`);
    if (song.key !== other.key) problems.push(`${where}: key differs`);
    if (song.viewport && other.viewport && viewport(song.viewport) !== viewport(other.viewport)) problems.push(`${where}: viewport differs`);
    if (song.title !== other.title) {
      problems.push(`${where}: "${song.title}" before, "${other.title}" after`);
      continue;
    }
    if (song.rows !== other.rows) problems.push(`${where} "${song.title}": ${song.rows} rows before, ${other.rows} after`);
    if (song.chords.length !== other.chords.length) {
      problems.push(`${where} "${song.title}": ${song.chords.length} chords before, ${other.chords.length} after`);
      continue;
    }
    const changed = song.chords.findIndex((chord, at) => chord !== other.chords[at]);
    if (changed >= 0) {
      problems.push(`${where} "${song.title}": chord ${changed + 1} reads "${song.chords[changed]}" before, "${other.chords[changed]}" after`);
    }
  }
  return problems;
}
