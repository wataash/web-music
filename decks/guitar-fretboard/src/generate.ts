// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FLATS_DECK_ID,
  inspectAnkiPackage,
  NATURALS_DECK_ID,
  NOTE_TO_POSITIONS_FLATS_DECK_ID,
  NOTE_TO_POSITIONS_NATURALS_DECK_ID,
  NOTE_TO_POSITIONS_SHARPS_DECK_ID,
  SHARPS_DECK_ID,
  stableNoteGuid,
  writeAnkiPackage,
  type AnkiPackageSummary,
  type MediaFile,
  type PackageNote,
} from "./apkg";
import {
  CARDS,
  type FretboardCard,
} from "./cards";
import { renderFretboardSvg } from "./fretboard";

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

export function createDeckArtifacts(): DeckArtifacts {
  const media: MediaFile[] = [];

  const notes = CARDS.map((card) => {
    const frontSvg =
      card.kind === "position-to-note"
        ? renderFretboardSvg({
            string: card.string,
            fret: card.fret,
            cue:
              card.system === "naturals"
                ? undefined
                : card.system === "flats"
                  ? "♭"
                  : "♯",
          })
        : renderFretboardSvg({
            highlightedString: card.string,
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
          })
        : renderFretboardSvg({
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
    );
  });

  return { notes, media };
}

export function createWebDeckArtifacts(): DeckArtifacts {
  return {
    notes: CARDS.map((card) => createPackageNote(card, "", "")),
    media: [],
  };
}

export async function generateAnkiDeck(
  outputPath = DEFAULT_OUTPUT_PATH,
): Promise<AnkiPackageSummary> {
  const artifacts = createDeckArtifacts();
  await writeAnkiPackage({
    outputPath,
    notes: artifacts.notes,
    media: artifacts.media,
  });
  return inspectAnkiPackage(outputPath);
}

function createPackageNote(
  card: FretboardCard,
  frontImage: string,
  backImage: string,
): PackageNote {
  return {
    id: card.id,
    guid: stableNoteGuid(card.id),
    deckId: deckIdForCard(card),
    fields: [
      card.id,
      card.system,
      String(card.string),
      card.kind === "position-to-note" ? String(card.fret) : "",
      card.note,
      frontImage,
      backImage,
      card.kind === "note-to-positions" ? formatPositions(card) : "",
    ],
    tags: [card.tag, `direction::${card.kind}`],
  };
}

function deckIdForCard(card: FretboardCard): number {
  if (card.kind === "position-to-note") {
    if (card.system === "naturals") return NATURALS_DECK_ID;
    return card.system === "flats" ? FLATS_DECK_ID : SHARPS_DECK_ID;
  }
  if (card.system === "naturals") {
    return NOTE_TO_POSITIONS_NATURALS_DECK_ID;
  }
  return card.system === "flats"
    ? NOTE_TO_POSITIONS_FLATS_DECK_ID
    : NOTE_TO_POSITIONS_SHARPS_DECK_ID;
}

function formatPositions(
  card: Extract<FretboardCard, { kind: "note-to-positions" }>,
): string {
  return card.frets.map((fret) => `${card.string}-${fret}`).join(" ");
}

function imageField(filename: string): string {
  return `<img src="${filename}" alt="">`;
}

function mediaFilename(name: string, content: string): string {
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return `guitar-fretboard-${name}-${digest}.svg`;
}
