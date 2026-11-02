// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import {
  NO_CARD_OFFSET, clampCardOffsetPoint, clampCardScale,
  clampPianoKeys, defaultDeckCardSettings, parseDeckCardSettings,
  deckCardSettings, SCREEN_WIDTH,
  type CardPart, type CardScale, type CardOffset, type DeckCardSettings,
} from "@web-music/practice-ui/card-scale";
import type { QueueItem } from "./study";
import { isPianoKeyboardCard } from "./staff-card";
import { isIntervalCard } from "./interval-pair-selection";

export const CARD_LAYOUTS_KEY = "music-flashcards:card-layouts";
type KeyboardLayout = Readonly<{ scale: CardScale; offset: CardOffset }>;
export type CardLayout = Readonly<{
  settings: DeckCardSettings;
  board: CardScale;
  answer: number;
  pianoKeys: number;
  keyboards: Readonly<Record<string, KeyboardLayout>>;
}>;
export type CardLayouts = Readonly<Record<string, CardLayout>>;
type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type LayoutCard = Pick<QueueItem, "note" | "model" | "template" | "deckName">;

// Pitch, key and clef do not change a layout. Direction, template and keyboard
// type do. Never use the parent deck selected to start a study session here.
export function cardLayoutKey(card: LayoutCard): string {
  return JSON.stringify([cardLayoutFamily(card), card.model.name, card.template.ord,
    card.note.tags.split(/\s+/).filter(tag => tag.startsWith("direction::")).sort(),
    isPianoKeyboardCard(card.note) ? "piano" : "standard"]);
}
export function cardLayoutFamily(card: LayoutCard): string {
  return card.deckName.split("::")[0];
}
export function defaultCardLayout(family: string): CardLayout {
  return { settings: defaultDeckCardSettings(family), board: 1, answer: 1, pianoKeys: 88, keyboards: {} };
}
export function keyboardLayoutKey(card: LayoutCard, layout: CardLayout): string {
  if (isPianoKeyboardCard(card.note)) return `piano:${layout.pianoKeys}`;
  if (isIntervalCard(card.note)) return `interval:${layout.settings.keyboardKeys}`;
  if ((card.note.fields[9] ?? "").startsWith("octave|")) return "octave:13";
  return `reference:${layout.settings.referenceKeyboardKeys}`;
}
export function keyboardLayout(card: LayoutCard, layout: CardLayout): KeyboardLayout {
  return layout.keyboards[keyboardLayoutKey(card, layout)] ?? { scale: 1, offset: NO_CARD_OFFSET };
}
export function withKeyboardLayout(card: LayoutCard, layout: CardLayout, changes: Partial<KeyboardLayout>): CardLayout {
  return { ...layout, keyboards: { ...layout.keyboards,
    [keyboardLayoutKey(card, layout)]: { ...keyboardLayout(card, layout), ...changes } } };
}
export function cardLayoutSettings(card: LayoutCard, layout: CardLayout): DeckCardSettings {
  return { ...layout.settings, offsets: { ...layout.settings.offsets, keyboard: keyboardLayout(card, layout).offset } };
}
export function resetCardLayout(layout: CardLayout, family: string): CardLayout {
  const defaults = defaultCardLayout(family);
  const { sound, showKeyboard, frontRoot, frontAnswer } = layout.settings;
  return { ...defaults, settings: { ...defaults.settings, sound, showKeyboard, frontRoot, frontAnswer } };
}
export function loadCardLayouts(storage: StorageLike = localStorage): CardLayouts {
  try {
    const data = JSON.parse(storage.getItem(CARD_LAYOUTS_KEY) ?? "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).flatMap(([key, value]) => {
      if (!value || typeof value !== "object") return [];
      const raw = value as Record<string, unknown>;
      const settings = parseDeckCardSettings(raw.settings, "");
      const keyboards: Record<string, KeyboardLayout> = {};
      if (raw.keyboards && typeof raw.keyboards === "object") {
        for (const [count, value] of Object.entries(raw.keyboards)) {
          if (!value || typeof value !== "object") continue;
          const keyboard = value as Partial<KeyboardLayout>;
          keyboards[count] = { scale: keyboard.scale === SCREEN_WIDTH ? SCREEN_WIDTH : clampCardScale(typeof keyboard.scale === "number" ? keyboard.scale : 1),
            offset: clampCardOffsetPoint(keyboard.offset ?? NO_CARD_OFFSET) };
        }
      }
      return [[key, { settings, board: parseScale(raw.board), answer: clampCardScale(typeof raw.answer === "number" ? raw.answer : 1),
        pianoKeys: clampPianoKeys(raw.pianoKeys), keyboards }]];
    }));
  } catch { return {}; }
}
function parseScale(value: unknown): CardScale {
  return value === SCREEN_WIDTH ? SCREEN_WIDTH : clampCardScale(typeof value === "number" ? value : 1);
}
export function saveCardLayouts(layouts: CardLayouts, storage: StorageLike = localStorage): void {
  storage.setItem(CARD_LAYOUTS_KEY, JSON.stringify(layouts));
}
// Snapshot old deck-specific preferences as a starting point for each layout.
// Never copy the old global zoom, or a cropped long keyboard breaks 13-key cards.
export function initialCardLayout(card: LayoutCard, legacy: Parameters<typeof deckCardSettings>[0]): CardLayout {
  const family = cardLayoutFamily(card);
  const settings = deckCardSettings(legacy, family);
  const layout = { ...defaultCardLayout(family), settings };
  return withKeyboardLayout(card, layout, { offset: settings.offsets.keyboard });
}

// Reset only the selected part, including only the current keyboard key count.
export function layoutPartIsDefault(card: LayoutCard, layout: CardLayout, part: CardPart | "answer"): boolean {
  if (part === "answer") return layout.settings.answerAnchor === "bottom";
  const offset = part === "keyboard" ? keyboardLayout(card, layout).offset : layout.settings.offsets[part];
  const scale = part === "keyboard" ? keyboardLayout(card, layout).scale : part === "board" ? layout.board : layout.settings[part];
  return scale === 1 && Math.abs(offset.x) < 0.0001 && Math.abs(offset.y) < 0.0001;
}
export function resetLayoutPart(card: LayoutCard, layout: CardLayout, part: CardPart | "answer"): CardLayout {
  if (part === "answer") return { ...layout, settings: { ...layout.settings, answerAnchor: "bottom" } };
  if (part === "keyboard") return withKeyboardLayout(card, layout, { scale: 1, offset: NO_CARD_OFFSET });
  const settings = { ...layout.settings, offsets: { ...layout.settings.offsets, [part]: NO_CARD_OFFSET } };
  if (part === "board") return { ...layout, board: 1, settings };
  return { ...layout, settings: { ...settings, [part]: 1 } };
}
