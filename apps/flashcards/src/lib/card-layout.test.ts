// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from "vitest";
import { cardLayoutKey, cardLayoutSettings, defaultCardLayout, initialCardLayout,
  layoutPartIsDefault, resetLayoutPart, keyboardLayout, withKeyboardLayout, resetCardLayout, loadCardLayouts, saveCardLayouts,
  type LayoutCard } from "./card-layout";

function card(pkg = "Music Staff (Movable Do)", direction = "staff-to-note", piano = false): LayoutCard {
  const template = { name: "Card 1", ord: 0, qfmt: "", afmt: "" };
  return { deckName: `${pkg}::Treble Clef`, note: { id: 1, guid: "a", mid: 1, fields: ["", "treble", "C4", "0", "", "", "", "", "", piano ? "piano|" : ""], tags: `direction::${direction}`, pkg: "Music Staff|Music Staff (Movable Do)" },
    model: { mid: 1, name: pkg, css: "", fieldNames: [], templates: [template], pkg }, template };
}

describe("card arrangement scopes", () => {
  it("shares pitches and keys but separates layouts, directions, and keyboard types", () => {
    const a = card();
    const otherPitch = { ...a, note: { ...a.note, guid: "b", fields: ["", "bass", "F5", "-1"] } };
    expect(cardLayoutKey(a)).toBe(cardLayoutKey(otherPitch));
    expect(cardLayoutKey(a)).not.toBe(cardLayoutKey(card("Music Staff")));
    expect(cardLayoutKey(a)).not.toBe(cardLayoutKey(card(undefined, "note-to-staff")));
    expect(cardLayoutKey(a)).not.toBe(cardLayoutKey(card(undefined, undefined, true)));
    // A parent session has no part in the key: only the actual card is passed.
    expect(initialCardLayout(a, {}).settings.referenceKeyboardKeys).toBe(25);
  });

  it("restores keyboard zoom and position independently for 13 and 25 keys", () => {
    const a = card();
    let layout = withKeyboardLayout(a, defaultCardLayout("Music Staff (Movable Do)"), { scale: 2, offset: { x: .2, y: .1 } });
    expect(keyboardLayout(a, layout).scale).toBe(2);
    layout = { ...layout, settings: { ...layout.settings, referenceKeyboardKeys: 13 } };
    expect(keyboardLayout(a, layout)).toEqual({ scale: 1, offset: { x: 0, y: 0 } });
    layout = withKeyboardLayout(a, layout, { scale: "screen" });
    layout = { ...layout, settings: { ...layout.settings, referenceKeyboardKeys: 25 } };
    expect(cardLayoutSettings(a, layout).offsets.keyboard).toEqual({ x: .2, y: .1 });
    expect(keyboardLayout(a, layout).scale).toBe(2);
    const reset = resetCardLayout(layout, a.note.pkg);
    expect(reset.keyboards).toEqual({});
    expect(keyboardLayout(a, reset).scale).toBe(1);
  });

  it("keeps piano key counts, diagrams, labels and reset local to a layout", () => {
    const a = card(), b = card("Music Staff", "staff-to-note", true);
    const first = { ...defaultCardLayout(a.note.pkg), board: 1.7, answer: 1.4, pianoKeys: 49 };
    const second = defaultCardLayout(b.note.pkg);
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    saveCardLayouts({ [cardLayoutKey(a)]: first, [cardLayoutKey(b)]: second }, storage);
    const saved = loadCardLayouts(storage);
    expect(saved[cardLayoutKey(a)]).toEqual(first);
    expect(saved[cardLayoutKey(b)].pianoKeys).toBe(88);
    const reset = resetCardLayout(saved[cardLayoutKey(a)], a.note.pkg);
    expect(reset.board).toBe(1);
    expect(reset.answer).toBe(1);
    expect(saved[cardLayoutKey(b)]).toEqual(second);
  });

  it("retains learning preferences on reset and rejects malformed storage", () => {
    const a = card();
    const layout = defaultCardLayout(a.note.pkg);
    const settings = { ...layout.settings, sound: false, frontAnswer: true, showKeyboard: false };
    expect(resetCardLayout({ ...layout, settings }, a.note.pkg).settings).toMatchObject({ sound: false, frontAnswer: true, showKeyboard: false });
    for (const raw of ["{", "null", "[]", "4"]) {
      expect(loadCardLayouts({ getItem: () => raw, setItem() {} })).toEqual({});
    }
  });
});

describe("individual layout resets", () => {
  it("resets only the current key count and preserves other preferences", () => {
    const a = card();
    let layout = withKeyboardLayout(a, defaultCardLayout("Music Staff (Movable Do)"), {scale: 2});
    layout = {...layout, settings: {...layout.settings, referenceKeyboardKeys: 13, rotation: 90}};
    layout = withKeyboardLayout(a, layout, {scale: 1.5, offset: {x: .2, y: .1}});
    expect(layoutPartIsDefault(a, layout, "keyboard")).toBe(false);
    const reset = resetLayoutPart(a, layout, "keyboard");
    expect(layoutPartIsDefault(a, reset, "keyboard")).toBe(true);
    expect(reset.keyboards['reference:25'].scale).toBe(2);
    expect(reset.settings.rotation).toBe(90);
    expect(reset.settings.referenceKeyboardKeys).toBe(13);
  });
  it("keeps height, rotation and answer position when resetting the board", () => {
    const a=card(); const initial=defaultCardLayout("Guitar Fretboard");
    const layout={...initial, board:2, settings:{...initial.settings, boardHeight:1.5, rotation:90 as const, answerAnchor:"top-left" as const, offsets:{...initial.settings.offsets,board:{x:.1,y:.2}}}};
    const reset=resetLayoutPart(a,layout,"board");
    expect(layoutPartIsDefault(a,reset,"board")).toBe(true);
    expect(reset.settings.boardHeight).toBe(1.5);
    expect(reset.settings.rotation).toBe(90);
    expect(reset.settings.answerAnchor).toBe("top-left");
    const anchor=resetLayoutPart(a,layout,"answer");
    expect(anchor.board).toBe(2);
    expect(layoutPartIsDefault(a,anchor,"answer")).toBe(true);
  });
});
