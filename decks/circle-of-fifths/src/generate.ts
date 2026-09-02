// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { formatNoteName } from "@circle-of-fifths/core";
import { renderDarkCircleOfFifthsSvg } from "@circle-of-fifths/svg";

import {
  CARDS,
  formatDisplayNote,
  type CardDefinition,
} from "./cards";
import {
  FLAT3_DECK_ID,
  INNER_CELL_TO_NOTES_DECK_ID,
  INNER_NOTE_TO_CELL_DECK_ID,
  inspectAnkiPackage,
  MAJOR3_DECK_ID,
  OUTER_CELL_TO_NOTES_DECK_ID,
  OUTER_NOTE_TO_CELL_DECK_ID,
  stableNoteGuid,
  writeAnkiPackage,
  type AnkiPackageSummary,
  type MediaFile,
  type PackageNote,
} from "./apkg";

const PACKAGE_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const DEFAULT_OUTPUT_PATH = resolve(
  PACKAGE_DIRECTORY,
  "dist/circle-of-fifths-intervals.apkg",
);

export type DeckArtifacts = Readonly<{
  notes: readonly PackageNote[];
  media: readonly MediaFile[];
}>;

export function createDeckArtifacts(): DeckArtifacts {
  const frontSvg = renderCircleOfFifthsSvg({
    title: "Empty circle of fifths",
    description: "An unlabeled circle of fifths.",
    visibleNotes: [],
  });
  const frontMediaFilename = mediaFilename("empty", frontSvg);
  const media: MediaFile[] = [
    {
      filename: frontMediaFilename,
      content: frontSvg,
    },
  ];

  const notes = CARDS.map((card) => {
    const presentation = createCardPresentation(card);
    let cardFrontMediaFilename = frontMediaFilename;

    if (presentation.frontSvg) {
      cardFrontMediaFilename = mediaFilename(
        `${card.id}-front`,
        presentation.frontSvg,
      );
      media.push({
        filename: cardFrontMediaFilename,
        content: presentation.frontSvg,
      });
    }

    const backMediaFilename = mediaFilename(
      card.id,
      presentation.backSvg,
    );
    media.push({
      filename: backMediaFilename,
      content: presentation.backSvg,
    });

    return {
      id: card.id,
      guid: stableNoteGuid(card.id),
      deckId: deckIdForCard(card),
      fields: [
        card.id,
        card.kind === "interval" ? card.intervalLabel : "",
        presentation.question,
        presentation.answer,
        imageField(cardFrontMediaFilename),
        imageField(backMediaFilename),
      ],
      tags: [card.tag],
    } satisfies PackageNote;
  });

  return { notes, media };
}

export function createWebDeckArtifacts(): DeckArtifacts {
  const notes = CARDS.map((card) => {
    const { question, answer } = cardText(card);
    return {
      id: card.id,
      guid: stableNoteGuid(card.id),
      deckId: deckIdForCard(card),
      fields: [
        card.id,
        card.kind === "interval" ? card.intervalLabel : "",
        question,
        answer,
        webFrontDrawing(card),
        webBackDrawing(card),
      ],
      tags: [card.tag],
    } satisfies PackageNote;
  });
  return { notes, media: [] };
}

type CardPresentation = Readonly<{
  question: string;
  answer: string;
  frontSvg?: string;
  backSvg: string;
}>;

function createCardPresentation(
  card: CardDefinition,
): CardPresentation {
  const { question, answer } = cardText(card);
  if (card.kind === "interval") {
    return {
      question,
      answer,
      backSvg: renderCircleOfFifthsSvg({
        title: `${question} = ${answer}`,
        description: `The notes ${formatDisplayNote(card.outerNote)} on the outer ring and ${formatDisplayNote(card.innerNote)} on the inner ring.`,
        visibleNotes: [card.outerNote, card.innerNote],
        labelLayout: "single-note",
      }),
    };
  }

  if (card.kind === "note-to-cell") {
    return {
      question,
      answer,
      backSvg: renderCircleOfFifthsSvg({
        title: question,
        description: `The note ${question} on the ${card.ring} ring.`,
        visibleNotes: [card.note],
        labelLayout: "single-note",
      }),
    };
  }

  const displayedNotes = card.notes.map(formatNoteName);
  const cellDescription = `${card.ring} ring at ${card.hour} o'clock`;
  return {
    question,
    answer,
    frontSvg: renderCircleOfFifthsSvg({
      title: `Highlighted ${cellDescription}`,
      description: `The highlighted cell is on the ${cellDescription}.`,
      visibleNotes: [],
      highlightedCells: [{ hour: card.hour, ring: card.ring }],
    }),
    backSvg: renderCircleOfFifthsSvg({
      title: displayedNotes.join(", "),
      description: `The notes ${displayedNotes.join(", ")} are in the ${cellDescription}.`,
      visibleNotes: card.notes,
    }),
  };
}

function cardText(
  card: CardDefinition,
): Readonly<{ question: string; answer: string }> {
  if (card.kind === "interval") {
    return {
      question: `${formatDisplayNote(card.questionNote)} ${card.intervalLabel}`,
      answer: formatDisplayNote(card.answerNote),
    };
  }
  return {
    question: card.kind === "note-to-cell" ? formatNoteName(card.note) : "",
    answer: "",
  };
}

function webFrontDrawing(card: CardDefinition): string {
  return card.kind === "cell-to-notes"
    ? `cell|${card.ring}|${card.hour}`
    : "empty";
}

function webBackDrawing(card: CardDefinition): string {
  if (card.kind === "interval") {
    return `single|${card.outerNote} ${card.innerNote}`;
  }
  if (card.kind === "note-to-cell") return `single|${card.note}`;
  return `standard|${card.notes.join(" ")}`;
}

function deckIdForCard(card: CardDefinition): number {
  if (card.kind === "interval") {
    return card.interval === "flat3"
      ? FLAT3_DECK_ID
      : MAJOR3_DECK_ID;
  }

  if (card.kind === "cell-to-notes") {
    return card.ring === "outer"
      ? OUTER_CELL_TO_NOTES_DECK_ID
      : INNER_CELL_TO_NOTES_DECK_ID;
  }

  return card.ring === "outer"
    ? OUTER_NOTE_TO_CELL_DECK_ID
    : INNER_NOTE_TO_CELL_DECK_ID;
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

function imageField(filename: string): string {
  return `<img src="${filename}" alt="">`;
}

function mediaFilename(name: string, content: string): string {
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return `circle-of-fifths-${name}-${digest}.svg`;
}

function renderCircleOfFifthsSvg(
  options: Parameters<typeof renderDarkCircleOfFifthsSvg>[0],
): string {
  return renderDarkCircleOfFifthsSvg(options);
}
