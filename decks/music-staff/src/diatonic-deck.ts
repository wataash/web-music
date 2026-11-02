// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { MAJOR_KEYS } from "@web-music/music-staff-core";
import type { WebDeckData } from "./apkg";
import { DIATONIC_ROOT, DIATONIC_VARIANTS, diatonicChord, diatonicOrigin } from "./diatonic";

const BASE = 1_800_000_000_000;
const FIELDS = ["Id", "Direction", "Key", "Degree", "Chord", "Notes", "RelativeDegree", "Contexts", "Source"];
export const DIATONIC_CSS = `
.card { margin:0; font-family:Arial,sans-serif; background:#fff; color:#172033; }
.card.nightMode, .card.night_mode { background:#111827; color:#f3f4f6; }
.diatonic-card { min-height:100vh; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:clamp(28px,8vh,64px); padding:32px 20px; text-align:center; }
.diatonic-source { font-size:.55em; margin-top:12px; opacity:.85; }
.diatonic-question { max-width:100%; font-size:calc(clamp(2rem,10vw,4rem) * 1.5 * var(--text-scale,1)); line-height:1.4; }
.diatonic-key { font-size:.65em; margin-bottom:16px; }
.diatonic-degree, .diatonic-symbol { font-weight:600; }
.diatonic-relative { display:var(--diatonic-relative-display,none); font-size:.55em; margin-top:12px; opacity:.7; }
.diatonic-answer { max-width:100%; font-size:calc(clamp(2rem,10vw,4rem) * 1.5 * var(--text-scale,1)); color:#916300; line-height:1.5; }
.nightMode .diatonic-answer, .night_mode .diatonic-answer { color:#fcd34d; }
.diatonic-card--front .diatonic-answer { visibility:hidden; }
.diatonic-notes { display:flex; justify-content:center; flex-wrap:wrap; column-gap:.45em; }
.diatonic-answer .diatonic-symbol + .diatonic-notes { margin-top:18px; }
`;
function template(back: boolean): string {
  const question = '<div class="diatonic-key">{{Key}}</div><div class="diatonic-degree">{{Degree}}</div>{{#Source}}<div class="diatonic-source">{{Source}}</div>{{/Source}}{{#RelativeDegree}}<div class="diatonic-relative">({{RelativeDegree}})</div>{{/RelativeDegree}}';
  const answer = '<div class="diatonic-symbol">{{Chord}}</div>';
  return `<main class="diatonic-card${back ? "" : " diatonic-card--front"}"><div class="diatonic-question question" data-card-part="text">${question}</div><div class="diatonic-answer answer" data-card-part="text"${back ? "" : ' aria-hidden="true"'}>${answer}</div></main>`;
}
function stableId(guid: string): number {
  return parseInt(createHash("sha256").update(guid).digest("hex").slice(0, 8), 16);
}
export function createDiatonicWebDeckData(): WebDeckData {
  const notes: WebDeckData["notes"][number][] = [];
  const cards: WebDeckData["cards"][number][] = [];
  for (const key of MAJOR_KEYS) {
    for (const variant of DIATONIC_VARIANTS) {
      const result = diatonicChord(key.fifths, variant);
      const context = { fifths: key.fifths, variant: variant.id };
      const guid = `diatonic-degree-chord-${key.fifths}-${variant.id}`;
      const id = stableId(guid);
      const nid = BASE + 100_000 + id;
      notes.push({ id: nid, guid, mid: BASE,
        fields: [String(nid), "degree-chord", `${result.tonic} ${variant.mode}`, variant.label, result.chord,
          result.notes.map(p => `<span>${p}</span>`).join(""), result.relative, JSON.stringify([context]), diatonicOrigin(variant)], tags: "diatonic-chords" });
      cards.push({ id: BASE + 10_000_000_000 + id, nid, did: BASE + 101, ord: 0, newOrder: cards.length + 1 });
    }
  }
  return {
    models: [{ mid: BASE, name: "Diatonic degree-chord", css: DIATONIC_CSS, fieldNames: FIELDS,
      templates: [{ name: "Card 1", ord: 0, qfmt: template(false), afmt: template(true) }] }],
    decks: [{ did: BASE + 101, name: DIATONIC_ROOT }],
    notes, cards, media: [], rootDeckNames: [DIATONIC_ROOT],
  };
}
