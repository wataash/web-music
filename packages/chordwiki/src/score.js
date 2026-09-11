// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Every token keeps its source spelling, including whitespace. Chord locations
// come from the progression extractor so the score and practice cannot drift.
function tokenize(raw, positions, pattern, describe) {
  const chords = new Map(positions.map(position => [position.start, position]));
  const tokens = [];
  for (let offset = 0; offset < raw.length;) {
    const chord = chords.get(offset);
    if (chord) {
      tokens.push({ kind: "chord", raw: raw.slice(offset, chord.end), chordIndex: chord.chordIndex });
      offset = chord.end;
    } else {
      const match = pattern.exec(raw.slice(offset));
      if (!match) throw new Error(`Cannot preserve score at ${offset}`);
      tokens.push({ raw: match[0], ...describe(match[0]) });
      offset += match[0].length;
    }
  }
  return tokens;
}

export function chordWikiScore(raw, positions) {
  const fields = [];
  const labels = { title: "Title", subtitle: "Vocals / lyrics / music", artist: "Artist", key: "Original key" };
  const tokens = tokenize(raw, positions, /^(?:\{[^}]*\}|\[[^\]]*\]|\r?\n|[^\[{\r\n]+|[\s\S])/, text => {
    const directive = /^\{([^:}]+):([\s\S]*)\}$/.exec(text);
    if (directive) {
      const name = directive[1].toLowerCase();
      if (/^(c|comment|ci|comment_italic)$/.test(name)) return { kind: "comment", text: directive[2], italic: /^(ci|comment_italic)$/.test(name) };
      const field = { label: labels[name] ?? directive[1], value: directive[2] };
      fields.push(field);
      return { kind: "field", name, text: field.value, label: field.label };
    }
    // Brackets that are not chords hold bar lines, rhythm and accents; ChordWiki
    // prints them on the chord row too.
    if (text.startsWith("[") && text.endsWith("]")) return { kind: "marker", text: text.slice(1, -1), label: "Source symbol" };
    return { kind: text.includes("\n") ? "break" : "text", text };
  });
  const blocks = [[]];
  for (const token of tokens) {
    blocks.at(-1).push(token);
    if (token.kind === "break") blocks.push([]);
  }
  return { format: "chordwiki", fields, blocks: blocks.filter(block => block.length) };
}
