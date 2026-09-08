// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { chordWikiScore } from "./score.js";

export function extractChordWiki(markdown) {
  const metadata = name => new RegExp(`\\{${name}:([^}]+)\\}`, "i").exec(markdown)?.[1].trim() ?? null;
  const subtitle = metadata("subtitle");
  const chords = [];
  const comments = [];
  const annotations = [];
  const positions = [];
  for (const token of markdown.matchAll(/\{([^}:]+):([^}]*)\}|\[([^\]]+)\]/g)) {
    if (token[1]) {
      if (!/^(c|comment|ci|comment_italic)$/i.test(token[1])) continue;
      const text = token[2].trim();
      if (!text) continue;
      if (!chords.length && /^(c|comment)$/i.test(token[1])) comments.push(text);
      else annotations.push({ chordIndex: chords.length, comments: [text] });
    } else {
      const value = token[3].trim();
      if (/^(?:N\.C\.$|[A-G][#b♯♭]*(?=$|[\d(+\-^°ø/mM]|sus|add|aug|dim|omit|no|alt))/.test(value)) {
        positions.push({ start: token.index, end: token.index + token[0].length, chordIndex: chords.length });
        chords.push(value);
      }
    }
  }
  if (!chords.length) throw new Error("No chords found");
  return {
    format: "chordwiki", title: metadata("title"),
    artist: metadata("artist") ?? /歌[：:]\s*(.*?)(?=[\s　]+(?:作詞|作曲)|$)/.exec(subtitle ?? "")?.[1] ?? null,
    originalKey: metadata("key"), chords, comments, annotations, score: chordWikiScore(markdown, positions), unmappedSymbols: [],
  };
}
