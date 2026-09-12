// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  stablePackageGuid,
  writePackage,
  type PackageMedia,
  type PackageNote,
} from "@web-music/anki-apkg/package";

import { BOARD_COLUMNS, labelPosition, renderBoardSvg } from "./board";
import {
  GUITAR_INTERVAL_CARDS,
  MAX_FRET_REACH,
  STRING_COUNT,
  formatOffset,
  type GuitarIntervalCard,
} from "./cards";
import { PACKAGE_SPEC, ROOT_DECK_ID } from "./package-spec";
import { learningOrderGroup } from "./learning-order";

const PACKAGE_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const DEFAULT_OUTPUT_PATH = resolve(
  PACKAGE_DIRECTORY,
  "dist/guitar-intervals.apkg",
);

export type DeckArtifacts = Readonly<{
  notes: readonly PackageNote[];
  media: readonly PackageMedia[];
}>;

// Every card draws the same strings and frets, so the package carries one
// drawing and each note only says what to write on it.
export const BOARD_SVG = renderBoardSvg();
export const BOARD_FILENAME = `guitar-intervals-board-${digest(BOARD_SVG)}.svg`;

export function createDeckArtifacts(): DeckArtifacts {
  return {
    notes: createNotes(),
    media: [{ filename: BOARD_FILENAME, content: BOARD_SVG }],
  };
}

export function createDeckNotes(): readonly PackageNote[] {
  return createDeckArtifacts().notes;
}

function createNotes(): readonly PackageNote[] {
  return GUITAR_INTERVAL_CARDS.map((card) => {
    const answer = card.names.join(" ");
    return {
      id: card.id,
      guid: stablePackageGuid(PACKAGE_SPEC.namespace, card.id),
      deckId: ROOT_DECK_ID,
      fields: [
        card.id,
        "guitar-interval",
        String(card.rootString),
        String(card.targetString),
        String(card.fretOffset),
        answer,
        renderBoard(card, "?", "cue"),
        renderBoard(card, answer, "answer"),
      ],
      tags: [
        "axis::guitar-interval",
        `root-string::${card.rootString}`,
        `target-string::${card.targetString}`,
        `fret-offset::${formatOffset(card.fretOffset)}`,
        `degree::${card.names[0]}`,
        `learning-level::${learningOrderGroup(card) + 1}`,
      ],
      orderGroup: learningOrderGroup(card),
    };
  });
}

function renderBoard(
  card: GuitarIntervalCard,
  text: string,
  kind: "cue" | "answer",
): string {
  const root = labelPosition(card.rootString, 0);
  const target = labelPosition(card.targetString, card.fretOffset);
  return [
    '<span class="fret-window">',
    // The board's own shape, so the app can tell which cell a finger landed on
    // and play it: the drawing is one image, and an image has no cells to
    // take a tap. The origin says which column the root's own fret is.
    `<span class="fret-window-board" data-strings="${STRING_COUNT}"`,
    ` data-frets="${BOARD_COLUMNS}" data-fret-origin="${MAX_FRET_REACH}">`,
    `<img src="${BOARD_FILENAME}" alt="">`,
    label("root", "1", root),
    label(kind, text, target),
    ...(kind === "answer" ? referenceLabels(card) : []),
    "</span></span>",
  ].join("");
}

const ALTERED_REFERENCES: Readonly<Record<string, readonly [string, number]>> = {
  d5: ["P5", 1], d7: ["m7", 1], A4: ["P4", -1], A5: ["P5", -1],
  "♭9": ["9", 1], "♯9": ["9", -1], "♯11": ["11", -1], "♭13": ["13", 1],
};

function referenceLabels(card: GuitarIntervalCard): string[] {
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
    label("reference", names.join(" "), labelPosition(card.targetString, offset)),
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

export async function generateAnkiDeck(
  outputPath = DEFAULT_OUTPUT_PATH,
): Promise<
  Readonly<{ deckCount: number; noteCount: number; mediaCount: number }>
> {
  const artifacts = createDeckArtifacts();
  await writePackage(
    outputPath,
    PACKAGE_SPEC,
    artifacts.notes,
    artifacts.media,
  );
  return {
    deckCount: PACKAGE_SPEC.decks.length,
    noteCount: artifacts.notes.length,
    mediaCount: artifacts.media.length,
  };
}

function percent(fraction: number): string {
  return `${Math.round(fraction * 10000) / 100}%`;
}

function digest(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}
