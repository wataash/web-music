// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  cardScaleVariables,
  clampCardScale,
  clampKeyboardKeys,
  clampPianoKeys,
  clampTopSpace,
  DEFAULT_CARD_SCALES,
  DEFAULT_DECK_CARD_SETTINGS,
  deckCardSettings,
  formatCardScale,
  loadCardScales,
  loadCardSettingsByDeck,
  MAX_TOP_SPACE,
  MIN_TOP_SPACE,
  saveCardScales,
  saveCardSettingsByDeck,
  stepCardRotation,
  stepCardScale,
  stepKeyboardKeys,
  stepPianoKeys,
  stepTopSpace,
  withDeckCardSettings,
} from "./card-scale";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("card scales", () => {
  it("steps the piano through the sizes a keyboard is built in", () => {
    expect(stepPianoKeys(88, -1)).toBe(76);
    expect(stepPianoKeys(49, -1)).toBe(49);
    expect(stepPianoKeys(49, 1)).toBe(61);
    expect(stepPianoKeys(88, 1)).toBe(88);
    expect(clampPianoKeys(64)).toBe(88);
    expect(clampPianoKeys(61)).toBe(61);
  });

  it("keeps a scale on the step, between half and double", () => {
    expect(clampCardScale(1.24)).toBeCloseTo(1.2, 5);
    expect(clampCardScale(0.1)).toBe(0.5);
    expect(clampCardScale(9)).toBe(2);
    expect(clampCardScale(Number.NaN)).toBe(1);
  });

  it("round-trips through storage and falls back to full size", () => {
    const storage = memoryStorage();
    saveCardScales(
      { keyboard: 1.3, pianoKeys: 88, board: 1, answer: 1.5 },
      storage,
    );
    expect(loadCardScales(storage)).toEqual({
      keyboard: 1.3,
      pianoKeys: 88,
      board: 1,
      answer: 1.5,
    });

    expect(loadCardScales(memoryStorage())).toEqual(DEFAULT_CARD_SCALES);
    expect(
      loadCardScales(memoryStorage({ "music-flashcards:card-scales": "{" })),
    ).toEqual(DEFAULT_CARD_SCALES);
    expect(
      loadCardScales(
        memoryStorage({
          "music-flashcards:card-scales": '{"answer":"big","keyboard":42}',
        }),
      ),
    ).toEqual({ keyboard: 2, pianoKeys: 88, board: 1, answer: 1 });
  });

  it("hands the deck stylesheet what it reads", () => {
    expect(
      cardScaleVariables(
        { keyboard: 1, pianoKeys: 88, board: 1, answer: 1.2 },
        { ...DEFAULT_DECK_CARD_SETTINGS, staff: 0.7 },
      ),
    ).toEqual({
      "--staff-scale": "0.7",
      "--keyboard-scale": "1",
      "--board-scale": "1",
      "--answer-scale": "1.2",
    });
    // Either board can be asked for the width of the screen instead.
    expect(
      cardScaleVariables(
        { keyboard: 1, pianoKeys: 88, board: "screen", answer: 1 },
        DEFAULT_DECK_CARD_SETTINGS,
      )["--board-width"],
    ).toBe("100vw");
    // Asked for the width of the screen, the keyboard is given one rather
    // than a multiple of the deck's own choice.
    expect(
      cardScaleVariables(
        { keyboard: "screen", pianoKeys: 88, board: 1, answer: 1 },
        DEFAULT_DECK_CARD_SETTINGS,
      ),
    ).toEqual({
      "--staff-scale": "1",
      "--board-scale": "1",
      "--answer-scale": "1",
      "--keyboard-width": "100vw",
    });
    expect(formatCardScale(0.7)).toBe("70%");
  });

  it("leaves the top of the card area empty in twentieths, 60% either way", () => {
    expect(clampTopSpace(0.23)).toBe(0.25);
    expect(clampTopSpace(9)).toBe(MAX_TOP_SPACE);
    expect(clampTopSpace(-9)).toBe(MIN_TOP_SPACE);
    expect(clampTopSpace("15%")).toBe(0);
    expect(stepTopSpace(0, 1)).toBe(0.05);
    expect(stepTopSpace(MAX_TOP_SPACE, 1)).toBe(MAX_TOP_SPACE);
    // Below zero the card is pulled up past the top of the area instead.
    expect(stepTopSpace(0, -1)).toBe(-0.05);
    expect(stepTopSpace(MIN_TOP_SPACE, -1)).toBe(MIN_TOP_SPACE);
    expect(formatCardScale(0.15)).toBe("15%");
    expect(formatCardScale(-0.15)).toBe("-15%");
  });

  it("keeps interval keyboard key counts odd, from 25 through 37", () => {
    expect(clampKeyboardKeys(24)).toBe(25);
    expect(clampKeyboardKeys(26)).toBe(27);
    expect(clampKeyboardKeys(99)).toBe(37);
    expect(clampKeyboardKeys("29")).toBe(37);
    expect(stepKeyboardKeys(25, -1)).toBe(25);
    expect(stepKeyboardKeys(25, 1)).toBe(27);
    expect(stepKeyboardKeys(37, 1)).toBe(37);
  });
});

