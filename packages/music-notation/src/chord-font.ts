// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import edwinRoman from './fonts/edwin-roman.otf?url&inline';
import lelandText from './fonts/leland-text.otf?url&inline';

// Keep chord typography independent of the note-name font preference.
export const CHORD_FONT_CSS = `
@font-face { font-family:"Flashcard Chords"; font-style:normal; font-weight:400; src:url("${edwinRoman}") format("opentype"); }
@font-face { font-family:"Flashcard Chord Symbols"; font-style:normal; font-weight:400; src:url("${lelandText}") format("opentype"); }
.diatonic-symbol, .diatonic-degree, .diatonic-relative,
.progression-relative, .progression-line {
  font-family:"Flashcard Chords",serif !important;
  font-weight:400;
  font-synthesis:none;
}
`;
