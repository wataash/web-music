// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  answerAnchorParts,
  answerAnchorAt,
  cardLiveVariables,
  cardPartScales,
  clampCardScale,
  clampKeyboardKeys,
  clampPianoKeys,
  clampCardOffset,
  DEFAULT_CARD_SCALES,
  DEFAULT_DECK_CARD_SETTINGS,
  deckCardSettings,
  defaultDeckCardSettings,
  formatCardScale,
  loadCardScales,
  loadCardSettingsByDeck,
  clampCardOffsetPoint,
  DEFAULT_CARD_OFFSETS,
  formatCardOffset,
  MAX_CARD_OFFSET,
  MAX_CARD_SCALE,
  NO_CARD_OFFSET,
  saveCardScales,
  saveCardSettingsByDeck,
  stepCardRotation,
  stepCardScale,
  stepKeyboardKeys,
  stepPianoKeys,
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
    // A pinch lands where the fingers left it, not on the step a button takes.
    expect(clampCardScale(1.24)).toBeCloseTo(1.24, 5);
    expect(clampCardScale(1.238)).toBeCloseTo(1.24, 5);
    expect(clampCardScale(0.1)).toBe(0.5);
    expect(clampCardScale(9)).toBe(2);
    expect(clampCardScale(Number.NaN)).toBe(1);
  });

  it("round-trips through storage and falls back to full size", () => {
    const storage = memoryStorage();
    saveCardScales(
      { keyboard: 1.3, pianoKeys: 88, board: 1, answer: 1.5, minimalAppBar: true },
      storage,
    );
    expect(loadCardScales(storage)).toEqual({
      keyboard: 1.3,
      pianoKeys: 88,
      board: 1,
      answer: 1.5,
      minimalAppBar: true,
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
    ).toEqual({
      keyboard: 2,
      pianoKeys: 88,
      board: 1,
      answer: 1,
      minimalAppBar: false,
    });
  });

  // Set on the card document itself rather than written into it, so a part
  // under a finger moves and grows without the card being rebuilt around it.
  it("hands the card what it draws itself by", () => {
    expect(
      cardLiveVariables(
        { ...DEFAULT_CARD_SCALES, answer: 1.2 },
        {
          ...DEFAULT_DECK_CARD_SETTINGS,
          staff: 0.7,
          offsets: {
            ...DEFAULT_CARD_OFFSETS,
            text: { x: -0.1, y: 0.25 },
          },
        },
      ),
    ).toEqual({
      "--text-x": "-10vw",
      "--text-y": "25vh",
      "--staff-x": "0vw",
      "--staff-y": "0vh",
      "--keyboard-x": "0vw",
      "--keyboard-y": "0vh",
      "--board-x": "0vw",
      "--board-y": "0vh",
      "--text-scale": "1",
      "--staff-scale": "0.7",
      "--keyboard-scale": "1",
      "--board-scale": "1",
      "--answer-scale": "1.2",
    });
    // Either board can be asked for the width of the screen instead, which is
    // a width rather than a multiple of the deck's own choice.
    expect(
      cardLiveVariables(
        { ...DEFAULT_CARD_SCALES, board: "screen", keyboard: "screen" },
        DEFAULT_DECK_CARD_SETTINGS,
      ),
    ).toMatchObject({ "--board-width": "100vw", "--keyboard-width": "100vw" });
    expect(formatCardScale(0.7)).toBe("70%");
  });

  // A pinch sets a size, and a part asked for the width of the screen has no
  // multiple of its own to pinch from: it starts again from the largest.
  it("names the size of every part a pinch can take hold of", () => {
    expect(
      cardPartScales(
        { ...DEFAULT_CARD_SCALES, keyboard: "screen", board: 0.8 },
        { ...DEFAULT_DECK_CARD_SETTINGS, staff: 0.7, text: 1.4 },
      ),
    ).toEqual({ text: 1.4, staff: 0.7, keyboard: MAX_CARD_SCALE, board: 0.8 });
  });

  // Dragged rather than pointed at: where it is let go says which edge it lies
  // along and which end of it it is at.
  it("lands a dragged answer row on the nearest of its eleven places", () => {
    const area = { width: 400, height: 800 };
    const at = (x: number, y: number) => answerAnchorAt({ x, y }, area);

    expect(at(200, 780)).toBe("bottom");
    expect(at(40, 780)).toBe("bottom-left");
    expect(at(360, 780)).toBe("bottom-right");
    expect(at(10, 400)).toBe("left");
    expect(at(10, 100)).toBe("left-top");
    expect(at(10, 700)).toBe("left-bottom");
    expect(at(390, 400)).toBe("right");
    expect(at(390, 700)).toBe("right-bottom");
    // The top edge has no middle: the app bar is already there.
    expect(at(120, 5)).toBe("top-left");
    expect(at(280, 5)).toBe("top-right");
  });

  // A staff card answers with a note's name, and sounding it every time is
  // practice at naming pitches by ear — a skill the deck is not teaching.
  it("starts the staff decks silent and the rest sounding", () => {
    expect(defaultDeckCardSettings("Music Staff::Staff → Note").sound).toBe(
      false,
    );
    expect(
      defaultDeckCardSettings("Music Staff (with Octave Numbers)").sound,
    ).toBe(false);
    expect(defaultDeckCardSettings("Intervals").sound).toBe(true);
    expect(defaultDeckCardSettings("Guitar Fretboard").sound).toBe(true);

    // Turned on, it is kept; turned back off, the deck is a deck untouched
    // again and is dropped rather than written out as its own default.
    const storage = memoryStorage();
    const loud = withDeckCardSettings({}, "Music Staff::Treble Clef", {
      ...defaultDeckCardSettings("Music Staff"),
      sound: true,
    });
    saveCardSettingsByDeck(loud, storage);
    expect(
      deckCardSettings(loadCardSettingsByDeck(storage), "Music Staff").sound,
    ).toBe(true);
    expect(
      withDeckCardSettings(loud, "Music Staff", {
        ...defaultDeckCardSettings("Music Staff"),
      }),
    ).toEqual({});
  });

  it("moves a part of the card, a card's width either way", () => {
    expect(clampCardOffset(0.2311)).toBe(0.232);
    expect(clampCardOffset(9)).toBe(MAX_CARD_OFFSET);
    expect(clampCardOffset(-9)).toBe(-MAX_CARD_OFFSET);
    expect(clampCardOffset("15%")).toBe(0);
    // A drag hands over wherever the finger has reached, both axes at once,
    // and neither of them leaves a card's width behind.
    expect(clampCardOffsetPoint({ x: 0.1009, y: -0.4 })).toEqual({
      x: 0.1,
      y: -0.4,
    });
    expect(clampCardOffsetPoint({ x: 4, y: -4 })).toEqual({
      x: MAX_CARD_OFFSET,
      y: -MAX_CARD_OFFSET,
    });
    // Read as "right and down", the way the arrows that set it are pointed.
    expect(formatCardOffset(NO_CARD_OFFSET)).toBe("Default");
    expect(formatCardOffset({ x: 0.15, y: -0.1 })).toBe("+15%, -10%");
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
      { ...DEFAULT_CARD_SCALES, keyboard: "screen" },
      storage,
    );
    expect(loadCardScales(storage).keyboard).toBe("screen");
    expect(formatCardScale("screen")).toBe("Screen width");
  });
});

