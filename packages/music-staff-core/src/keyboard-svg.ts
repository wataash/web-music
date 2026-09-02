// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Draws a piano keyboard with some of its keys marked. The staff decks mark
// one key, always a white one, because every note they ask about is a natural;
// the black keys are drawn because their 2-3 grouping is what tells one white
// key from another. The intervals deck marks two keys, either of which may be
// black, and the distance between them is the picture.
//
// A deck that asks with octave numbers needs to say where in a piano the note
// falls, which no stretch of a few octaves can do: a clef spans 4.7 of them.
// That layout draws the whole 88-key piano instead, across the width of the
// screen. One key of 52 is far too narrow to hold a name, so the name is
// written across the keys around it instead — big enough to read, which is
// about three keys wide.

import {
  diatonicIndex,
  formatPitch,
  NATURAL_SEMITONES,
  parsePitch,
  pitchAtDiatonicIndex,
  type Pitch,
} from "./model";

export type KeyboardPalette = Readonly<{
  // null leaves the keyboard transparent, for a page that has its own
  // background.
  background: string | null;
  whiteKey: string;
  blackKey: string;
  outline: string;
  highlight: string;
  // The key a card gives you, as opposed to the one it asks for.
  given: string;
}>;

export type KeyboardGeometry = Readonly<{
  width: number;
  // A white key is about 145mm long and 23.5mm wide, so a board is only as
  // tall as its keys are wide. Without that a keyboard of many octaves drawn
  // to the height of a single one is a bed of nails.
  whiteKeyAspect: number;
  maxWhiteKeyHeight: number;
  blackKeyWidthRatio: number;
  blackKeyHeightRatio: number;
  outlineWidth: number;
  cornerRadius: number;
  padding: number;
  labelFontSize: number;
  // How many keys wide the name may be. One key holds it on a single octave;
  // on an 88-key piano it is written across its neighbours.
  pianoLabelKeySpan: number;
  // 52 keys need more room than one octave does, so the piano layout is drawn
  // on a canvas this many times wider.
  pianoWidthScale: number;
  palette: KeyboardPalette;
}>;

export const CARD_KEYBOARD_GEOMETRY = {
  width: 260,
  whiteKeyAspect: 145 / 23.5,
  // A single octave across the card would be taller than the staff at that
  // aspect, so it stops here and only looks like a keyboard rather than
  // measuring like one.
  maxWhiteKeyHeight: 96,
  blackKeyWidthRatio: 0.58,
  blackKeyHeightRatio: 0.62,
  outlineWidth: 2,
  cornerRadius: 3,
  padding: 11,
  labelFontSize: 17,
  pianoLabelKeySpan: 3,
  pianoWidthScale: 3,
  palette: {
    background: "#111827",
    whiteKey: "#e5e7eb",
    blackKey: "#111827",
    outline: "#4b5563",
    // Answers use the same yellow as written answers throughout the decks.
    highlight: "#fcd34d",
    // Blue distinguishes the key handed to you from the one you are after.
    given: "#8ab4f8",
  },
} as const satisfies KeyboardGeometry;

export type KeyboardLayout = "octave" | "piano";

// A key of the board: the white key at a staff position, or the black key
// immediately above it. Naming a black key after the white one below it avoids
// choosing between its two spellings, which the drawing has no opinion on.
export type KeyboardKey = Readonly<{ index: number; black: boolean }>;

// "answer" is what the card asks for, "given" what it hands you.
export type KeyboardTone = "answer" | "given";

export type KeyboardMark = Readonly<{ key: KeyboardKey; tone?: KeyboardTone }>;

// The stretch of white keys a board draws, as staff positions.
export type KeyboardRange = Readonly<{ firstIndex: number; keyCount: number }>;

export type KeyboardSvgInput = Readonly<{
  pitch: string;
  // "octave" draws the octave the note is in, and nothing else. "piano" puts
  // the whole 88-key keyboard above it, to say where that octave sits.
  layout?: KeyboardLayout;
  // false draws the same keyboard with nothing marked on it, for the question
  // side of a card whose answer is the key. The frame and the height are the
  // same either way, so revealing the answer does not move the card around.
  highlighted?: boolean;
  geometry?: KeyboardGeometry;
  decorative?: boolean;
}>;

