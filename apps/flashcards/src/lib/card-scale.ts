// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// How large a card draws its staff and keyboard, and how many keys an interval
// keyboard shows. What suits a phone held close is not what suits a laptop
// across a desk, so this is the reader's to set.
//
// Some of it is the reader's alone and holds wherever they are — how large a
// keyboard, a fretboard, an answer is drawn. The rest is what one deck asks
// for and another does not, and is kept per deck.

const STORAGE_KEY = "music-flashcards:card-scales";
const DECK_STORAGE_KEY = "music-flashcards:deck-card-settings";

export const CARD_SCALE_STEP = 0.1;
export const MIN_CARD_SCALE = 0.5;
export const MAX_CARD_SCALE = 2;
// The sizes a piano keyboard is actually built in, cropped around the middle
// of an 88-key board — the boundary between E4 and F4.
const PIANO_KEY_COUNTS = [49, 61, 76, 88] as const;
export const MIN_KEYBOARD_KEYS = 25;
export const MAX_KEYBOARD_KEYS = 37;
export const KEYBOARD_KEYS_STEP = 2;

// How much of the card area is left empty above the card, as a fraction of it.
// A phone hangs the card at the top of a tall screen and the answer buttons at
// the bottom; pushing the card down brings the two within one thumb's reach.
//
// A negative share does the opposite and pulls the card up past the top of the
// area, so it is drawn taller than the screen holds and cropped there. A card
// turned sideways is as wide as its area is tall, so the crop buys length: a
// fretboard reaches further before the frets are too narrow to read.
export const MIN_TOP_SPACE = -0.6;
export const MAX_TOP_SPACE = 0.6;
export const TOP_SPACE_STEP = 0.05;

export type CardScaleKind = "keyboard" | "board" | "answer";

// Turning the card sideways gives a wide diagram — an 88-key keyboard, a
// fretboard — the long side of a phone held upright. Each press turns it a
// quarter of the way round, either way; two the same way stand it on its head,
// which is how a card is read by someone sitting across the table.
const CARD_ROTATIONS = [0, 90, 180, -90] as const;

export type CardRotation = (typeof CARD_ROTATIONS)[number];

// The keyboard and the fretboard can also be asked for the width of the
// screen, which is not a multiple of anything: a board is read across, and how
// much of it a screen can hold is the question, not how large it is against
// some other card.
// Where the answer buttons are: the edge of the screen they lie along, and
// which end of it they are at. An edge on its own spreads them along the whole
// of it, the way they spread across the foot of the screen; an end packs them
// into that corner and leaves the rest of the edge to the card.
//
// The edge is also which way they face — down a side they stand on end, so a
// card turned sideways can be read and answered without the two facing
// different ways. There is no top edge on its own: the app bar is already
// there.
const ANSWER_ANCHORS = [
  "bottom",
  "bottom-left",
  "bottom-right",
  "left",
  "left-bottom",
  "left-top",
  "right",
  "right-bottom",
  "right-top",
  "top-left",
  "top-right",
] as const;

export type AnswerAnchor = (typeof ANSWER_ANCHORS)[number];

// Named where they are pointed at, so the sheet, the picker and the reader
// all call a place the same thing.
export const ANSWER_ANCHOR_LABELS: Readonly<Record<AnswerAnchor, string>> = {
  bottom: "Bottom",
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
  left: "Left",
  "left-bottom": "Left bottom",
  "left-top": "Left top",
  right: "Right",
  "right-bottom": "Right bottom",
  "right-top": "Right top",
  "top-left": "Top left",
  "top-right": "Top right",
};

// The two halves of the name: which edge, and which end of it if the name
// gives one.
export type AnswerEdge = "bottom" | "left" | "right" | "top";

export function answerAnchorParts(
  anchor: AnswerAnchor,
): Readonly<{ edge: AnswerEdge; end?: AnswerEdge }> {
  const [edge, end] = anchor.split("-") as [AnswerEdge, AnswerEdge?];
  return { edge, end };
}

export const SCREEN_WIDTH = "screen";

export type CardScale = number | typeof SCREEN_WIDTH;

export type CardScales = Readonly<{
  keyboard: CardScale;
  pianoKeys: number;
  // The guitar deck's fretboard, which is drawn on its own rather than beside
  // a staff or a keyboard.
  board: CardScale;
  answer: number;
  // The app bar cut down to the two buttons at its ends. A phone on its side
  // has no height to spare, and the deck's name is the one thing up there a
  // reader already knows. The buttons stay: on a phone the way back may be a
  // swipe, or may be that arrow and nothing else.
  minimalAppBar: boolean;
}>;

