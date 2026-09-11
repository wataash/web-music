// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type IrealSong = {
  format: string; title: string; artist: string; originalKey: string;
  chords: string[]; comments: string[];
  annotations: { chordIndex: number; section?: string; comments: string[] }[];
  score: { format: string; fields: { label: string; value: string }[];
    blocks: { kind: string; raw: string; text?: string; chordIndex?: number; label?: string; name?: string; position?: number; italic?: boolean; narrow?: boolean }[][] };
  unmappedSymbols: string[];
};
export function scramble(encoded: string): string;
export function extractIreal(text: string): IrealSong;
export function extractIrealPlaylist(text: string): { name: string; songs: IrealSong[]; errors: { title: string; message: string }[] };
