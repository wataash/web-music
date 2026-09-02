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

import { labelPosition, renderBoardSvg } from "./board";
import {
  GUITAR_INTERVAL_CARDS,
  formatOffset,
  type GuitarIntervalCard,
} from "./cards";
import { PACKAGE_SPEC, ROOT_DECK_ID } from "./package-spec";

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
      ],
      // No order group: introducing the nearest frets first meant the first
      // thirty cards all sat in the root's own fret, one string away and
      // straight above it, and a shape that never changes is a shape that
      // gives the answer away. One stable shuffle over the lot instead.
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
    '<span class="fret-window"><span class="fret-window-board">',
    `<img src="${BOARD_FILENAME}" alt="">`,
    label("root", "1", root),
    label(kind, text, target),
    "</span></span>",
  ].join("");
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
