// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CLEF_RANGES,
  CLEFS,
  DIRECTIONS,
  findCard,
  isClef,
  isDirection,
  type Clef,
  type Direction,
} from "./cards";
import { renderStaffSvg } from "./staff";

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
  direction?: Direction;
  clef?: Clef;
  pitch?: string;
}>;

export type PreviewSummary = Readonly<{
  frontPath: string;
  backPath: string;
  pitch: string;
}>;

// Draws what the card shows rather than what the deck stores: the prompt and
// the answer live in the card template, so the preview paints them into the
// SVG to make each side readable on its own.
export async function writeStaffPreview({
  outputDirectory = DEFAULT_PREVIEW_DIRECTORY,
  direction = "staff-to-note",
  clef = "treble",
  pitch = "C4",
}: PreviewOptions = {}): Promise<PreviewSummary> {
  if (!isDirection(direction)) {
    throw new RangeError(
      `preview direction must be one of ${DIRECTIONS.join(", ")}: ${String(direction)}`,
    );
  }
  if (!isClef(clef)) {
    throw new RangeError(
      `preview clef must be one of ${CLEFS.join(", ")}: ${String(clef)}`,
    );
  }
  const card = findCard(direction, clef, pitch);
  if (!card) {
    const range = CLEF_RANGES[clef];
    throw new RangeError(
      `preview pitch must be a natural note from ${range.lowest} to ${range.highest} on the ${clef} clef: ${pitch}`,
    );
  }

  const resolvedDirectory = resolve(outputDirectory);
  const frontPath = join(resolvedDirectory, `${card.id}-front.svg`);
  const backPath = join(resolvedDirectory, `${card.id}-back.svg`);
  const frontSvg =
    card.direction === "staff-to-note"
      ? renderStaffSvg({ clef: card.clef, pitch: card.pitch })
      : renderStaffSvg({ clef: card.clef, label: card.pitch });
  const backSvg = renderStaffSvg({
    clef: card.clef,
    pitch: card.pitch,
    label: card.direction === "staff-to-note" ? card.note : card.pitch,
  });

  await mkdir(resolvedDirectory, { recursive: true });
  await Promise.all([
    writeFile(frontPath, frontSvg, "utf8"),
    writeFile(backPath, backSvg, "utf8"),
  ]);

  return { frontPath, backPath, pitch: card.pitch };
}