export const DEFAULT_CARD_SCALES: CardScales = {
  keyboard: 1,
  pianoKeys: 88,
  board: 1,
  answer: 1,
  minimalAppBar: false,
};

// What one deck draws its own way: the staff only the staff decks draw, the
// keys only an interval keyboard counts, how far down the screen the card sits
// — a deck read at a glance can stay where it is, one answered by thumb comes
// down to meet the buttons — and which way the card is turned.
//
// The last two are what an interval keyboard marks before the card is turned
// over. The root is marked because the question names it; the answer is not,
// until a reader who is naming the interval between two notes asks for it.
export type DeckCardSettings = Readonly<{
  staff: number;
  keyboardKeys: number;
  topSpace: number;
  rotation: CardRotation;
  answerAnchor: AnswerAnchor;
  frontRoot: boolean;
  frontAnswer: boolean;
}>;

export const DEFAULT_DECK_CARD_SETTINGS: DeckCardSettings = {
  staff: 1,
  keyboardKeys: MAX_KEYBOARD_KEYS,
  topSpace: 0,
  rotation: 0,
  answerAnchor: "bottom",
  frontRoot: true,
  frontAnswer: false,
};

// Kept for the deck at the top of the tree, so the decks under it are set
// together: how large a staff is drawn, and which way the card is turned, is
// a matter of what the package draws — and the four clefs of Music Staff draw
// the same card.
export type CardSettingsByDeck = Readonly<Record<string, DeckCardSettings>>;

function topDeckName(deckName: string): string {
  const separator = deckName.indexOf("::");
  return separator < 0 ? deckName : deckName.slice(0, separator);
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

// The width of the screen is asked for by name rather than stepped into, so
// stepping at all leaves it, at the largest size a step can reach.
export function stepCardScale(value: CardScale, steps: 1 | -1): number {
  if (value === SCREEN_WIDTH) return MAX_CARD_SCALE;
  return clampCardScale(value + steps * CARD_SCALE_STEP);
}

export function clampCardScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  // Counted in steps rather than multiplied, so a scale stays a round number
  // and comes back out of storage as the one that went in.
  const steps = Math.round(value / CARD_SCALE_STEP);
  return Math.min(
    MAX_CARD_SCALE,
    Math.max(MIN_CARD_SCALE, Number((steps * CARD_SCALE_STEP).toFixed(2))),
  );
}

export function loadCardScales(
  storage: StorageLike | undefined = browserStorage(),
): CardScales {
  try {
    const stored: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "{}");
    if (typeof stored !== "object" || stored === null) {
      return DEFAULT_CARD_SCALES;
    }
    const values = stored as Record<string, unknown>;
    return {
      keyboard:
        values.keyboard === SCREEN_WIDTH
          ? SCREEN_WIDTH
          : clampCardScale(readScale(values.keyboard)),
      pianoKeys: clampPianoKeys(values.pianoKeys),
      board:
        values.board === SCREEN_WIDTH
          ? SCREEN_WIDTH
          : clampCardScale(readScale(values.board)),
      answer: clampCardScale(readScale(values.answer)),
      minimalAppBar: readSwitch(values.minimalAppBar, false),
    };
  } catch {
    return DEFAULT_CARD_SCALES;
  }
}

export function stepCardRotation(
  value: CardRotation,
  steps: 1 | -1,
): CardRotation {
  const count = CARD_ROTATIONS.length;
  return CARD_ROTATIONS[
    (CARD_ROTATIONS.indexOf(value) + steps + count) % count
  ];
}

function clampCardRotation(value: unknown): CardRotation {
  return CARD_ROTATIONS.find((rotation) => rotation === value) ?? 0;
}

function clampAnswerAnchor(value: unknown): AnswerAnchor {
  return ANSWER_ANCHORS.find((anchor) => anchor === value) ?? "bottom";
}

export function loadCardSettingsByDeck(
  storage: StorageLike | undefined = browserStorage(),
): CardSettingsByDeck {
  try {
    const stored: unknown = JSON.parse(
      storage?.getItem(DECK_STORAGE_KEY) ?? "{}",
    );
    if (typeof stored !== "object" || stored === null) return {};
    return Object.fromEntries(
      Object.entries(stored as Record<string, unknown>).map(
        ([deckName, value]) => [deckName, parseDeckCardSettings(value)],
      ),
    );
  } catch {
    return {};
  }
}