export type KeyboardRangeSvgInput = Readonly<{
  range: KeyboardRange;
  // The canvas the range is drawn on. Wider keys or more of them is the
  // caller's choice: an octave under a staff wants keys you can name, a whole
  // piano wants to fit.
  width: number;
  marks?: readonly KeyboardMark[];
  geometry?: KeyboardGeometry;
  decorative?: boolean;
  title?: string;
  description?: string;
}>;

// A black key follows each of these white keys.
const BLACK_KEY_AFTER: readonly string[] = ["C", "D", "F", "G", "A"];

// An 88-key piano runs A0 to C8: 52 white keys.
const PIANO_LOWEST: Pitch = { note: "A", octave: 0 };
const PIANO_HIGHEST: Pitch = { note: "C", octave: 8 };
const PIANO_WHITE_KEYS =
  diatonicIndex(PIANO_HIGHEST) - diatonicIndex(PIANO_LOWEST) + 1;

const OCTAVE_WHITE_KEYS = 7;

type Tier = Readonly<{ markup: string; height: number }>;

// Which key sounds a given semitone (MIDI numbering, middle C is 60).
export function keyAtSemitone(semitone: number): KeyboardKey {
  const octave = Math.floor(semitone / 12) - 1;
  const within = semitone - (octave + 1) * 12;
  const white = NATURAL_SEMITONES.indexOf(within);
  if (white >= 0) return { index: octave * 7 + white, black: false };
  return {
    index: octave * 7 + NATURAL_SEMITONES.indexOf(within - 1),
    black: true,
  };
}

// One white key to spare at each end, so a marked key is never against the edge
// of the board.
const MARGIN_KEYS = 1;

// The narrowest board that holds every key, plus that margin. A black key sits
// between two white ones, so both of them have to be there for it to be drawn
// at all.
export function keyboardRangeFor(keys: readonly KeyboardKey[]): KeyboardRange {
  if (keys.length === 0) throw new RangeError("a keyboard needs a key");
  const lowest = Math.min(...keys.map(({ index }) => index)) - MARGIN_KEYS;
  const highest =
    Math.max(...keys.map(({ index, black }) => index + (black ? 1 : 0))) +
    MARGIN_KEYS;
  return { firstIndex: lowest, keyCount: highest - lowest + 1 };
}

// A canvas whose keys are as wide as the ones under a staff, however many of
// them there are.
export function keyboardWidthForKeys(
  keyCount: number,
  geometry: KeyboardGeometry = CARD_KEYBOARD_GEOMETRY,
): number {
  const whiteKeyWidth =
    (geometry.width - 2 * geometry.padding) / OCTAVE_WHITE_KEYS;
  return 2 * geometry.padding + keyCount * whiteKeyWidth;
}

export function renderKeyboardSvg({
  pitch,
  layout = "octave",
  highlighted = true,
  geometry = CARD_KEYBOARD_GEOMETRY,
  decorative = false,
}: KeyboardSvgInput): string {
  const parsed = parsePitch(pitch);
  const { range, width } = layoutBoard(parsed, layout, geometry);
  return renderKeyboardRangeSvg({
    range,
    width,
    marks: highlighted
      ? [{ key: { index: diatonicIndex(parsed), black: false } }]
      : [],
    geometry,
    decorative,
    title: highlighted
      ? `${formatPitch(parsed)} on a piano keyboard`
      : "Piano keyboard",
    description: describe(parsed, layout, highlighted),
  });
}

