// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type ChordSong = Readonly<{
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  chords: readonly string[];
}>;

// Short practice examples, independent of external song sources.
export const CHORD_SONGS: readonly ChordSong[] = [
  { id: 'example-major', title: 'Major practice', artist: 'Example', originalKey: 'C', chords: ['C', 'F', 'G7', 'C'] },
  { id: 'example-minor', title: 'Minor practice', artist: 'Example', originalKey: 'A', chords: ['Am', 'Dm', 'E7', 'Am'] },
  { id: 'example-extensions', title: 'Chord extensions', artist: 'Example', originalKey: 'C', chords: ['CM7', 'Dm9', 'G13', 'CM7'] },
];
