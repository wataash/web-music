// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  CARD_STAFF_GEOMETRY,
  CLEFS,
  CLEF_LABELS,
  formatPitch,
  keySignatureAccidentalForNote,
  keySignatureAccidentals,
  keySignatureGlyphCss,
  MAJOR_KEYS,
  naturalPitchesInRange,
  NOTE_LETTERS,
} from "@web-music/music-staff-core";
import type { WebDeckData } from "./apkg";
import { CARD_CSS, WEB_DIAGRAM_SCRIPT } from "./template";

export const MOVABLE_DO_ROOT = "Music Staff (Movable Do)";
const MODEL_ID = 1_787_951_000_000;
const ROOT_ID = MODEL_ID + 1;
const DIRECTION_ID = MODEL_ID + 2;
const NOTE_ID_BASE = 1_787_951_100_000;
const CARD_ID_BASE = 1_787_951_200_000;
const ORIGINAL_KEY_COUNT = 12;
const ORIGINAL_CARD_COUNT = CLEFS.length * ORIGINAL_KEY_COUNT * 33;
const ADDED_KEY_COUNT = MAJOR_KEYS.length - ORIGINAL_KEY_COUNT;
const ADDED_CARD_COUNT = CLEFS.length * ADDED_KEY_COUNT * 33;
const READING_STAFF_WIDTH = 320;
const NOTE_SHIFT = 110;

export { MAJOR_KEYS } from "@web-music/music-staff-core";

const SOLFEGE = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"] as const;
const JAPANESE_SOLFEGE: Readonly<Record<(typeof SOLFEGE)[number], string>> = {
  Do: "ド",
  Re: "レ",
  Mi: "ミ",
  Fa: "ファ",
  Sol: "ソ",
  La: "ラ",
  Ti: "シ",
};

export function movableDoAnswer(note: string, tonic: string, fifths: number): Readonly<{ solfege: string; soundingPitch: string }> {
  const degree = (NOTE_LETTERS.indexOf(note[0] as typeof NOTE_LETTERS[number]) - NOTE_LETTERS.indexOf(tonic[0] as typeof NOTE_LETTERS[number]) + 7) % 7;
  const accidental = keySignatureAccidentalForNote(note[0] as typeof NOTE_LETTERS[number], fifths);
  return {
    solfege: SOLFEGE[degree],
    soundingPitch: `${note[0]}${accidental}${note.slice(1)}`,
  };
}

// The existing staff script renders the clef, note and ledger lines. This
// script adds the signature and moves the note right to leave it room.
const SIGNATURE_LAYOUTS = Object.fromEntries(
  CLEFS.map((clef) => [
    clef,
    {
      sharp: keySignatureAccidentals(
        clef, 7, 84,
        CARD_STAFF_GEOMETRY.topLineY,
        CARD_STAFF_GEOMETRY.lineGap,
        "reading",
      ),
      flat: keySignatureAccidentals(
        clef, -7, 84,
        CARD_STAFF_GEOMETRY.topLineY,
        CARD_STAFF_GEOMETRY.lineGap,
        "reading",
      ),
    },
  ]),
);

const SIGNATURE_SCRIPT = `
<script>
(() => {
  const layouts = ${JSON.stringify(SIGNATURE_LAYOUTS)};
  for (const host of document.querySelectorAll('[data-major-fifths]')) {
    const svg = host.querySelector('svg');
    if (!(svg instanceof SVGElement)) continue;
    const clef = (host.getAttribute('data-staff') || '').split('|')[0];
    const fifths = Number(host.getAttribute('data-major-fifths'));
    if (!Number.isInteger(fifths) || Math.abs(fifths) > 7) continue;
    const viewBox = (svg.getAttribute('viewBox') || '').split(' ');
    if (viewBox.length !== 4) continue;
    viewBox[2] = '${READING_STAFF_WIDTH}';
    svg.setAttribute('viewBox', viewBox.join(' '));
    svg.setAttribute('width', '${READING_STAFF_WIDTH}');
    svg.querySelector('rect')?.setAttribute('width', '${READING_STAFF_WIDTH}');
    for (const line of svg.querySelectorAll('.staff__line')) {
      line.setAttribute('x2', '${CARD_STAFF_GEOMETRY.endX + READING_STAFF_WIDTH - CARD_STAFF_GEOMETRY.width}');
    }
    for (const element of svg.querySelectorAll('.staff__note, .staff__ledger-line')) {
      element.setAttribute('transform', 'translate(${NOTE_SHIFT} 0)');
      if (element.classList.contains('staff__note')) {
        element.setAttribute('data-x', '${CARD_STAFF_GEOMETRY.noteCenterX + NOTE_SHIFT}');
      }
    }
    const layout = layouts[clef]?.[fifths >= 0 ? 'sharp' : 'flat'];
    if (!layout) continue;
    for (const { x, y } of layout.accidentals.slice(0, Math.abs(fifths))) {
      const sign = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sign.setAttribute('class', 'movable-do__accidental movable-do__accidental--' + (fifths >= 0 ? 'sharp' : 'flat'));
      sign.setAttribute('x', String(x));
      sign.setAttribute('y', String(y));
      sign.textContent = layout.symbol;
      svg.append(sign);
    }
  }
})();
</script>`;

