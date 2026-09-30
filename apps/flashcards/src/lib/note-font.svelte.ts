// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export const NOTE_FONTS = [
  { id: "termes", label: "TeX Gyre Termes" },
  { id: "roboto", label: "Roboto" },
  { id: "heros", label: "TeX Gyre Heros" },
] as const;
export type NoteFont = typeof NOTE_FONTS[number]["id"];
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
