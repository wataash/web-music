// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  stablePackageGuid,
  writePackage,
  type PackageMedia,
  type PackageNote,
} from "@web-music/anki-apkg/package";

import {
  INTERVAL_CARDS,
  INTERVAL_IDENTIFICATION_CARDS,
  INTERVAL_ORDER_GROUPS,
  formatNote,
  type IntervalCard,
} from "./cards";
import { intervalKeyboards, type IntervalKeyboard } from "./keyboard";
import {
  IDENTIFICATION_DECK_ID,
  PACKAGE_SPEC,
  ROOT_DECK_ID,
} from "./package-spec";

const PACKAGE_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const DEFAULT_OUTPUT_PATH = resolve(
  PACKAGE_DIRECTORY,
  "dist/intervals.apkg",
);

export type DeckArtifacts = Readonly<{
  notes: readonly PackageNote[];
  media: readonly PackageMedia[];
}>;

type KeyboardFields = (
  card: IntervalCard,
) => readonly [front: string, back: string];

// Anki gets one conventional, static 37-key SVG on each side. It does not
// carry the web app's key-count setting or its browser-side renderer.
export function createDeckArtifacts(): DeckArtifacts {
  const mediaByFilename = new Map<string, PackageMedia>();
  const addMedia = (name: string, content: string): string => {
    const filename = mediaFilename(name, content);
    if (!mediaByFilename.has(filename)) {
      mediaByFilename.set(filename, { filename, content });
    }
    return filename;
  };
  const keyboardFields: KeyboardFields = (card) => {
    const { front, back } = intervalKeyboards({
      root: card.root,
      answer: card.answer,
    });
    return [renderKeyboard(front, addMedia), renderKeyboard(back, addMedia)];
  };
  return {
    notes: createNotes(keyboardFields),
    media: [...mediaByFilename.values()],
  };
}

// The web model draws from these tiny values when a card is shown. The answer
// note uses the existing AnswerKeyboard slot because identification cards use
// Answer itself for the interval name (for example, M3).
export function createWebDeckArtifacts(): DeckArtifacts {
  return {
    notes: createNotes((card) => ["", formatNote(card.answer)]),
    media: [],
  };
}

function createNotes(keyboardFields: KeyboardFields): readonly PackageNote[] {
  const calculationNotes = INTERVAL_CARDS.map((card) => {
    const id = `interval-${card.id}`;
    const root = formatNote(card.root);
    const [keyboard, answerKeyboard] = keyboardFields(card);
    return {
      id,
      guid: stablePackageGuid(PACKAGE_SPEC.namespace, id),
      deckId: ROOT_DECK_ID,
      fields: [
        id,
        "interval",
        root,
        card.interval.label,
        `${root} ${card.interval.label}`,
        formatNote(card.answer),
        card.difficulty,
        keyboard,
        answerKeyboard,
      ],
      tags: [
        "axis::interval",
        `interval::${card.interval.id}`,
        `root::${card.root.toLowerCase()}`,
        `difficulty::${card.difficulty}`,
      ],
      orderGroup: INTERVAL_ORDER_GROUPS.get(card.interval.id),
    };
  });
  const identificationNotes = INTERVAL_IDENTIFICATION_CARDS.map((card) => {
    const id = `identification-${card.id}`;
    const root = formatNote(card.root);
    const [keyboard, answerKeyboard] = keyboardFields(card);
    return {
      id,
      guid: stablePackageGuid(PACKAGE_SPEC.namespace, id),
      deckId: IDENTIFICATION_DECK_ID,
      fields: [
        id,
        "identification",
        root,
        card.interval.label,
        `${root} → ${formatNote(card.answer)}`,
        card.interval.label,
        card.difficulty,
        keyboard,
        answerKeyboard,
      ],
      tags: [
        "axis::identification",
        `interval::${card.interval.id}`,
        `root::${card.root.toLowerCase()}`,
        `difficulty::${card.difficulty}`,
      ],
      orderGroup: INTERVAL_ORDER_GROUPS.get(card.interval.id),
    };
  });
  // Identification comes last so the numeric IDs of the calculation notes
  // stay stable when the bundled deck is re-imported.
  return [...calculationNotes, ...identificationNotes];
}

export function createDeckNotes(): readonly PackageNote[] {
  return createDeckArtifacts().notes;
}

export async function generateAnkiDeck(
  outputPath = DEFAULT_OUTPUT_PATH,
): Promise<Readonly<{ deckCount: number; noteCount: number; mediaCount: number }>> {
  const artifacts = createDeckArtifacts();
  await writePackage(outputPath, PACKAGE_SPEC, artifacts.notes, artifacts.media);
  return {
    deckCount: PACKAGE_SPEC.decks.length,
    noteCount: artifacts.notes.length,
    mediaCount: artifacts.media.length,
  };
}

function renderKeyboard(
  keyboard: IntervalKeyboard,
  addMedia: (name: string, content: string) => string,
): string {
  const filename = addMedia(`keyboard-${keyboard.id}`, keyboard.svg);
  const names = keyboard.labels
    .map(({ text, x, y, size }) =>
      [
        `<span class="key-name"`,
        ` style="--key-x:${percent(x)};--key-y:${percent(y)};`,
        `--key-size:${round(size * 100)}cqw">${text}</span>`,
      ].join(""),
    )
    .join("");
  return [
    '<span class="keyboard-frame keyboard-interval">',
    `<img src="${filename}" alt="">${names}</span>`,
  ].join("");
}

function percent(fraction: number): string {
  return `${round(fraction * 100)}%`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function mediaFilename(name: string, content: string): string {
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return `intervals-${name}-${digest}.svg`;
}