describe("stepping a size", () => {
  it("stops at double and at half, and steps off the width of the screen", () => {
    expect(stepCardScale(1, 1)).toBeCloseTo(1.1, 5);
    expect(stepCardScale(2, 1)).toBe(2);
    expect(stepCardScale(0.5, -1)).toBe(0.5);
    // Asked for by name, so any step leaves it.
    expect(stepCardScale("screen", -1)).toBe(2);
    expect(stepCardScale("screen", 1)).toBe(2);
  });

  it("remembers the width of the screen", () => {
    const storage = memoryStorage();
    saveCardScales(
      { keyboard: "screen", pianoKeys: 88, board: 1, answer: 1 },
      storage,
    );
    expect(loadCardScales(storage).keyboard).toBe("screen");
    expect(formatCardScale("screen")).toBe("Screen width");
  });
});

describe("what each deck draws its own way", () => {
  it("keeps the staff, the keys, the space, the turn and the marks per deck", () => {
    const storage = memoryStorage();
    const turned = withDeckCardSettings({}, "Guitar Intervals::Fifths", {
      ...DEFAULT_DECK_CARD_SETTINGS,
      keyboardKeys: 25,
      topSpace: 0.2,
      rotation: 90,
    });
    saveCardSettingsByDeck(turned, storage);

    expect(
      deckCardSettings(loadCardSettingsByDeck(storage), "Guitar Intervals"),
    ).toEqual({
      ...DEFAULT_DECK_CARD_SETTINGS,
      keyboardKeys: 25,
      topSpace: 0.2,
      rotation: 90,
    });
    // Another deck is untouched by it, and so is a reader who set nothing.
    expect(
      deckCardSettings(loadCardSettingsByDeck(storage), "Treble Clef"),
    ).toEqual(DEFAULT_DECK_CARD_SETTINGS);
    expect(
      deckCardSettings(loadCardSettingsByDeck(memoryStorage()), "Treble Clef"),
    ).toEqual(DEFAULT_DECK_CARD_SETTINGS);

    // A deck set back to the defaults is written by dropping it.
    expect(
      withDeckCardSettings(
        turned,
        "Guitar Intervals",
        DEFAULT_DECK_CARD_SETTINGS,
      ),
    ).toEqual({});
  });

  // The decks under one package draw the same card, so they are set together.
  it("sets the decks of a tree from whichever of them is being studied", () => {
    const turned = withDeckCardSettings(
      {},
      "Music Staff::Staff → Note::Treble Clef",
      { ...DEFAULT_DECK_CARD_SETTINGS, rotation: 90 },
    );

    expect(Object.keys(turned)).toEqual(["Music Staff"]);
    expect(
      deckCardSettings(turned, "Music Staff::Staff → Note::Bass Clef").rotation,
    ).toBe(90);
    expect(deckCardSettings(turned, "Music Staff").rotation).toBe(90);
    // A package of its own is not touched by it, its name being another.
    expect(
      deckCardSettings(turned, "Music Staff (with Octave Numbers)::Staff → Note")
        .rotation,
    ).toBe(0);
  });

  it("falls back to the defaults on anything unreadable", () => {
    expect(
      deckCardSettings(
        loadCardSettingsByDeck(
          memoryStorage({
            "music-flashcards:deck-card-settings":
              '{"Music Staff":{"staff":"big","rotation":45,"frontRoot":"yes"}}',
          }),
        ),
        "Music Staff::Staff → Note::Treble Clef",
      ),
    ).toEqual(DEFAULT_DECK_CARD_SETTINGS);
    expect(
      loadCardSettingsByDeck(
        memoryStorage({ "music-flashcards:deck-card-settings": "{" }),
      ),
    ).toEqual({});
  });

  it("turns a quarter at a time, either way, round to upright", () => {
    expect(stepCardRotation(0, 1)).toBe(90);
    expect(stepCardRotation(90, 1)).toBe(180);
    expect(stepCardRotation(180, 1)).toBe(-90);
    expect(stepCardRotation(-90, 1)).toBe(0);
    expect(stepCardRotation(0, -1)).toBe(-90);
    expect(stepCardRotation(180, -1)).toBe(90);
  });
});
