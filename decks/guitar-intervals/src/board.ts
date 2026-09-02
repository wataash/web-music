// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { MAX_FRET_REACH, STRING_COUNT } from "./cards";

export const BOARD = {
  cellWidth: 120,
  // Narrower than a fret is wide, so a window of frets is a wide, shallow
  // board rather than a square that crowds out the answer buttons.
  stringGap: 36,
  fretWidth: 4,
  stringWidth: 2,
} as const;

export const BOARD_COLUMNS = MAX_FRET_REACH * 2 + 1;
export const BOARD_WIDTH = BOARD_COLUMNS * BOARD.cellWidth;
export const BOARD_HEIGHT = STRING_COUNT * BOARD.stringGap;

export type BoardLabelPosition = Readonly<{ x: number; y: number }>;

// Where a cell's name sits, as fractions of the whole board, so the app can
// crop the board to the frets the reader asked for and the names travel with
// it. Fret 0 is the root's own fret, at the middle column.
export function labelPosition(
  guitarString: number,
  fretOffset: number,
): BoardLabelPosition {
  if (
    !Number.isInteger(guitarString) ||
    guitarString < 1 ||
    guitarString > STRING_COUNT
  ) {
    throw new RangeError(`string must be from 1 to ${STRING_COUNT}`);
  }
  if (
    !Number.isInteger(fretOffset) ||
    Math.abs(fretOffset) > MAX_FRET_REACH
  ) {
    throw new RangeError(
      `fret offset must be from -${MAX_FRET_REACH} to ${MAX_FRET_REACH}`,
    );
  }
  return {
    x: (fretOffset + MAX_FRET_REACH + 0.5) / BOARD_COLUMNS,
    y: (guitarString - 0.5) / STRING_COUNT,
  };
}

// One drawing serves every card: the strings and frets are the same wherever
// the shape is played, and only the names written over them differ.
export function renderBoardSvg(): string {
  const frets = Array.from({ length: BOARD_COLUMNS + 1 }, (_, column) => {
    const x = round(column * BOARD.cellWidth);
    return `<line x1="${x}" y1="0" x2="${x}" y2="${BOARD_HEIGHT}"/>`;
  }).join("");
  const strings = Array.from({ length: STRING_COUNT }, (_, row) => {
    const y = round((row + 0.5) * BOARD.stringGap);
    return `<line x1="0" y1="${y}" x2="${BOARD_WIDTH}" y2="${y}"/>`;
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}"`,
    ` width="${BOARD_WIDTH}" height="${BOARD_HEIGHT}" role="img"`,
    ` aria-label="Guitar fretboard, ${STRING_COUNT} strings and ${BOARD_COLUMNS} frets around the root">`,
    `<style>.fret{stroke:#52606d;stroke-width:${BOARD.fretWidth}}`,
    `.string{stroke:#cbd5e1;stroke-width:${BOARD.stringWidth}}</style>`,
    `<rect width="100%" height="100%" fill="#111827"/>`,
    `<g class="fret">${frets}</g>`,
    `<g class="string">${strings}</g>`,
    `</svg>`,
  ].join("");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
