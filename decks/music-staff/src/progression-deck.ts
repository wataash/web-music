// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { MAJOR_KEYS } from "@web-music/music-staff-core";
import type { WebDeckData } from "./apkg";
import { DIATONIC_CSS } from "./diatonic-deck";
import { iiVIProgression, progressionLine, PROGRESSION_ROOT } from "./progression";
const BASE = 1_900_000_000_000;
const FRONT = '<main class="diatonic-card progression-card diatonic-card--front"><div class="diatonic-question question" data-card-part="text"><div class="diatonic-key">{{Key}}</div><div class="diatonic-degree progression-line">{{Degree}}</div>{{#RelativeDegree}}<div class="progression-relative">{{RelativeDegree}}</div>{{/RelativeDegree}}</div><div class="diatonic-answer answer progression-line" data-card-part="text" aria-hidden="true">{{Chords}}</div></main>';
const BACK = FRONT.replace(' diatonic-card--front', '').replace(' aria-hidden="true"', '');
export function createProgressionWebDeckData(): WebDeckData {
  const notes: WebDeckData["notes"][number][] = [];
  const cards: WebDeckData["cards"][number][] = [];
  for (const mode of ["major", "minor"] as const) for (const key of MAJOR_KEYS) {
    const index = notes.length;
    const result = iiVIProgression(key.fifths, mode);
    const nid = BASE + 100 + index;
    notes.push({ id: nid, guid: `ii-v-i-${mode}-${key.fifths}`, mid: BASE + 2,
      fields: [String(nid), mode, String(key.fifths), result.key, progressionLine(result.degrees), progressionLine(result.chords), result.relative], tags: "ii-v-i" });
    cards.push({ id: BASE + 1000 + index, nid, did: BASE + 1, ord: 0, newOrder: index + 1 });
  }
  return { models: [{ mid: BASE + 2, name: "II–V–I Progressions", css: DIATONIC_CSS + `
.progression-card .diatonic-question, .progression-card .diatonic-answer { font-size:calc(clamp(1.4rem,6vw,3rem) * 1.5 * var(--text-scale,1)); }
.progression-card .diatonic-key { font-size:.8em; }
.progression-relative { white-space:pre-line; text-wrap:balance; display:var(--progression-relative-display,block); margin-top:12px; font-size:.75em; opacity:.7; }
.progression-line { display:flex; align-items:baseline; justify-content:center; gap:.3em; flex-wrap:wrap; }
.progression-arrow { font-size:.65em; font-weight:400; opacity:.65; }
`, fieldNames: ["Id", "Mode", "Fifths", "Key", "Degree", "Chords", "RelativeDegree"], templates: [{ name: "Card 1", ord: 0, qfmt: FRONT, afmt: BACK }] }],
    decks: [{ did: BASE + 1, name: PROGRESSION_ROOT }], notes, cards, media: [], rootDeckNames: [PROGRESSION_ROOT] };
}
