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
      const described = describe(match[0]);
      tokens.push(...[described].flat().map((token, index) => ({ raw: index === 0 ? match[0] : "", ...token })));
      offset += match[0].length;
    }
  }
  return tokens;
}

// Symbol meanings and cell spacing:
// https://www.irealpro.com/ireal-pro-custom-chord-chart-protocol/
// Compressed bar/space tokens: https://garten.salat.dev/041-scraping-chords/
const symbols = {
  "|": ["bar", "│", "Barline"],
  "[": ["bar", "║", "Opening double barline"], "]": ["bar", "║", "Closing double barline"],
  "{": ["bar", "𝄆", "Start repeat"], "}": ["bar", "𝄇", "End repeat"], Z: ["bar", "▕", "Final barline"],
  x: ["symbol", "％", "Repeat previous bar"],
  r: ["symbol", "𝄎", "Repeat previous two bars"], p: ["symbol", "/", "Repeat previous chord"],
  S: ["symbol", "𝄋", "Segno"], Q: ["symbol", "𝄌", "Coda"], f: ["symbol", "𝄐", "Fermata"],
  U: ["symbol", "END", "Playback end"],
  s: ["size", "Narrow", "Narrow chord spacing"], l: ["size", "Standard", "Standard chord spacing"],
  ",": ["divider", "", "Next chord without an empty cell"],
  " ": ["space", "   ", "Empty cell"],
};

export function irealScore(raw, positions, fields, musicIndex) {
  const labels = ["Title", "Composer / artist", "Additional information", "Style", "Original key", "Transpose setting"];
  const settings = fields.slice(0, musicIndex).map((value, index) => ({ label: labels[index] ?? `Additional information ${index + 1}`, value }));
  const playbackLabels = ["Accompaniment style", "Tempo (BPM)", "Choruses"];
  settings.push(...fields.slice(musicIndex + 1).map((value, index) => ({ label: playbackLabels[index] ?? `Playback setting ${index + 1}`, value })));
  function describe(text) {
    // These abbreviations occupy the same cells as their expanded spellings.
    const compressed = { XyQ: [" ", " ", " "], LZ: [" ", "|"], Kcl: ["|", "x", " "] };
    if (compressed[text]) return compressed[text].map(describe);
    if (symbols[text]) {
      const [kind, display, label] = symbols[text];
      return { kind, text: display, label, ...(kind === "bar" ? { opening: ["[", "{"].includes(text) } : {}) };
    }
    if (text.startsWith("<")) {
      const position = /^<\*(\d+)/.exec(text);
      return { kind: "comment", text: text.slice(1, -1).replace(/^\*\d+/, ""), ...(position ? { position: Number(position[1]), label: `Note height ${position[1]}` } : {}) };
    }
    if (text.startsWith("*")) return { kind: "section", text: text.slice(1), label: "Section" };
    if (text.startsWith("T")) {
      const value = text.slice(1);
      return { kind: "symbol", text: value === "12" ? "12/8" : `${value.slice(0, -1)}/${value.slice(-1)}`, label: "Time signature" };
    }
    if (text.startsWith("N")) return { kind: "symbol", text: text === "N0" ? "⌜" : `⌜${text.slice(1)}.`, label: text === "N0" ? "Ending bracket" : `Ending ${text.slice(1)}` };
    if (/^Y+$/.test(text)) return { kind: "break", text: "\n".repeat(text.length), label: `Row spacing ${text.length}` };
    return { kind: "text", text };
  }
  const tokens = tokenize(raw, positions, /^(?:<[^>]*>|\*\w|T\d+|N\d|XyQ|Kcl|LZ|Y+|[\s\S])/, describe);
  const blocks = [[]];
  let narrow = false;
  for (const token of tokens) {
    if (token.kind === "size") narrow = token.raw === "s";
    if (token.kind === "chord" && narrow) token.narrow = true;
    if (token.opening && blocks.at(-1).some(t => ["chord", "space", "symbol"].includes(t.kind))) blocks.push([]);
    blocks.at(-1).push(token);
    if ((token.kind === "bar" && !token.opening) || token.kind === "break") blocks.push([]);
  }
  return { format: "ireal", fields: settings.filter(field => field.value !== ""), blocks: blocks.filter(block => block.length) };
}
