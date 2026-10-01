// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { NOTE_FONTS, type NoteFont } from "@web-music/music-notation/note-fonts";

export { NOTE_FONTS, type NoteFont };
const STORAGE_KEY = "music-flashcards:note-font";
export function parseNoteFont(value: unknown): NoteFont {
  return NOTE_FONTS.find(font => font.id === value)?.id ?? "termes";
}
function load(): NoteFont {
  try { return parseNoteFont(localStorage.getItem(STORAGE_KEY)); }
  catch { return "termes"; }
}
export const noteFontPreference = $state({ value: load() });
export function setNoteFont(value: string): void {
  noteFontPreference.value = parseNoteFont(value);
  try { localStorage.setItem(STORAGE_KEY, noteFontPreference.value); }
  catch { /* The preference still applies for this session. */ }
}
