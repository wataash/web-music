// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export function historyRecord(state: unknown): Record<string, unknown> {
  return state && typeof state === "object" && !Array.isArray(state)
    ? (state as Record<string, unknown>)
    : {};
}

// Each screen that the back button should close keeps the deck it belongs to
// under its own key, so a history entry says which of them is open.
export function deckHistoryKey(key: string) {
  return {
    read: (state: unknown): string | null => {
      const value = historyRecord(state)[key];
      return typeof value === "string" && value.length > 0 ? value : null;
    },
    write: (
      state: unknown,
      deckName: string | null,
    ): Record<string, unknown> => ({ ...historyRecord(state), [key]: deckName }),
  };
}

const deckActions = deckHistoryKey("musicFlashcardsDeckActionsDeck");
const cardLayout = deckHistoryKey("musicFlashcardsCardLayoutDeck");
export const deckActionsFromHistoryState = deckActions.read;
export const historyStateForDeckActions = deckActions.write;
export const cardLayoutFromHistoryState = cardLayout.read;
export const historyStateForCardLayout = cardLayout.write;