export function renderKeyboardRangeSvg({
  range,
  width,
  marks = [],
  geometry = CARD_KEYBOARD_GEOMETRY,
  decorative = false,
  title = "Piano keyboard",
  description = "A piano keyboard.",
}: KeyboardRangeSvgInput): string {
  const tier = keyboardTier({
    geometry,
    range,
    marks,
    width,
    y: geometry.padding,
  });
  const height = 2 * geometry.padding + tier.height;

  const background =
    geometry.palette.background === null
      ? ""
      : `<rect x="0" y="0" width="${round(width)}" height="${round(height)}" fill="${geometry.palette.background}"/>`;
  const accessibility = decorative
    ? 'role="presentation" aria-hidden="true"'
    : 'role="img" aria-labelledby="title description"';
  const labels = decorative
    ? ""
    : [
        `<title id="title">${escapeXml(title)}</title>`,
        `<desc id="description">${escapeXml(description)}</desc>`,
      ].join("");

  return [
    `<svg class="keyboard" xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="0 0 ${round(width)} ${round(height)}" ${accessibility}>`,
    labels,
    `<style>${keyboardStyles(geometry)}</style>`,
    background,
    tier.markup,
    "</svg>",
  ].join("");
}

// Where a name belongs on the drawing, as fractions of the image: centred on
// its key, low on the white keys and higher on the short black ones, and about
// as wide as `keySpan` keys. The name itself is written by the card rather than
// drawn into the image, so it can be sized without redrawing the keyboard.
export function keyboardKeyPlacement({
  key,
  range,
  width,
  labelLength = 2,
  keySpan = 1,
  geometry = CARD_KEYBOARD_GEOMETRY,
}: Readonly<{
  key: KeyboardKey;
  range: KeyboardRange;
  width: number;
  labelLength?: number;
  keySpan?: number;
  geometry?: KeyboardGeometry;
}>): Readonly<{ x: number; y: number; size: number }> {
  const whiteKeyWidth = (width - 2 * geometry.padding) / range.keyCount;
  const whiteKeyHeight = Math.min(
    geometry.maxWhiteKeyHeight,
    whiteKeyWidth * geometry.whiteKeyAspect,
  );
  const height = whiteKeyHeight + 2 * geometry.padding;
  const size = Math.min(
    geometry.labelFontSize * keySpan,
    (keySpan * whiteKeyWidth * 1.5) / Math.max(1, labelLength),
  );
  const halfWidth = (size * 0.6 * labelLength) / 2;
  // A black key is centred on the line between two white ones.
  const center =
    geometry.padding +
    (key.index - range.firstIndex + (key.black ? 1 : 0.5)) * whiteKeyWidth;
  // Names on the black keys sit higher, both because the keys are shorter and
  // so that two names on neighbouring keys do not land on each other.
  const depth = key.black ? geometry.blackKeyHeightRatio * 0.78 : 0.86;
  return {
    x:
      clamp(
        center,
        geometry.padding + halfWidth,
        width - geometry.padding - halfWidth,
      ) / width,
    y: (geometry.padding + whiteKeyHeight * depth) / height,
    size: size / width,
  };
}

export function keyboardLabelPlacement({
  pitch,
  layout = "octave",
  labelLength = 2,
  geometry = CARD_KEYBOARD_GEOMETRY,
}: Readonly<{
  pitch: string;
  layout?: KeyboardLayout;
  labelLength?: number;
  geometry?: KeyboardGeometry;
}>): Readonly<{ x: number; y: number; size: number }> {
  const parsed = parsePitch(pitch);
  const { range, width } = layoutBoard(parsed, layout, geometry);
  return keyboardKeyPlacement({
    key: { index: diatonicIndex(parsed), black: false },
    range,
    width,
    labelLength,
    keySpan: layout === "piano" ? geometry.pianoLabelKeySpan : 1,
    geometry,
  });
}

function layoutBoard(
  pitch: Pitch,
  layout: KeyboardLayout,
  geometry: KeyboardGeometry,
): Readonly<{ range: KeyboardRange; width: number }> {
  const piano = layout === "piano";
  return {
    range: {
      firstIndex: diatonicIndex(
        piano ? PIANO_LOWEST : { note: "C", octave: pitch.octave },
      ),
      keyCount: piano ? PIANO_WHITE_KEYS : OCTAVE_WHITE_KEYS,
    },
    width: piano ? geometry.width * geometry.pianoWidthScale : geometry.width,
  };
}

