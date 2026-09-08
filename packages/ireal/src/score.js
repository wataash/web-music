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
  "|": ["bar", "│", "小節線"],
  "[": ["bar", "║", "開始二重線"], "]": ["bar", "║", "終了二重線"],
  "{": ["bar", "𝄆", "反復開始"], "}": ["bar", "𝄇", "反復終了"], Z: ["bar", "▕", "終止線"],
  x: ["symbol", "％", "前の1小節を反復"],
  r: ["symbol", "𝄎", "前の2小節を反復"], p: ["symbol", "/", "直前のコードを反復"],
  S: ["symbol", "𝄋", "セーニョ"], Q: ["symbol", "𝄌", "コーダ"], f: ["symbol", "𝄐", "フェルマータ"],
  U: ["symbol", "END", "再生終了小節"],
  s: ["size", "狭", "以降のコードを狭く表示"], l: ["size", "標準", "以降のコードを標準幅で表示"],
  ",": ["divider", "", "空きセルなしで次のコードへ"],
  " ": ["space", "   ", "空きセル"],
};

export function irealScore(raw, positions, fields, musicIndex) {
  const labels = ["曲名", "作曲者・アーティスト", "追加情報", "スタイル", "原調", "移調設定"];
  const settings = fields.slice(0, musicIndex).map((value, index) => ({ label: labels[index] ?? `追加情報 ${index + 1}`, value }));
  const playbackLabels = ["伴奏スタイル", "テンポ (BPM)", "コーラス数"];
  settings.push(...fields.slice(musicIndex + 1).map((value, index) => ({ label: playbackLabels[index] ?? `再生設定 ${index + 1}`, value })));
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
      return { kind: "comment", text: text.slice(1, -1).replace(/^\*\d+/, ""), ...(position ? { position: Number(position[1]), label: `注記の高さ ${position[1]}` } : {}) };
    }
    if (text.startsWith("*")) return { kind: "section", text: text.slice(1), label: "セクション" };
    if (text.startsWith("T")) {
      const value = text.slice(1);
      return { kind: "symbol", text: value === "12" ? "12/8" : `${value.slice(0, -1)}/${value.slice(-1)}`, label: "拍子" };
    }
    if (text.startsWith("N")) return { kind: "symbol", text: text === "N0" ? "⌜" : `⌜${text.slice(1)}.`, label: text === "N0" ? "番号なし括弧" : `${text.slice(1)}番括弧` };
    if (/^Y+$/.test(text)) return { kind: "break", text: "\n".repeat(text.length), label: `段間 ${text.length}` };
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
