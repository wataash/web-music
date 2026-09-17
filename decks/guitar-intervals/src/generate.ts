// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writePackage } from "@web-music/anki-apkg/package";

import { STANDARD_TUNING, type Tuning } from "./cards";
import { packageSpec } from "./package-spec";
import { boardMedia, createDeckArtifacts } from "./web-deck";

export {
  boardMedia,
  createDeckArtifacts,
  createDeckNotes,
  createWebDeck,
  type DeckArtifacts,
} from "./web-deck";

const PACKAGE_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const DEFAULT_OUTPUT_PATH = resolve(
  PACKAGE_DIRECTORY,
  "dist/guitar-intervals.apkg",
);

export const BOARD_SVG = boardMedia().content as string;
export const BOARD_FILENAME = boardMedia().filename;

export async function generateAnkiDeck(
  outputPath = DEFAULT_OUTPUT_PATH,
  tuning: Tuning = STANDARD_TUNING,
): Promise<
  Readonly<{ deckCount: number; noteCount: number; mediaCount: number }>
> {
  const spec = packageSpec(tuning);
  const artifacts = createDeckArtifacts(tuning);
  await writePackage(
    outputPath,
    spec,
    artifacts.notes,
    artifacts.media,
  );
  return {
    deckCount: spec.decks.length,
    noteCount: artifacts.notes.length,
    mediaCount: artifacts.media.length,
  };
}
