// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { DeckData } from "./deck-data";
import { previewDocument, representativeCards, type DeckPreviewRow } from "./deck-preview";

function fixture(): DeckData {
  return {
    rootDeckNames: ["Parent", "Zebra"],
    decks: [
      { did: 3, name: "Zebra" },
      { did: 1, name: "Parent" },
      { did: 2, name: "Parent::Child" },
      { did: 4, name: "Empty" },
    ],
    models: [{
      mid: 7, name: "Basic", css: ".card { color: coral; }",
      fieldNames: ["Question", "Answer", "Missing"],
      templates: [
        { ord: 5, name: "Reverse", qfmt: "<h1>{{Question}}</h1>{{Missing}}", afmt: "{{FrontSide}}<hr>{{Answer}}" },
        { ord: 0, name: "Forward", qfmt: "other front", afmt: "other back" },
      ],
    }],
    notes: [
      { id: 10, guid: "a", mid: 7, tags: "", fields: ['C♯ <img src="diagram.SVG">', '<b>Δ3</b><a href="missing.svg">link</a>'] },
      { id: 11, guid: "b", mid: 7, tags: "", fields: ["another", "answer"] },
    ],
    cards: [
      { id: 30, nid: 11, did: 2, ord: 0, newOrder: 1 },
      { id: 1, nid: 11, did: 2, ord: 0, newOrder: 2 },
      { id: 20, nid: 10, did: 2, ord: 5, newOrder: 1 },
      { id: 40, nid: 11, did: 3, ord: 0, newOrder: 0 },
    ],
    media: [{ filename: "diagram.SVG", data: '<svg xmlns="http://www.w3.org/2000/svg"><text>C♯ Δ3 # &</text></svg>' }],
  };
}

describe("representativeCards", () => {
  it("sorts directly populated decks and chooses newOrder then id, matching template ord", () => {
    const data = fixture();
    const before = structuredClone(data);
    const rows = representativeCards(data);
    expect(rows.map(({ deckName, card }) => [deckName, card.id])).toEqual([
      ["Parent::Child", 20], ["Zebra", 40],
    ]);
    expect(rows[0].note).toBe(data.notes[0]);
    expect(rows[0].model).toBe(data.models[0]);
    expect(rows[0].template).toBe(data.models[0].templates[0]);
    expect(rows[1].template).toBe(data.models[0].templates[1]);
    expect(rows[0].media).toBe(data.media);
    expect(representativeCards({
      ...data, decks: [...data.decks].reverse(), cards: [...data.cards].reverse(),
      notes: [...data.notes].reverse(),
      models: data.models.map((model) => ({ ...model, templates: [...model.templates].reverse() })),
    })).toEqual(rows.map((row) => ({
      ...row, model: { ...row.model, templates: [...row.model.templates].reverse() },
    })));
    expect(data).toEqual(before);
  });

  it("includes a parent with its own cards as well as its populated child", () => {
    const data = fixture();
    expect(representativeCards({ ...data, cards: [...data.cards, { ...data.cards[0], id: 99, did: 1 }] })
      .map((row) => row.deckName)).toEqual(["Parent", "Parent::Child", "Zebra"]);
    expect(representativeCards({ ...data, cards: [] })).toEqual([]);
  });

  it("reports a broken representative instead of silently using a different template", () => {
    const data = fixture();
    expect(() => representativeCards({ ...data, cards: [{ ...data.cards[0], ord: 99 }] }))
      .toThrow("missing note, model, or template");
  });
});

describe("previewDocument", () => {
  it("renders question and FrontSide answer with inline Unicode media and reviewer defaults", () => {
    const row: DeckPreviewRow = representativeCards(fixture())[0];
    const before = structuredClone(row);
    const front = previewDocument(row, false, false);
    const back = previewDocument(row, true, true);
    const image = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(row.media[0].data)}`;
    const question = `<h1>C♯ <img src="${image}"></h1>`;
    expect(front).toContain(`<body class="card nightMode night_mode">${question}`);
    expect(front).toContain('</script></body>');
    expect(back).toContain(`${question}<hr><b>Δ3</b>`);
    expect(back).toContain('href="missing.svg"');
    expect(front).toContain(row.model.css);
    expect(front).toContain('data-keyboard-keys="37"');
    expect(front).toContain('data-piano-keys="88"');
    expect(front).not.toContain('data-show-keyboard="on"');
    expect(back).toContain('data-show-keyboard="on"');
    expect(front).not.toContain("{{");
    expect(back).not.toContain("{{FrontSide}}");
    expect(previewDocument(row, false, false)).toBe(front);
    expect(row).toEqual(before);
  });

  it("resolves template media references in src, href and xlink:href and tolerates no media", () => {
    const row = representativeCards(fixture())[0];
    const template = { ...row.template, qfmt: '<img src="diagram.SVG"><use href="diagram.SVG"></use><use xlink:href="diagram.SVG"></use>' };
    const doc = previewDocument({ ...row, template }, false, true);
    expect(doc.match(/data:image\/svg\+xml/g)).toHaveLength(3);
    expect(previewDocument({ ...row, template, media: [] }, false, false)).toContain(template.qfmt);
  });
});
