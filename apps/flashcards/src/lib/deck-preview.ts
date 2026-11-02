// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_CARD_SCALES, DEFAULT_DECK_CARD_SETTINGS, defaultDeckCardSettings } from "@web-music/practice-ui/card-scale";
import type { DeckCard, DeckData, DeckMediaFile, DeckModel, DeckNote, DeckTemplate } from "./deck-data";
import { compareDeckNames } from "./deck-visibility";
import { DEFAULT_FRET_WINDOW, fretWindowVariables } from "./guitar-interval-selection";
import { DEFAULT_FRETBOARD_FRET_COUNT, includesFretboardFretCard } from "./fretboard-card";
import { DEFAULT_STAFF_NOTE_SELECTION, staffCardVariables } from "./staff-note-selection";
import { buildCardDocument, renderTemplate, resolveMediaReferences } from "./template";
import type { NoteFont } from "./note-font.svelte";
import { noteFontCss } from "./note-font-css";
import { isChordToneCard, chordToneDisplayFields } from "./chord-tone-selection";
import { isProgressionCard, progressionDisplayFields } from "./progression-selection";
import { diatonicDirection, diatonicDisplayFields, DEFAULT_CHORD_NOTATION, type ChordNotation, type MinorDegreeNotation } from "./diatonic-selection";

export type DeckPreviewRow = Readonly<{
  deckName: string;
  card: DeckCard;
  note: DeckNote;
  model: DeckModel;
  template: DeckTemplate;
  media: readonly DeckMediaFile[];
}>;

/** One representative of each directly populated deck, without changing the package. */
export function representativeCards(data: DeckData, fretCount = DEFAULT_FRETBOARD_FRET_COUNT): DeckPreviewRow[] {
  const notes = new Map(data.notes.map((note) => [note.id, note]));
  const cards = new Map<number, DeckCard>();
  for (const card of data.cards) {
    const note = notes.get(card.nid);
    if (note && !includesFretboardFretCard(note, fretCount)) continue;
    const previous = cards.get(card.did);
    if (!previous || card.newOrder < previous.newOrder ||
        (card.newOrder === previous.newOrder && card.id < previous.id)) {
      cards.set(card.did, card);
    }
  }
  const models = new Map(data.models.map((model) => [model.mid, model]));
  return [...data.decks]
    .sort((a, b) => compareDeckNames(a.name, b.name) || a.did - b.did)
    .flatMap((deck): DeckPreviewRow[] => {
      const card = cards.get(deck.did);
      if (!card) return [];
      const note = notes.get(card.nid);
      const model = note && models.get(note.mid);
      const template = model?.templates.find((entry) => entry.ord === card.ord);
      if (!note || !model || !template) {
        throw new Error(`Cannot preview card ${card.id}: missing note, model, or template`);
      }
      return [{ deckName: deck.name, card, note, model, template, media: data.media }];
    });
}

/** A standalone iframe document; no database, storage, or object URL lifetime. */
export function previewDocument(row: DeckPreviewRow, back: boolean, showKeyboard: boolean, noteFont?: NoteFont, fretCount = DEFAULT_FRETBOARD_FRET_COUNT, minorNotation: MinorDegreeNotation = "im7", chordNotation: ChordNotation = DEFAULT_CHORD_NOTATION): string {
  const fields = Object.fromEntries(row.model.fieldNames.map((name, index) =>
    [name, row.note.fields[index] ?? ""],
  ));
  Object.assign(fields, chordToneDisplayFields(row.note, chordNotation), diatonicDisplayFields(row.note, minorNotation, chordNotation), progressionDisplayFields(row.note, minorNotation, chordNotation));
  const front = renderTemplate(row.template.qfmt, fields);
  const html = back
    ? renderTemplate(row.template.afmt, { ...fields, FrontSide: front })
    : front;
  const mediaUrls = new Map(row.media.map(({ filename, data }) => {
    const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
    // Deck packages carry text SVGs. The reviewer's MIME helper lives in the
    // database module, which must not be initialized just to render a preview.
    const mime = extension === "svg" ? "image/svg+xml" : "application/octet-stream";
    return [filename, `data:${mime};charset=utf-8,${encodeURIComponent(data)}`];
  }));
  return buildCardDocument({
    html: resolveMediaReferences(html, mediaUrls),
    css: row.model.css + noteFontCss(noteFont, diatonicDirection(row.note) !== null || isChordToneCard(row.note) || isProgressionCard(row.note)),
    nightMode: true,
    keyboardKeys: DEFAULT_DECK_CARD_SETTINGS.keyboardKeys,
    referenceKeyboardKeys: defaultDeckCardSettings(row.deckName).referenceKeyboardKeys,
    pianoKeys: DEFAULT_CARD_SCALES.pianoKeys,
    showKeyboard,
    intervalRoot: back ? true : DEFAULT_DECK_CARD_SETTINGS.frontRoot,
    variables: {
      ...fretWindowVariables(DEFAULT_FRET_WINDOW),
      "--fretboard-fret-count": String(fretCount),
      ...staffCardVariables(row.note, DEFAULT_STAFF_NOTE_SELECTION),
    },
  });
}
