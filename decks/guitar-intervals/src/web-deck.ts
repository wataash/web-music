// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The deck's notes and the document the web app imports, for any instrument.
// Nothing from node here: the app generates the deck for the reader's own
// tuning, and generate.ts writes the Anki package from the same notes.

import {
  createWebPackage,
  mediaDigest,
  stablePackageGuid,
  type PackageMedia,
  type PackageNote,
  type WebPackage,
} from "@web-music/anki-apkg/web-package";

import { BOARD_COLUMNS, labelPosition, renderBoardSvg } from "./board";
import {
  MAX_FRET_REACH,
  STANDARD_TUNING,
  formatOffset,
  guitarIntervalCards,
  type GuitarIntervalCard,
  type Tuning,
} from "./cards";
import { ROOT_DECK_ID, packageNamespace, packageSpec } from "./package-spec";
import { difficultyLevels } from "./learning-order";

export type DeckArtifacts = Readonly<{
  notes: readonly PackageNote[];
  media: readonly PackageMedia[];
}>;

// Every card draws the same strings and frets, so the package carries one
// drawing and each note only says what to write on it.
export function boardMedia(tuning: Tuning = STANDARD_TUNING): PackageMedia {
  const content = renderBoardSvg(tuning.length);
  return { filename: `guitar-intervals-board-${mediaDigest(content)}.svg`, content };
}

export function createDeckArtifacts(tuning: Tuning = STANDARD_TUNING): DeckArtifacts {
  return {
    notes: createDeckNotes(tuning),
    media: [boardMedia(tuning)],
  };
}

export function createWebDeck(tuning: Tuning = STANDARD_TUNING): WebPackage {
  const artifacts = createDeckArtifacts(tuning);
  return createWebPackage(packageSpec(tuning), artifacts.notes, artifacts.media);
}

export function createDeckNotes(tuning: Tuning = STANDARD_TUNING): readonly PackageNote[] {
  const cards = guitarIntervalCards(tuning);
  const levels = difficultyLevels(cards, tuning);
  const namespace = packageNamespace(tuning);
  const board = boardMedia(tuning).filename;
  return cards.map((card) => {
    const answer = card.names.join(" ");
    return {
      id: card.id,
      guid: stablePackageGuid(namespace, card.id),
      deckId: ROOT_DECK_ID,
      fields: [
        card.id,
        "guitar-interval",
        String(card.rootString),
        String(card.targetString),
        String(card.fretOffset),
        answer,
        renderBoard(card, "?", "cue", tuning, board),
        renderBoard(card, answer, "answer", tuning, board),
        tuning.join(" "),
      ],
      tags: [
        "axis::guitar-interval",
        `root-string::${card.rootString}`,
        `target-string::${card.targetString}`,
        `fret-offset::${formatOffset(card.fretOffset)}`,
        `degree::${card.names[0]}`,
        `learning-level::${levels.get(card.id)}`,
      ],
      orderGroup: levels.get(card.id)! - 1,
    };
  });
}

function renderBoard(
  card: GuitarIntervalCard,
  text: string,
  kind: "cue" | "answer",
  tuning: Tuning,
  boardFilename: string,
): string {
  const strings = tuning.length;
  const root = labelPosition(card.rootString, 0, strings);
  const target = labelPosition(card.targetString, card.fretOffset, strings);
  return [
    '<span class="fret-window">',
    // The board's own shape, so the app can tell which cell a finger landed on
    // and play it: the drawing is one image, and an image has no cells to
    // take a tap. The origin says which column the root's own fret is.
    `<span class="fret-window-board" data-strings="${strings}"`,
    ` data-frets="${BOARD_COLUMNS}" data-fret-origin="${MAX_FRET_REACH}">`,
    `<img src="${boardFilename}" alt="">`,
    label("root", "1", root),
    label(kind, text, target),
    ...(kind === "answer" ? referenceLabels(card, tuning) : []),
    "</span></span>",
  ].join("");
}

