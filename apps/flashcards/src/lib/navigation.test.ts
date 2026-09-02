// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  deckListScrollTopFromHistoryState,
  deckFromHistoryState,
  extraStudyDeckFromHistoryState,
  historyStateForDeck,
  historyStateForDeckListScrollTop,
  historyStateForExtraStudyDeck,
  historyStateForSettingsDeck,
  settingsDeckFromHistoryState,
} from "./navigation";

describe("deck-list scroll position", () => {
  it("round-trips the position without discarding other history state", () => {
    const state = historyStateForDeckListScrollTop(
      { musicFlashcardsStudyDeck: null },
      640,
    );
    expect(state).toEqual({
      musicFlashcardsStudyDeck: null,
      musicFlashcardsDeckListScrollTop: 640,
    });
    expect(deckListScrollTopFromHistoryState(state)).toBe(640);
  });

  it("uses zero for invalid positions", () => {
    expect(deckListScrollTopFromHistoryState(null)).toBe(0);
    expect(
      deckListScrollTopFromHistoryState({
        musicFlashcardsDeckListScrollTop: -1,
      }),
    ).toBe(0);
    expect(
      deckListScrollTopFromHistoryState({
        musicFlashcardsDeckListScrollTop: "640",
      }),
    ).toBe(0);
    expect(historyStateForDeckListScrollTop(null, Number.NaN)).toEqual({
      musicFlashcardsDeckListScrollTop: 0,
    });
  });
});

describe("reviewer browser history", () => {
  it("round-trips a selected deck without discarding other history state", () => {
    const state = historyStateForDeck({ vite: "kept" }, "Parent::Child");
    expect(state).toEqual({
      vite: "kept",
      musicFlashcardsStudyDeck: "Parent::Child",
    });
    expect(deckFromHistoryState(state)).toBe("Parent::Child");
  });

  it("uses null for the deck-list history entry", () => {
    expect(deckFromHistoryState(historyStateForDeck(null, null))).toBeNull();
  });

  it("rejects invalid history state", () => {
    expect(deckFromHistoryState(undefined)).toBeNull();
    expect(deckFromHistoryState({ musicFlashcardsStudyDeck: 123 })).toBeNull();
    expect(deckFromHistoryState({ musicFlashcardsStudyDeck: "" })).toBeNull();
  });
});

describe("settings browser history", () => {
  it("round-trips the deck whose settings are open", () => {
    const state = historyStateForSettingsDeck(
      { musicFlashcardsStudyDeck: "Parent::Child" },
      "(Experimental) Circle of Fifths::Note → Cell",
    );
    expect(state).toEqual({
      musicFlashcardsStudyDeck: "Parent::Child",
      musicFlashcardsNoteSettingsDeck:
        "(Experimental) Circle of Fifths::Note → Cell",
    });
    expect(settingsDeckFromHistoryState(state)).toBe(
      "(Experimental) Circle of Fifths::Note → Cell",
    );
  });

  it("uses null when the settings screen is closed", () => {
    const state = historyStateForSettingsDeck(
      { musicFlashcardsNoteSettingsDeck: "Deck" },
      null,
    );
    expect(settingsDeckFromHistoryState(state)).toBeNull();
  });

  it("rejects invalid settings history state", () => {
    expect(settingsDeckFromHistoryState(undefined)).toBeNull();
    expect(
      settingsDeckFromHistoryState({ musicFlashcardsNoteSettingsDeck: 123 }),
    ).toBeNull();
    expect(
      settingsDeckFromHistoryState({ musicFlashcardsNoteSettingsDeck: "" }),
    ).toBeNull();
  });
});

describe("study-more browser history", () => {
  it("round-trips the deck whose study-more dialog is open", () => {
    const state = historyStateForExtraStudyDeck(
      { musicFlashcardsStudyDeck: "Intervals" },
      "Intervals",
    );
    expect(state).toEqual({
      musicFlashcardsStudyDeck: "Intervals",
      musicFlashcardsExtraStudyDeck: "Intervals",
    });
    expect(extraStudyDeckFromHistoryState(state)).toBe("Intervals");
    expect(settingsDeckFromHistoryState(state)).toBeNull();
  });

  it("uses null when the dialog is closed", () => {
    expect(
      extraStudyDeckFromHistoryState(
        historyStateForExtraStudyDeck({ musicFlashcardsExtraStudyDeck: "D" }, null),
      ),
    ).toBeNull();
    expect(extraStudyDeckFromHistoryState(undefined)).toBeNull();
  });
});
