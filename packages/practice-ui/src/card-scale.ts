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
export const MAX_KEYBOARD_KEYS = 41;
export const KEYBOARD_KEYS_STEP = 2;

// Where each part of the card sits, as a share of the card's width and height.
// A phone hangs the card at the top of a tall screen and the answer buttons at
// the bottom; moving the question and the keyboard down brings the two within
// one thumb's reach, and a part moved up or sideways gets out of the way of
// whatever the reader has put beside it.
//
// A part is moved rather than laid out again: nothing it is drawn beside
// follows it, so the card behind stays where it was and the reader positions
// one thing at a time.
export const CARD_PARTS = ["text", "staff", "keyboard", "board"] as const;

export type CardPart = (typeof CARD_PARTS)[number];

export type CardOffset = Readonly<{ x: number; y: number }>;

export type CardOffsets = Readonly<Record<CardPart, CardOffset>>;

// What each part is called where a reader is told which one they just moved.
export const CARD_PART_LABELS: Readonly<Record<CardPart, string>> = {
  text: "Text",
  staff: "Staff",
  keyboard: "Keyboard",
  board: "Diagram",
};

export const MAX_CARD_OFFSET = 1;
// A part is dragged rather than stepped, so the grain is what a finger can
// hold still to: fine enough that nothing snaps under it, coarse enough that
// what is stored is a short number.
export const CARD_OFFSET_STEP = 0.002;

export const NO_CARD_OFFSET: CardOffset = { x: 0, y: 0 };

export const DEFAULT_CARD_OFFSETS: CardOffsets = Object.fromEntries(
  CARD_PARTS.map((part) => [part, NO_CARD_OFFSET]),
) as CardOffsets;

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

