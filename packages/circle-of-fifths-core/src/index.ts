// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type NotePosition = Readonly<{
  hour: number;
  major: readonly string[];
  minor: readonly string[];
}>;

export type NoteRole = "major" | "minor";

export type NoteDifficulty = "basic" | "advanced" | "esoteric";

export type IntervalNotePair = readonly [
  questionNote: string,
  answerNote: string,
];

export type DiagramLayout = Readonly<{
  size: number;
  center: number;
  outerRadius: number;
  dividerRadius: number;
  innerRadius: number;
  majorLabelRadius: number;
  minorLabelRadius: number;
}>;

export type LabelPlacement = Readonly<{
  hour: number;
  role: NoteRole;
  notes: readonly string[];
  x: number;
  y: number;
}>;

export const POSITIONS = [
  { hour: 12, major: ["B#", "C", "Dbb"], minor: ["g##", "a", "bbb"] },
  { hour: 1, major: ["F##", "G", "Abb"], minor: ["d##", "e", "fb"] },
  { hour: 2, major: ["C##", "D", "Ebb"], minor: ["a##", "b", "cb"] },
  { hour: 3, major: ["G##", "A", "Bbb"], minor: ["e##", "f#", "gb"] },
  { hour: 4, major: ["D##", "E", "Fb"], minor: ["b##", "c#", "db"] },
  { hour: 5, major: ["A##", "B", "Cb"], minor: ["g#", "ab"] },
  { hour: 6, major: ["E##", "F#", "Gb"], minor: ["d#", "eb", "fbb"] },
  { hour: 7, major: ["B##", "C#", "Db"], minor: ["a#", "bb", "cbb"] },
  { hour: 8, major: ["G#", "Ab"], minor: ["e#", "f", "gbb"] },
  { hour: 9, major: ["D#", "Eb", "Fbb"], minor: ["b#", "c", "dbb"] },
  { hour: 10, major: ["A#", "Bb", "Cbb"], minor: ["f##", "g", "abb"] },
  { hour: 11, major: ["E#", "F", "Gbb"], minor: ["c##", "d", "ebb"] },
] as const satisfies readonly NotePosition[];

export const NOTES_BY_DIFFICULTY = {
  major: {
    basic: [
      "Gb",
      "Db",
      "Ab",
      "Eb",
      "Bb",
      "F",
      "C",
      "G",
      "D",
      "A",
      "E",
      "B",
      "F#",
    ],
    advanced: ["Fb", "Cb", "C#", "G#", "D#", "A#", "E#", "B#", "F##"],
    esoteric: [
      "Fbb",
      "Cbb",
      "Gbb",
      "Dbb",
      "Abb",
      "Ebb",
      "Bbb",
      "C##",
      "G##",
      "D##",
      "A##",
      "E##",
      "B##",
    ],
  },
  minor: {
    basic: [
      "eb",
      "bb",
      "f",
      "c",
      "g",
      "d",
      "a",
      "e",
      "b",
      "f#",
      "c#",
      "g#",
      "d#",
    ],
    advanced: [
      "bbb",
      "fb",
      "cb",
      "gb",
      "db",
      "ab",
      "a#",
      "e#",
      "b#",
      "f##",
      "c##",
      "g##",
      "d##",
    ],
    esoteric: [
      "fbb",
      "cbb",
      "gbb",
      "dbb",
      "abb",
      "ebb",
      "a##",
      "e##",
      "b##",
    ],
  },
} as const satisfies Readonly<
  Record<NoteRole, Readonly<Record<NoteDifficulty, readonly string[]>>>
>;

export const FLAT_THIRD_PAIRS = [
  ["ab", "Cb"],
  ["a", "C"],
  ["a#", "C#"],
  ["bb", "Db"],
  ["b", "D"],
  ["b#", "D#"],
  ["cb", "Ebb"],
  ["c", "Eb"],
  ["c#", "E"],
  ["db", "Fb"],
  ["d", "F"],
  ["d#", "F#"],
  ["eb", "Gb"],
  ["e", "G"],
  ["e#", "G#"],
  ["f", "Ab"],
  ["f#", "A"],
  ["gb", "Bbb"],
  ["g", "Bb"],
  ["g#", "B"],
] as const satisfies readonly IntervalNotePair[];