describe("what each deck draws its own way", () => {
  it("keeps the staff, the keys, the places, the turn and the marks per deck", () => {
    const storage = memoryStorage();
    const turned = withDeckCardSettings({}, "Guitar Intervals::Fifths", {
      ...DEFAULT_DECK_CARD_SETTINGS,
      keyboardKeys: 25,
      offsets: {
        ...DEFAULT_DECK_CARD_SETTINGS.offsets,
        keyboard: { x: 0, y: 0.2 },
      },
      rotation: 90,
    });
    saveCardSettingsByDeck(turned, storage);

    expect(
      deckCardSettings(loadCardSettingsByDeck(storage), "Guitar Intervals"),
    ).toEqual({
      ...DEFAULT_DECK_CARD_SETTINGS,
      keyboardKeys: 25,
      offsets: {
        ...DEFAULT_DECK_CARD_SETTINGS.offsets,
        keyboard: { x: 0, y: 0.2 },
      },
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
      // The deck's own defaults: a staff deck starts silent.
    ).toEqual(defaultDeckCardSettings("Music Staff"));
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

  it("names the answer buttons' place by edge, and by end where there is one", () => {
    // An edge on its own has no end; the rest name one.
    expect(answerAnchorParts("bottom")).toEqual({ edge: "bottom" });
    expect(answerAnchorParts("right")).toEqual({ edge: "right" });
    expect(answerAnchorParts("left-top")).toEqual({
      edge: "left",
      end: "top",
    });
    expect(answerAnchorParts("top-right")).toEqual({
      edge: "top",
      end: "right",
    });

    const storage = memoryStorage();
    saveCardSettingsByDeck(
      withDeckCardSettings({}, "Guitar Intervals", {
        ...DEFAULT_DECK_CARD_SETTINGS,
        answerAnchor: "top-left",
      }),
      storage,
    );
    expect(
      deckCardSettings(loadCardSettingsByDeck(storage), "Guitar Intervals"),
    ).toEqual({ ...DEFAULT_DECK_CARD_SETTINGS, answerAnchor: "top-left" });
    expect(
      deckCardSettings(
        loadCardSettingsByDeck(
          memoryStorage({
            "music-flashcards:deck-card-settings":
              '{"Guitar Intervals":{"answerAnchor":"corner"}}',
          }),
        ),
        "Guitar Intervals",
      ).answerAnchor,
    ).toBe("bottom");
  });
});
