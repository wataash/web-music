// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_CARD_SCALES, DEFAULT_DECK_CARD_SETTINGS } from "@web-music/practice-ui/card-scale";
import type { DeckCard, DeckData, DeckMediaFile, DeckModel, DeckNote, DeckTemplate } from "./deck-data";
import { compareDeckNames } from "./deck-visibility";
import { DEFAULT_FRET_WINDOW, fretWindowVariables } from "./guitar-interval-selection";
import { DEFAULT_STAFF_NOTE_SELECTION, staffCardVariables } from "./staff-note-selection";
import { buildCardDocument, renderTemplate, resolveMediaReferences } from "./template";
import type { NoteFont } from "./note-font.svelte";
import { noteFontCss } from "./note-font-css";

export type DeckPreviewRow = Readonly<{
  deckName: string;
  card: DeckCard;
  note: DeckNote;
  model: DeckModel;
  template: DeckTemplate;
  media: readonly DeckMediaFile[];
}>;

/** One representative of each directly populated deck, without changing the package. */
export function representativeCards(data: DeckData): DeckPreviewRow[] {
  const cards = new Map<number, DeckCard>();
  for (const card of data.cards) {
    const previous = cards.get(card.did);
    if (!previous || card.newOrder < previous.newOrder ||
        (card.newOrder === previous.newOrder && card.id < previous.id)) {
      cards.set(card.did, card);
    }
  }
  const notes = new Map(data.notes.map((note) => [note.id, note]));
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
export function previewDocument(row: DeckPreviewRow, back: boolean, showKeyboard: boolean, noteFont?: NoteFont): string {
  const fields = Object.fromEntries(row.model.fieldNames.map((name, index) =>
    [name, row.note.fields[index] ?? ""],
  ));
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
    css: row.model.css + noteFontCss(noteFont),
    nightMode: true,
    keyboardKeys: DEFAULT_DECK_CARD_SETTINGS.keyboardKeys,
    pianoKeys: DEFAULT_CARD_SCALES.pianoKeys,
    showKeyboard,
    intervalRoot: back ? true : DEFAULT_DECK_CARD_SETTINGS.frontRoot,
    variables: {
      ...fretWindowVariables(DEFAULT_FRET_WINDOW),
      ...staffCardVariables(row.note, DEFAULT_STAFF_NOTE_SELECTION),
    },
  });
}
