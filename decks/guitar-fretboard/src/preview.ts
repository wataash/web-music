// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  NOTE_TO_POSITIONS_CARDS,
  POSITION_TO_NOTE_CARDS,
  type NoteSystem,
} from "./cards";
import { renderFretboardSvg } from "./fretboard";

const PACKAGE_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const DEFAULT_PREVIEW_DIRECTORY = resolve(
  PACKAGE_DIRECTORY,
  "dist/preview",
);

export type PreviewOptions = Readonly<{
  outputDirectory?: string;
  kind?: "position" | "note";
  system?: NoteSystem;
  string?: number;
  fret?: number;
  note?: string;
}>;

export type PreviewSummary = Readonly<{
  frontPath: string;
  backPath: string;
  note: string;
}>;

export async function writeFretboardPreview({
  outputDirectory = DEFAULT_PREVIEW_DIRECTORY,
  kind = "position",
  system = "flats",
  string = 3,
  fret = 5,
  note = "C",
}: PreviewOptions = {}): Promise<PreviewSummary> {
  const normalizedNote = normalizeNoteName(note);
  const card =
    kind === "position"
      ? POSITION_TO_NOTE_CARDS.find(
          (candidate) =>
            candidate.system === system &&
            candidate.string === string &&
            candidate.fret === fret,
        )
      : NOTE_TO_POSITIONS_CARDS.find(
          (candidate) =>
            candidate.system === system &&
            candidate.string === string &&
            candidate.note === normalizedNote,
        );
  if (!card) {
    if (kind === "position") {
      throw new RangeError(
        `preview position must belong to naturals, flats, or sharps and use string 1-6 and fret 0-24`,
      );
    }
    throw new RangeError(
      `preview note must belong to the selected system and use string 1-6`,
    );
  }

  const resolvedDirectory = resolve(outputDirectory);
  const basename =
    card.kind === "position-to-note"
      ? `${system}-string-${string}-fret-${fret}`
      : `${system}-string-${string}-note-${noteFilenamePart(card.note)}`;
  const frontPath = join(resolvedDirectory, `${basename}-front.svg`);
  const backPath = join(resolvedDirectory, `${basename}-back.svg`);
  const frontSvg =
    card.kind === "position-to-note"
      ? renderFretboardSvg({
          string,
          fret,
          cue:
            system === "naturals"
              ? undefined
              : system === "flats"
                ? "♭"
                : "♯",
        })
      : renderFretboardSvg({
          highlightedString: string,
          title: `${card.note} positions on string ${string}`,
          description: `A guitar fretboard with string ${string} highlighted, asking for every ${card.note} position.`,
        });
  const backSvg =
    card.kind === "position-to-note"
      ? renderFretboardSvg({
          string,
          fret,
          note: card.note,
        })
      : renderFretboardSvg({
          targets: card.frets.map((targetFret) => ({
            string,
            fret: targetFret,
            label: card.note,
            labelKind: "answer",
          })),
          title: `${card.note} positions on string ${string}`,
          description: `The note ${card.note} appears at ${card.frets.map((targetFret) => `${string}-${targetFret}`).join(" ")} on string ${string}.`,
        });

  await mkdir(resolvedDirectory, { recursive: true });
  await Promise.all([
    writeFile(frontPath, frontSvg, "utf8"),
    writeFile(backPath, backSvg, "utf8"),
  ]);

  return { frontPath, backPath, note: card.note };
}

export function normalizeNoteName(note: string): string {
  return note.replaceAll("b", "♭").replaceAll("#", "♯");
}

function noteFilenamePart(note: string): string {
  return note.replace("♭", "-flat").replace("♯", "-sharp");
}
