// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The deck's notes and the document the web app imports, for any instrument.
// Nothing from node here: the app generates the deck for the reader's own
// tuning, and generate.ts writes the Anki package from the same notes.

import {
  createWebPackage,
  mediaDigest,
  stablePackageGuid,
  type PackageMedia,
  type PackageNote,
  type WebPackage,
} from "@web-music/anki-apkg/web-package";

import { BOARD_COLUMNS, labelPosition, renderBoardSvg } from "./board";
import {
  MAX_FRET_REACH,
  STANDARD_TUNING,
  formatOffset,
  guitarIntervalCards,
  type GuitarIntervalCard,
  type Tuning,
} from "./cards";
import { ROOT_DECK_ID, packageNamespace, packageSpec } from "./package-spec";
import { difficultyLevels } from "./learning-order";

export type DeckArtifacts = Readonly<{
  notes: readonly PackageNote[];
  media: readonly PackageMedia[];
}>;

// Every card draws the same strings and frets, so the package carries one
// drawing and each note only says what to write on it.
export function boardMedia(tuning: Tuning = STANDARD_TUNING): PackageMedia {
  const content = renderBoardSvg(tuning.length);
  return { filename: `guitar-intervals-board-${mediaDigest(content)}.svg`, content };
}

export function createDeckArtifacts(tuning: Tuning = STANDARD_TUNING): DeckArtifacts {
  return {
    notes: createDeckNotes(tuning),
    media: [boardMedia(tuning)],
  };
}

export function createWebDeck(tuning: Tuning = STANDARD_TUNING): WebPackage {
  const artifacts = createDeckArtifacts(tuning);
  return createWebPackage(packageSpec(tuning), artifacts.notes, artifacts.media);
}

export function createDeckNotes(tuning: Tuning = STANDARD_TUNING): readonly PackageNote[] {
  const cards = guitarIntervalCards(tuning);
  const levels = difficultyLevels(cards, tuning);
  const namespace = packageNamespace(tuning);
  const board = boardMedia(tuning).filename;
  return cards.map((card) => {
    const answer = card.names.join(" ");
    return {
      id: card.id,
      guid: stablePackageGuid(namespace, card.id),
      deckId: ROOT_DECK_ID,
      fields: [
        card.id,
        "guitar-interval",
        String(card.rootString),
        String(card.targetString),
        String(card.fretOffset),
        answer,
        renderBoard(card, "?", "cue", tuning, board),
        renderBoard(card, answer, "answer", tuning, board),
        tuning.join(" "),
      ],
      tags: [
        "axis::guitar-interval",
        `root-string::${card.rootString}`,
        `target-string::${card.targetString}`,
        `fret-offset::${formatOffset(card.fretOffset)}`,
        `degree::${card.names[0]}`,
        `learning-level::${levels.get(card.id)}`,
      ],
      orderGroup: levels.get(card.id)! - 1,
    };
  });
}

function renderBoard(
  card: GuitarIntervalCard,
  text: string,
  kind: "cue" | "answer",
  tuning: Tuning,
  boardFilename: string,
): string {
  const strings = tuning.length;
  const root = labelPosition(card.rootString, 0, strings);
  const target = labelPosition(card.targetString, card.fretOffset, strings);
  return [
    '<span class="fret-window">',
    // The board's own shape, so the app can tell which cell a finger landed on
    // and play it: the drawing is one image, and an image has no cells to
    // take a tap. The origin says which column the root's own fret is.
    `<span class="fret-window-board" data-strings="${strings}"`,
    ` data-frets="${BOARD_COLUMNS}" data-fret-origin="${MAX_FRET_REACH}">`,
    `<img src="${boardFilename}" alt="">`,
    label("root", "1", root),
    label(kind, text, target),
    ...(kind === "answer" ? referenceLabels(card, strings) : []),
    "</span></span>",
  ].join("");
}

const ALTERED_REFERENCES: Readonly<Record<string, readonly [string, number]>> = {
  d5: ["P5", 1], d7: ["m7", 1], A4: ["P4", -1], A5: ["P5", -1],
  "♭9": ["9", 1], "♯9": ["9", -1], "♯11": ["11", -1], "♭13": ["13", 1],
};

function referenceLabels(card: GuitarIntervalCard, strings: number): string[] {
  const byOffset = new Map<number, string[]>();
  for (const name of card.names) {
    const reference = ALTERED_REFERENCES[name];
    if (!reference) continue;
    const [text, delta] = reference;
    const offset = card.fretOffset + delta;
    // The reference belongs to a physical neighboring position; never wrap
    // it onto the opposite end of the neck drawing.
    if (Math.abs(offset) > MAX_FRET_REACH) continue;
    byOffset.set(offset, [...(byOffset.get(offset) ?? []), text]);
  }
  return [...byOffset].sort(([a], [b]) => a - b).map(([offset, names]) =>
    label("reference", names.join(" "), labelPosition(card.targetString, offset, strings)),
  );
}

function label(
  kind: string,
  text: string,
  { x, y }: { x: number; y: number },
): string {
  return [
    `<span class="fret-name ${kind}"`,
    ` style="--fret-x:${percent(x)};--fret-y:${percent(y)}">`,
    `${text}</span>`,
  ].join("");
}

function percent(fraction: number): string {
  return `${Math.round(fraction * 10000) / 100}%`;
}