// Which of the eleven places a dragged answer row is nearest: the edge it is
// closest to, and which third of that edge it is over. The top edge has no
// middle — the app bar is already there — so it is halved instead.
export function answerAnchorAt(
  point: Readonly<{ x: number; y: number }>,
  area: Readonly<{ width: number; height: number }>,
): AnswerAnchor {
  const toLeft = point.x;
  const toRight = area.width - point.x;
  const toTop = point.y;
  const toBottom = area.height - point.y;
  const nearest = Math.min(toLeft, toRight, toTop, toBottom);
  if (nearest === toTop) {
    return point.x < area.width / 2 ? "top-left" : "top-right";
  }
  if (nearest === toLeft || nearest === toRight) {
    const edge = nearest === toLeft ? "left" : "right";
    const along = point.y / area.height;
    if (along < 1 / 3) return `${edge}-top`;
    return along > 2 / 3 ? `${edge}-bottom` : edge;
  }
  const along = point.x / area.width;
  if (along < 1 / 3) return "bottom-left";
  return along > 2 / 3 ? "bottom-right" : "bottom";
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
// keys only an interval keyboard counts, where each part of the card sits — a
// deck read at a glance can stay where it is, one answered by thumb comes down
// to meet the buttons — and which way the card is turned.
//
// The last two are what an interval keyboard marks before the card is turned
// over. The root is marked because the question names it; the answer is not,
// until a reader who is naming the interval between two notes asks for it.
export type DeckCardSettings = Readonly<{
  staff: number;
  // The question and the answer as words. The deck decides what size the card
  // is written at; this is the reader's multiple of it, so every part of a
  // card can be sized the same way — by pinching it.
  text: number;
  keyboardKeys: number;
  offsets: CardOffsets;
  rotation: CardRotation;
  answerAnchor: AnswerAnchor;
  // Whether the card sounds what it answers with and what a finger lands on.
  sound: boolean;
  frontRoot: boolean;
  frontAnswer: boolean;
}>;

export const DEFAULT_DECK_CARD_SETTINGS: DeckCardSettings = {
  staff: 1,
  text: 1,
  keyboardKeys: 37,
  offsets: DEFAULT_CARD_OFFSETS,
  rotation: 0,
  answerAnchor: "bottom",
  sound: true,
  frontRoot: true,
  frontAnswer: false,
};

// A staff card asks which note is written, and answers with its name. Sounding
// that answer every time is practice at naming a pitch by ear — a different
// skill, and one a reader is better off not chasing by accident — so those
// decks start silent. The switch is still theirs to turn on.
const SILENT_DECKS = ["Music Staff", "Guitar Fretboard"];

export function defaultDeckCardSettings(deckName: string): DeckCardSettings {
  const top = topDeckName(deckName);
  return SILENT_DECKS.some((name) => top.startsWith(name))
    ? { ...DEFAULT_DECK_CARD_SETTINGS, sound: false }
    : DEFAULT_DECK_CARD_SETTINGS;
}

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
  // To the nearest hundredth rather than to the step a button takes: a size
  // pinched to is whatever the fingers made it, and a size stepped to is a
  // round number already. Rounded at all so that what is stored is short and
  // comes back out as the one that went in.
  return Math.min(
    MAX_CARD_SCALE,
    Math.max(MIN_CARD_SCALE, Math.round(value * 100) / 100),
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
        ([deckName, value]) => [
          deckName,
          parseDeckCardSettings(value, deckName),
        ],
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
  return byDeck[topDeckName(deckName)] ?? defaultDeckCardSettings(deckName);
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
  if (isDefaultDeckCardSettings(settings, deckName)) delete next[top];
  else next[top] = settings;
  return next;
}

function isDefaultDeckCardSettings(
  settings: DeckCardSettings,
  deckName: string,
): boolean {
  const fallback = defaultDeckCardSettings(deckName);
  return (
    (Object.keys(fallback) as (keyof DeckCardSettings)[]).every(
      (key) => key === "offsets" || settings[key] === fallback[key],
    ) &&
    CARD_PARTS.every(
      (part) =>
        settings.offsets[part].x === 0 && settings.offsets[part].y === 0,
    )
  );
}

function parseDeckCardSettings(
  value: unknown,
  deckName: string,
): DeckCardSettings {
  const fallback = defaultDeckCardSettings(deckName);
  if (typeof value !== "object" || value === null) return fallback;
  const values = value as Record<string, unknown>;
  return {
    staff: clampCardScale(readScale(values.staff)),
    text: clampCardScale(readScale(values.text)),
    keyboardKeys: clampKeyboardKeys(values.keyboardKeys),
    offsets: parseCardOffsets(values.offsets),
    rotation: clampCardRotation(values.rotation),
    answerAnchor: clampAnswerAnchor(values.answerAnchor),
    sound: readSwitch(values.sound, fallback.sound),
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
    return DEFAULT_DECK_CARD_SETTINGS.keyboardKeys;
  }
  const steps = Math.round((value - MIN_KEYBOARD_KEYS) / KEYBOARD_KEYS_STEP);
  return Math.min(
    MAX_KEYBOARD_KEYS,
    Math.max(MIN_KEYBOARD_KEYS, MIN_KEYBOARD_KEYS + steps * KEYBOARD_KEYS_STEP),
  );
}

function parseCardOffsets(value: unknown): CardOffsets {
  const stored = (typeof value === "object" && value !== null ? value : {}) as
    Record<string, unknown>;
  return Object.fromEntries(
    CARD_PARTS.map((part) => {
      const offset = (
        typeof stored[part] === "object" && stored[part] !== null
          ? stored[part]
          : {}
      ) as Record<string, unknown>;
      return [
        part,
        { x: clampCardOffset(offset.x), y: clampCardOffset(offset.y) },
      ];
    }),
  ) as CardOffsets;
}

export function clampCardOffsetPoint(offset: CardOffset): CardOffset {
  return { x: clampCardOffset(offset.x), y: clampCardOffset(offset.y) };
}

export function clampCardOffset(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  // Counted in steps rather than added to, so an offset stays a round number
  // and comes back out of storage as the one that went in.
  const steps = Math.round(value / CARD_OFFSET_STEP);
  return Math.min(
    MAX_CARD_OFFSET,
    Math.max(
      -MAX_CARD_OFFSET,
      Number((steps * CARD_OFFSET_STEP).toFixed(3)),
    ),
  );
}

// Read as "right and down": a part at rest says nothing rather than "0%, 0%".
export function formatCardOffset({ x, y }: CardOffset): string {
  if (x === 0 && y === 0) return "Default";
  return `${formatOffsetShare(x)}, ${formatOffsetShare(y)}`;
}

function formatOffsetShare(value: number): string {
  const percent = Math.round(value * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
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
// How large each part is drawn, as the part itself is named: what a pinch on
// it sets. A part asked for the width of the screen has no multiple of its own
// — pinching it leaves that behind, at the largest multiple there is, the way
// stepping it always has.
export type CardPartScales = Readonly<Record<CardPart, number>>;

export function cardPartScales(
  scales: CardScales,
  deckSettings: DeckCardSettings,
): CardPartScales {
  const drawn = (scale: CardScale): number =>
    scale === SCREEN_WIDTH ? MAX_CARD_SCALE : scale;
  return {
    text: deckSettings.text,
    staff: deckSettings.staff,
    keyboard: drawn(scales.keyboard),
    board: drawn(scales.board),
  };
}

// Set on the card document itself rather than written into its stylesheet: a
// part being dragged moves with the finger, and rebuilding the document under
// it would reload the card on every frame.
//
// A share of the card's own width and height, which inside the card's frame is
// what vw and vh measure — so a card turned on its side moves its parts along
// its own edges rather than the screen's.
export function cardLiveVariables(
  scales: CardScales,
  deckSettings: DeckCardSettings,
): Readonly<Record<string, string>> {
  return {
    ...Object.fromEntries(
      CARD_PARTS.flatMap((part) => [
        [`--${part}-x`, `${round(deckSettings.offsets[part].x * 100)}vw`],
        [`--${part}-y`, `${round(deckSettings.offsets[part].y * 100)}vh`],
      ]),
    ),
    "--text-scale": String(deckSettings.text),
    "--staff-scale": String(deckSettings.staff),
    "--answer-scale": String(scales.answer),
    ...(scales.board === SCREEN_WIDTH
      ? { "--board-width": "100vw" }
      : { "--board-scale": String(scales.board) }),
    // A width, when one is asked for, rather than a multiple of the width the
    // deck would have chosen. Left out rather than set to nothing when it is
    // not asked for: the deck's own fallback is what should apply then.
    ...(scales.keyboard === SCREEN_WIDTH
      ? { "--keyboard-width": "100vw" }
      : { "--keyboard-scale": String(scales.keyboard) }),
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function formatCardScale(scale: CardScale): string {
  return scale === SCREEN_WIDTH
    ? "Screen width"
    : `${Math.round(scale * 100)}%`;
}