export const MAJOR_THIRD_PAIRS = [
  ["Ab", "c"],
  ["A", "c#"],
  ["A#", "c##"],
  ["Bb", "d"],
  ["B", "d#"],
  ["B#", "d##"],
  ["Cb", "eb"],
  ["C", "e"],
  ["C#", "e#"],
  ["Db", "f"],
  ["D", "f#"],
  ["D#", "f##"],
  ["Eb", "g"],
  ["E", "g#"],
  ["E#", "g##"],
  ["Fb", "ab"],
  ["F", "a"],
  ["F#", "a#"],
  ["Gb", "bb"],
  ["G", "b"],
  ["G#", "b#"],
] as const satisfies readonly IntervalNotePair[];

export const BASIC_NOTES = {
  major: NOTES_BY_DIFFICULTY.major.basic,
  minor: NOTES_BY_DIFFICULTY.minor.basic,
} as const satisfies Readonly<Record<NoteRole, readonly string[]>>;

const basicNoteSets: Readonly<Record<NoteRole, ReadonlySet<string>>> = {
  major: new Set(BASIC_NOTES.major),
  minor: new Set(BASIC_NOTES.minor),
};

export const DEFAULT_LAYOUT = {
  size: 1000,
  center: 500,
  outerRadius: 460,
  dividerRadius: 330,
  innerRadius: 130,
  majorLabelRadius: 395,
  minorLabelRadius: 230,
} as const satisfies DiagramLayout;

const accidentalGlyphs: Readonly<Record<string, string>> = {
  "": "",
  b: "♭",
  bb: "𝄫",
  "#": "♯",
  "##": "𝄪",
};

const naturalMajorFifths: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: -1,
  G: 1,
  A: 3,
  B: 5,
};

const accidentalFifths: Readonly<Record<string, number>> = {
  "": 0,
  b: -7,
  bb: -14,
  "#": 7,
  "##": 14,
};

export function angleForHour(hour: number): number {
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) {
    throw new RangeError(`hour must be an integer from 1 through 12; got ${hour}`);
  }
  return (hour % 12) * 30;
}

export function pointAtClockAngle(
  center: number,
  radius: number,
  degrees: number,
): Readonly<{ x: number; y: number }> {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: center + radius * Math.sin(radians),
    y: center - radius * Math.cos(radians),
  };
}

export function createLabelPlacements(
  positions: readonly NotePosition[] = POSITIONS,
  layout: DiagramLayout = DEFAULT_LAYOUT,
): readonly LabelPlacement[] {
  return positions.flatMap((position) => [
    createPlacement(position, "major", layout.majorLabelRadius, layout.center),
    createPlacement(position, "minor", layout.minorLabelRadius, layout.center),
  ]);
}

export function formatNoteName(note: string): string {
  if (!/^[A-Ga-g](?:bb|##|b|#)?$/.test(note)) {
    throw new TypeError(`invalid note spelling: ${note}`);
  }

  return note[0] + accidentalGlyphs[note.slice(1)];
}

export function fifthsForMajorNote(note: string): number {
  if (!/^[A-G](?:bb|##|b|#)?$/.test(note)) {
    throw new TypeError(`invalid major note spelling: ${note}`);
  }

  return naturalMajorFifths[note[0]] + accidentalFifths[note.slice(1)];
}

export function isBasicNote(role: NoteRole, note: string): boolean {
  return basicNoteSets[role].has(note);
}

export function formatNumber(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function createPlacement(
  position: NotePosition,
  role: NoteRole,
  radius: number,
  center: number,
): LabelPlacement {
  const point = pointAtClockAngle(center, radius, angleForHour(position.hour));
  return {
    hour: position.hour,
    role,
    notes: position[role],
    ...point,
  };
}
