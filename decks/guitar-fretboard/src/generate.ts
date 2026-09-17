// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectAnkiPackage,
  writeAnkiPackage,
  type AnkiPackageSummary,
  type MediaFile,
  type PackageNote,
} from "./apkg";
import { STANDARD_TUNING, fretboardCards, type Tuning } from "./cards";
import { QUESTION_CUE, renderFretboardSvg } from "./fretboard";
import { createPackageNote, formatPositions } from "./web-deck";

export { createDeckNotes, createWebDeck } from "./web-deck";

const PACKAGE_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const DEFAULT_OUTPUT_PATH = resolve(
  PACKAGE_DIRECTORY,
  "dist/guitar-fretboard-notes.apkg",
);

export type DeckArtifacts = Readonly<{
  notes: readonly PackageNote[];
  media: readonly MediaFile[];
}>;

export function createDeckArtifacts(tuning: Tuning = STANDARD_TUNING): DeckArtifacts {
  const media: MediaFile[] = [];
  const stringCount = tuning.length;

  const notes = fretboardCards(tuning).map((card) => {
    const frontSvg =
      card.kind === "position-to-note"
        ? renderFretboardSvg({
            string: card.string,
            fret: card.fret,
            cue: QUESTION_CUE,
            stringCount,
          })
        : renderFretboardSvg({
            highlightedString: card.string,
            stringCount,
            title: `${card.note} positions on string ${card.string}`,
            description: `A guitar fretboard with string ${card.string} highlighted, asking for every ${card.note} position.`,
          });
    const frontFilename = mediaFilename(`${card.id}-front`, frontSvg);
    const backSvg =
      card.kind === "position-to-note"
        ? renderFretboardSvg({
            string: card.string,
            fret: card.fret,
            note: card.note,
            stringCount,
          })
        : renderFretboardSvg({
            stringCount,
            targets: card.frets.map((fret) => ({
              string: card.string,
              fret,
              label: card.note,
              labelKind: "answer",
            })),
            title: `${card.note} positions on string ${card.string}`,
            description: `The note ${card.note} appears at ${formatPositions(card)} on string ${card.string}.`,
          });
    const backFilename = mediaFilename(`${card.id}-back`, backSvg);
    media.push(
      { filename: frontFilename, content: frontSvg },
      { filename: backFilename, content: backSvg },
    );

    return createPackageNote(
      card,
      imageField(frontFilename),
      imageField(backFilename),
      tuning,
    );
  });

  return { notes, media };
}

export async function generateAnkiDeck(
  outputPath = DEFAULT_OUTPUT_PATH,
  tuning: Tuning = STANDARD_TUNING,
): Promise<AnkiPackageSummary> {
  const artifacts = createDeckArtifacts(tuning);
  await writeAnkiPackage({
    outputPath,
    notes: artifacts.notes,
    media: artifacts.media,
    tuning,
  });
  return inspectAnkiPackage(outputPath);
}

function imageField(filename: string): string {
  return `<img src="${filename}" alt="">`;
}

function mediaFilename(name: string, content: string): string {
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return `guitar-fretboard-${name}-${digest}.svg`;
}