const ALTERED_REFERENCES: Readonly<Record<string, readonly [string, number]>> = {
  d5: ["P5", 1], d7: ["m7", 1], A4: ["P4", -1], A5: ["P5", -1],
  "♭9": ["9", 1], "♯9": ["9", -1], "♯11": ["11", -1], "♭13": ["13", 1],
};

type ReferencePosition = Readonly<{ string: number; offset: number }>;

function referenceLabels(card: GuitarIntervalCard, tuning: Tuning): string[] {
  const byPosition = new Map<string, { position: ReferencePosition; names: string[] }>();
  const add = (name: string, position: ReferencePosition): void => {
    const key = `${position.string}:${position.offset}`;
    const entry = byPosition.get(key) ?? { position, names: [] };
    if (!entry.names.includes(name)) entry.names.push(name);
    byPosition.set(key, entry);
  };
  for (const name of card.names) {
    const reference = ALTERED_REFERENCES[name];
    if (!reference) continue;
    const [text, delta] = reference;
    const offset = card.fretOffset + delta;
    // The reference belongs to a physical neighboring position; never wrap
    // it onto the opposite end of the neck drawing.
    if (Math.abs(offset) > MAX_FRET_REACH) continue;
    add(text, { string: card.targetString, offset });
  }
  for (const position of rootReferencePositions(card, tuning)) {
    add("1", position);
  }
  return [...byPosition.values()]
    .sort((left, right) =>
      left.position.offset - right.position.offset ||
      left.position.string - right.position.string,
    )
    .map(({ position, names }) =>
      label(
        "reference",
        names.join(" "),
        labelPosition(position.string, position.offset, tuning.length),
      ),
    );
}

function rootReferencePositions(
  card: GuitarIntervalCard,
  tuning: Tuning,
): ReferencePosition[] {
  const positions: ReferencePosition[] = [];
  const rootPitchClass = pitchClass(tuning[card.rootString - 1]);
  const addIfRoot = (string: number, offset: number): void => {
    if (
      Math.abs(offset) > MAX_FRET_REACH ||
      (string === card.rootString && offset === 0) ||
      pitchClass(tuning[string - 1] + offset) !== rootPitchClass
    ) {
      return;
    }
    if (!positions.some((position) => position.string === string && position.offset === offset)) {
      positions.push({ string, offset });
    }
  };

  if (card.names.includes("m2")) {
    addIfRoot(card.targetString, card.fretOffset - 1);
  }
  if (card.names.includes("M7")) {
    addIfRoot(card.targetString, card.fretOffset + 1);
  }
  if (!card.names.includes("P4") && !card.names.includes("P5")) {
    return positions;
  }

  for (const direction of [-1, 1] as const) {
    const string = neighboringCourse(card.targetString, direction, tuning);
    if (string === null) continue;
    addIfRoot(string, card.fretOffset);
    // Guitar-family tuning has one major-third course boundary (G–B in
    // standard tuning). Its familiar one-fret displacement is useful even
    // after the whole instrument is transposed.
    if (isAscendingMajorThirdPair(card.targetString, string, tuning)) {
      addIfRoot(string, card.fretOffset - 1);
      addIfRoot(string, card.fretOffset + 1);
    }
  }
  return positions;
}

function neighboringCourse(
  string: number,
  direction: -1 | 1,
  tuning: Tuning,
): number | null {
  const targetPitchClass = pitchClass(tuning[string - 1]);
  for (let candidate = string + direction; candidate >= 1 && candidate <= tuning.length; candidate += direction) {
    if (pitchClass(tuning[candidate - 1]) !== targetPitchClass) return candidate;
  }
  return null;
}

function isAscendingMajorThirdPair(
  left: number,
  right: number,
  tuning: Tuning,
): boolean {
  const upper = Math.min(left, right);
  const lower = Math.max(left, right);
  return pitchClass(tuning[upper - 1] - tuning[lower - 1]) === 4;
}

function pitchClass(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
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

function percent(fraction: number): string {
  return `${Math.round(fraction * 10000) / 100}%`;
}
