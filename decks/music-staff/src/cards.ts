// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  CLEFS,
  formatPitch,
  naturalPitchesInRange,
  type Clef,
  type NoteLetter,
} from "@web-music/music-staff-core";

// The pitch and staff-position model lives in the core package because the
// app needs it too; this module only turns it into cards.
export * from "@web-music/music-staff-core";

// staff-to-note reads a drawn note and asks for its name; note-to-staff names
// a pitch and asks where it sits on an empty staff.
export const DIRECTIONS = ["staff-to-note", "note-to-staff"] as const;

export type Direction = (typeof DIRECTIONS)[number];

export type StaffCard = Readonly<{
  id: string;
  direction: Direction;
  clef: Clef;
  pitch: string;
  note: NoteLetter;
  octave: number;
  tags: readonly [`clef::${Clef}`, `direction::${Direction}`];
}>;

export function isDirection(value: unknown): value is Direction {
  return DIRECTIONS.includes(value as Direction);
}

export const CARDS: readonly StaffCard[] = DIRECTIONS.flatMap((direction) =>
  CLEFS.flatMap((clef) =>
    naturalPitchesInRange(clef).map((pitch) => {
      const text = formatPitch(pitch);

      return {
        id: `${direction}-${clef}-${text.toLowerCase()}`,
        direction,
        clef,
        pitch: text,
        note: pitch.note,
        octave: pitch.octave,
        tags: [`clef::${clef}`, `direction::${direction}`],
      } as const;
    }),
  ),
);

export function findCard(
  direction: Direction,
  clef: Clef,
  pitch: string,
): StaffCard | undefined {
  return CARDS.find(
    (card) =>
      card.direction === direction &&
      card.clef === clef &&
      card.pitch === pitch,
  );
}
