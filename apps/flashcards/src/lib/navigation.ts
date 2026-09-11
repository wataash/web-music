// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { historyRecord, deckHistoryKey } from "@web-music/practice-ui/navigation";
export { deckActionsFromHistoryState, historyStateForDeckActions, cardLayoutFromHistoryState, historyStateForCardLayout } from "@web-music/practice-ui/navigation";

const STUDY_DECK_KEY = "musicFlashcardsStudyDeck";
const NOTE_SETTINGS_DECK_KEY = "musicFlashcardsNoteSettingsDeck";
const EXTRA_STUDY_DECK_KEY = "musicFlashcardsExtraStudyDeck";
const RESET_DECK_KEY = "musicFlashcardsResetDeck";
const DECK_CHOOSER_KEY = "musicFlashcardsDeckChooser";
const BACKUP_KEY = "musicFlashcardsBackup";
const DECK_LIST_SCROLL_TOP_KEY = "musicFlashcardsDeckListScrollTop";

const studyDeck = deckHistoryKey(STUDY_DECK_KEY);
const settingsDeck = deckHistoryKey(NOTE_SETTINGS_DECK_KEY);
const extraStudyDeck = deckHistoryKey(EXTRA_STUDY_DECK_KEY);
const resetDeck = deckHistoryKey(RESET_DECK_KEY);

export const deckFromHistoryState = studyDeck.read;
export const historyStateForDeck = studyDeck.write;
export const settingsDeckFromHistoryState = settingsDeck.read;
export const historyStateForSettingsDeck = settingsDeck.write;
export const extraStudyDeckFromHistoryState = extraStudyDeck.read;
export const historyStateForExtraStudyDeck = extraStudyDeck.write;
export const resetDeckFromHistoryState = resetDeck.read;
export const historyStateForResetDeck = resetDeck.write;

// The deck chooser and the backup dialog belong to the list rather than to a
// deck, so they have no name to keep — only whether they are open.
function flagHistoryKey(key: string) {
  return {
    read: (state: unknown): boolean => historyRecord(state)[key] === true,
    write: (state: unknown, open: boolean): Record<string, unknown> => ({
      ...historyRecord(state),
      [key]: open,
    }),
  };
}

const deckChooser = flagHistoryKey(DECK_CHOOSER_KEY);
const backup = flagHistoryKey(BACKUP_KEY);

export const deckChooserFromHistoryState = deckChooser.read;
export const historyStateForDeckChooser = deckChooser.write;
export const backupFromHistoryState = backup.read;
export const historyStateForBackup = backup.write;

export function deckListScrollTopFromHistoryState(state: unknown): number {
  const value = historyRecord(state)[DECK_LIST_SCROLL_TOP_KEY];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export function historyStateForDeckListScrollTop(
  state: unknown,
  scrollTop: number,
): Record<string, unknown> {
  const normalized = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
  return {
    ...historyRecord(state),
    [DECK_LIST_SCROLL_TOP_KEY]: normalized,
  };
}