export function deckCardSettings(
  byDeck: CardSettingsByDeck,
  deckName: string,
): DeckCardSettings {
  return byDeck[topDeckName(deckName)] ?? DEFAULT_DECK_CARD_SETTINGS;
}

export function withDeckCardSettings(
  byDeck: CardSettingsByDeck,
  deckName: string,
  settings: DeckCardSettings,
): CardSettingsByDeck {
  const next = { ...byDeck };
  const top = topDeckName(deckName);
  // A deck left out reads as a deck the reader never touched, so that is how
  // one set back to the defaults is written: only what was changed is kept.
  if (isDefaultDeckCardSettings(settings)) delete next[top];
  else next[top] = settings;
  return next;
}

function isDefaultDeckCardSettings(settings: DeckCardSettings): boolean {
  return (
    Object.keys(DEFAULT_DECK_CARD_SETTINGS) as (keyof DeckCardSettings)[]
  ).every((key) => settings[key] === DEFAULT_DECK_CARD_SETTINGS[key]);
}

function parseDeckCardSettings(value: unknown): DeckCardSettings {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_DECK_CARD_SETTINGS;
  }
  const values = value as Record<string, unknown>;
  return {
    staff: clampCardScale(readScale(values.staff)),
    keyboardKeys: clampKeyboardKeys(values.keyboardKeys),
    topSpace: clampTopSpace(values.topSpace),
    rotation: clampCardRotation(values.rotation),
    answerAnchor: clampAnswerAnchor(values.answerAnchor),
    frontRoot: readSwitch(values.frontRoot, true),
    frontAnswer: readSwitch(values.frontAnswer, false),
  };
}

function readSwitch(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function saveCardSettingsByDeck(
  byDeck: CardSettingsByDeck,
  storage: StorageLike | undefined = browserStorage(),
): void {
  storage?.setItem(DECK_STORAGE_KEY, JSON.stringify(byDeck));
}

export function stepKeyboardKeys(value: number, steps: 1 | -1): number {
  return clampKeyboardKeys(value + steps * KEYBOARD_KEYS_STEP);
}

export function stepPianoKeys(value: number, steps: 1 | -1): number {
  const index = PIANO_KEY_COUNTS.indexOf(clampPianoKeys(value) as 49);
  return PIANO_KEY_COUNTS[
    Math.min(PIANO_KEY_COUNTS.length - 1, Math.max(0, index + steps))
  ];
}

export function clampPianoKeys(value: unknown): number {
  return PIANO_KEY_COUNTS.find((count) => count === value) ?? 88;
}

export function clampKeyboardKeys(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MAX_KEYBOARD_KEYS;
  }
  const steps = Math.round((value - MIN_KEYBOARD_KEYS) / KEYBOARD_KEYS_STEP);
  return Math.min(
    MAX_KEYBOARD_KEYS,
    Math.max(MIN_KEYBOARD_KEYS, MIN_KEYBOARD_KEYS + steps * KEYBOARD_KEYS_STEP),
  );
}

export function stepTopSpace(value: number, steps: 1 | -1): number {
  return clampTopSpace(value + steps * TOP_SPACE_STEP);
}

export function clampTopSpace(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const steps = Math.round(value / TOP_SPACE_STEP);
  return Math.min(
    MAX_TOP_SPACE,
    Math.max(MIN_TOP_SPACE, Number((steps * TOP_SPACE_STEP).toFixed(2))),
  );
}

function readScale(value: unknown): number {
  return typeof value === "number" ? value : 1;
}

export function saveCardScales(
  scales: CardScales,
  storage: StorageLike | undefined = browserStorage(),
): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(scales));
}

// The custom properties the deck stylesheet reads.
export function cardScaleVariables(
  scales: CardScales,
  deckSettings: DeckCardSettings,
): Readonly<Record<string, string>> {
  return {
    "--staff-scale": String(deckSettings.staff),
    "--answer-scale": String(scales.answer),
    ...(scales.board === SCREEN_WIDTH
      ? { "--board-width": "100vw" }
      : { "--board-scale": String(scales.board) }),
    // A width, when one is asked for, rather than a multiple of the width the
    // deck would have chosen.
    ...(scales.keyboard === SCREEN_WIDTH
      ? { "--keyboard-width": "100vw" }
      : { "--keyboard-scale": String(scales.keyboard) }),
  };
}

export function formatCardScale(scale: CardScale): string {
  return scale === SCREEN_WIDTH
    ? "Screen width"
    : `${Math.round(scale * 100)}%`;
}