function keyboardTier({
  geometry,
  range,
  marks,
  width,
  y,
}: Readonly<{
  geometry: KeyboardGeometry;
  range: KeyboardRange;
  marks: readonly KeyboardMark[];
  width: number;
  y: number;
}>): Tier {
  const whiteKeyWidth = (width - 2 * geometry.padding) / range.keyCount;
  const whiteKeyHeight = Math.min(
    geometry.maxWhiteKeyHeight,
    whiteKeyWidth * geometry.whiteKeyAspect,
  );
  const blackKeyWidth = whiteKeyWidth * geometry.blackKeyWidthRatio;
  const blackKeyHeight = whiteKeyHeight * geometry.blackKeyHeightRatio;
  const toneByKey = new Map(
    marks.map(({ key, tone = "answer" }) => [keyId(key), tone]),
  );
  const modifier = (key: KeyboardKey): string => {
    const tone = toneByKey.get(keyId(key));
    if (tone === undefined) return "";
    return tone === "given" ? " is-given" : " is-highlighted";
  };
  const keyX = (index: number): number =>
    geometry.padding + index * whiteKeyWidth;
  const keyPitch = (index: number): Pitch =>
    pitchAtDiatonicIndex(range.firstIndex + index);

  const whiteKeys = Array.from({ length: range.keyCount }, (_, index) => {
    const key = { index: range.firstIndex + index, black: false };
    return [
      `<rect class="keyboard__white-key${modifier(key)}"`,
      ` data-note="${formatPitch(keyPitch(index))}" x="${round(keyX(index))}"`,
      ` y="${round(y)}" width="${round(whiteKeyWidth)}"`,
      ` height="${round(whiteKeyHeight)}" rx="${geometry.cornerRadius}"/>`,
    ].join("");
  }).join("");
  const blackKeys = Array.from(
    { length: range.keyCount - 1 },
    (_, index) => index,
  )
    .filter((index) => BLACK_KEY_AFTER.includes(keyPitch(index).note))
    .map((index) => {
      const below = keyPitch(index);
      const key = { index: range.firstIndex + index, black: true };
      const x = keyX(index + 1) - blackKeyWidth / 2;
      return [
        `<rect class="keyboard__black-key${modifier(key)}"`,
        ` data-key="${below.note}#${below.octave}" x="${round(x)}"`,
        ` y="${round(y)}" width="${round(blackKeyWidth)}"`,
        ` height="${round(blackKeyHeight)}" rx="${geometry.cornerRadius}"/>`,
      ].join("");
    })
    .join("");
  return {
    markup: `<g class="keyboard__keys">${whiteKeys}${blackKeys}</g>`,
    height: whiteKeyHeight,
  };
}

function keyId({ index, black }: KeyboardKey): string {
  return `${index}${black ? "#" : ""}`;
}

function describe(
  pitch: Pitch,
  layout: KeyboardLayout,
  highlighted: boolean,
): string {
  const board =
    layout === "piano"
      ? "An 88-key piano"
      : `The octave ${formatPitch(pitch).slice(-1)}`;
  const where = highlighted
    ? `with the ${formatPitch(pitch)} key highlighted`
    : "with no key marked";
  return `${board} ${where}.`;
}

function keyboardStyles(geometry: KeyboardGeometry): string {
  const { palette } = geometry;
  return [
    `.keyboard__white-key{fill:${palette.whiteKey};stroke:${palette.outline};stroke-width:${geometry.outlineWidth}}`,
    `.keyboard__black-key{fill:${palette.blackKey};stroke:${palette.outline};stroke-width:${geometry.outlineWidth}}`,
    `.keyboard__white-key.is-highlighted,.keyboard__black-key.is-highlighted{fill:${palette.highlight}}`,
    `.keyboard__white-key.is-given,.keyboard__black-key.is-given{fill:${palette.given}}`,
  ].join("");
}

function clamp(value: number, lowest: number, highest: number): number {
  return Math.min(Math.max(value, lowest), highest);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