// The deck stores English solfege. The card translates it only for Japanese
// browsers; English is the fallback when the browser has no language or uses
// another language.
const ANSWER_SCRIPT = `
<script>
(() => {
  const japaneseNames = ${JSON.stringify(JAPANESE_SOLFEGE)};
  const japanese = typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('ja');
  for (const answer of document.querySelectorAll('[data-movable-do-answer]')) {
    const pitch = (answer.getAttribute('data-sounding-pitch') || '').replaceAll('♭', 'b').replaceAll('♯', '#').replace(/[0-9]/g, '');
    const solfege = answer.getAttribute('data-solfege') || '';
    answer.textContent = pitch + ' ' + (japanese ? (japaneseNames[solfege] || solfege) : solfege);
  }
})();
</script>`;

const FRONT = `<main class="staff-card movable-do-card"><div class="diagram" data-card-part="staff" data-staff="{{Staff}}" data-major-fifths="{{Fifths}}"></div></main>\n${WEB_DIAGRAM_SCRIPT}\n${SIGNATURE_SCRIPT}`;
const BACK = `<main class="staff-card movable-do-card"><div class="diagram" data-card-part="staff" data-staff="{{Staff}}" data-major-fifths="{{Fifths}}"></div><div class="movable-do__answer" data-card-part="text" data-movable-do-answer data-sounding-pitch="{{SoundingPitch}}" data-solfege="{{Solfege}}"></div><div class="movable-do__pitch">{{SoundingPitch}} · {{Key}} major</div></main>\n${WEB_DIAGRAM_SCRIPT}\n${SIGNATURE_SCRIPT}\n${ANSWER_SCRIPT}`;
const CROP_WIDTH_RATIO = CARD_STAFF_GEOMETRY.width / READING_STAFF_WIDTH;
const CSS = `@font-face{font-family:"Noto Music";src:url("/fonts/NotoMusic-Regular.ttf") format("truetype");font-weight:400;font-style:normal;font-display:block}\n${CARD_CSS}\n.movable-do__answer{font-size:calc(clamp(2.5rem,11vw,5rem) * var(--text-scale,1));font-weight:700;color:#fcd34d}\n.movable-do__pitch{font-size:1rem;color:#d1d5db}\n.movable-do__accidental{fill:#f9fafb}\n.movable-do__accidental--sharp{${keySignatureGlyphCss(CARD_STAFF_GEOMETRY.lineGap, "reading", "sharp")}}\n.movable-do__accidental--flat{${keySignatureGlyphCss(CARD_STAFF_GEOMETRY.lineGap, "reading", "flat")}}\n.movable-do-card .diagram > svg.staff{--staff-clip-top-length:calc(var(--staff-width) * var(--staff-clip-top,0) * ${CROP_WIDTH_RATIO});--staff-clip-bottom-length:calc(var(--staff-width) * var(--staff-clip-bottom,0) * ${CROP_WIDTH_RATIO})}`;

export function createMovableDoWebDeckData(): WebDeckData {
  const decks = [
    { did: ROOT_ID, name: MOVABLE_DO_ROOT },
    { did: DIRECTION_ID, name: `${MOVABLE_DO_ROOT}::Staff → Solfege` },
    ...CLEFS.map((clef, index) => ({
      did: DIRECTION_ID + 1 + index,
      name: `${MOVABLE_DO_ROOT}::Staff → Solfege::${CLEF_LABELS[clef]} Clef`,
      ...(clef === "alto" || clef === "tenor" ? { hiddenByDefault: true } : {}),
    })),
  ];
  const notes: WebDeckData["notes"][number][] = [];
  const cards: WebDeckData["cards"][number][] = [];
  for (const [clefIndex, clef] of CLEFS.entries()) {
    for (const [keyIndex, key] of MAJOR_KEYS.entries()) {
      for (const [pitchIndex, pitch] of naturalPitchesInRange(clef).entries()) {
        const writtenPitch = formatPitch(pitch);
        const answer = movableDoAnswer(writtenPitch, key.tonic, key.fifths);
        const index = keyIndex < ORIGINAL_KEY_COUNT
          ? clefIndex * ORIGINAL_KEY_COUNT * 33 + keyIndex * 33 + pitchIndex
          : ORIGINAL_CARD_COUNT + clefIndex * ADDED_KEY_COUNT * 33 + (keyIndex - ORIGINAL_KEY_COUNT) * 33 + pitchIndex;
        const id = NOTE_ID_BASE + index;
        notes.push({
          id,
          guid: `movable-do-major-${clef}-${key.fifths}-${writtenPitch.toLowerCase()}`,
          mid: MODEL_ID,
          fields: [String(id), clef, writtenPitch, String(key.fifths), key.tonic, answer.solfege, answer.soundingPitch, `${clef}|${writtenPitch}`],
          tags: `clef::${clef} mode::major key-fifths::${key.fifths}`,
        });
        // Preserve both IDs and new order for the original 1,584 cards.
        const newOrder = index < ORIGINAL_CARD_COUNT
          ? (index * 601) % ORIGINAL_CARD_COUNT + 1
          : ORIGINAL_CARD_COUNT + ((index - ORIGINAL_CARD_COUNT) * 5) % ADDED_CARD_COUNT + 1;
        cards.push({ id: CARD_ID_BASE + index, nid: id, did: DIRECTION_ID + 1 + clefIndex, ord: 0, newOrder });
      }
    }
  }
  return {
    models: [{ mid: MODEL_ID, name: "Music Staff Movable Do", css: CSS, fieldNames: ["Id", "Clef", "Pitch", "Fifths", "Key", "Solfege", "SoundingPitch", "Staff"], templates: [{ name: "Card 1", ord: 0, qfmt: FRONT, afmt: BACK }] }],
    decks,
    notes,
    cards,
    media: [],
    rootDeckNames: [MOVABLE_DO_ROOT],
  };
}
