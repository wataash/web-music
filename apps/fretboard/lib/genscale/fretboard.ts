// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Fretboard, FretSpacing } from "./types";

export const DEFAULT_FRET_SPACING: FretSpacing = "equal-temperament";

export const CANVAS = {
  fretLabelFontSize: 14,
  fretLineWidth: 5,
  nutW: 40,
  boardW: 1400,
  stringGap: 40,
  noteRadius: 13,
};

export function calcNormalizedFretPositions(
  fretCount: number,
  spacing: FretSpacing = DEFAULT_FRET_SPACING,
): number[] {
  if (spacing === "equal-width") {
    return Array.from(
      { length: fretCount + 2 },
      (_, n) => Number((n / (fretCount + 1)).toFixed(12)),
    );
  }

  const positions = Array.from(
    { length: fretCount + 2 },
    (_, n) => 1 - 1 / 2 ** (n / 12),
  );
  const total = positions[positions.length - 1];
  return positions.map((p) => Number((p / total).toFixed(12)));
}

export function calcBlockInlayRect(
  fretXs: readonly number[],
  stringYs: readonly number[],
  fret: number,
): { x: number; y: number; width: number; height: number } {
  const innerLeftX = fretXs[fret - 1] + CANVAS.fretLineWidth / 2;
  const innerWidth =
    fretXs[fret] - fretXs[fret - 1] - CANVAS.fretLineWidth;
  const boardHeight = stringYs[stringYs.length - 1] - stringYs[0];

  if (stringYs.length < 3) {
    const height = boardHeight * 0.8;
    return {
      x: innerLeftX + innerWidth * 0.15,
      y: stringYs[0] + (boardHeight - height) / 2,
      width: innerWidth * 0.7,
      height,
    };
  }

  const y = stringYs[0] + (stringYs[1] - stringYs[0]) * 0.2;
  const bottom =
    stringYs[stringYs.length - 2] +
    (stringYs[stringYs.length - 1] - stringYs[stringYs.length - 2]) *
      0.8;

  return {
    x: innerLeftX + innerWidth * 0.15,
    y,
    width: innerWidth * 0.7,
    height: bottom - y,
  };
}

export function buildFretboard(
  openNoteIndices: number[],
  spacing: FretSpacing = DEFAULT_FRET_SPACING,
): Fretboard {
  return {
    normalizedFretPositions: calcNormalizedFretPositions(24, spacing),
    noteIndices: openNoteIndices.map((open) =>
      Array.from({ length: 25 }, (_, fret) => (open + fret) % 12),
    ),
  };
}
