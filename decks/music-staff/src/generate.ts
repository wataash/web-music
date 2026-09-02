// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectAnkiPackage,
  OCTAVE_NUMBER_CLEF_DECK_IDS,
  STAFF_TO_NOTE_CLEF_DECK_IDS,
  stableNoteGuid,
  writeAnkiPackage,
  type AnkiPackageSummary,
  type MediaFile,
  type PackageNote,
} from "./apkg";
import { CARDS, type StaffCard } from "./cards";
import {
  keyboardLabelPlacement,
  renderKeyboardSvg,
  renderStaffSvg,
} from "./staff";

const PACKAGE_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const DEFAULT_OUTPUT_PATH = resolve(
  PACKAGE_DIRECTORY,
  "dist/music-staff.apkg",
);

export type DeckArtifacts = Readonly<{
  notes: readonly PackageNote[];
  media: readonly MediaFile[];
}>;

export function createDeckArtifacts(): DeckArtifacts {
  // Media is keyed by filename so the two directions share images: a drawn
  // staff is the question one way and the answer the other, and all
  // note-to-staff cards of a clef ask against the same empty staff.
  const mediaByFilename = new Map<string, MediaFile>();
  const addMedia = (name: string, content: string): string => {
    const filename = mediaFilename(name, content);
    if (!mediaByFilename.has(filename)) {
      mediaByFilename.set(filename, { filename, content });
    }
    return filename;
  };

  const createNote = (
    card: StaffCard,
    withOctaveNumbers: boolean,
  ): PackageNote => {
    const answerFilename = addMedia(
      `${card.clef}-${card.pitch.toLowerCase()}`,
      renderStaffSvg({ clef: card.clef, pitch: card.pitch }),
    );
    const questionFilename =
      card.direction === "staff-to-note"
        ? answerFilename
        : addMedia(`${card.clef}-empty`, renderStaffSvg({ clef: card.clef }));
    // The octave the note is in is enough to say which white key it is; a
    // deck that asks with octave numbers puts the whole 88-key piano above it
    // to say where that octave sits. The image does not depend on the clef,
    // so the four clefs share it.
    const layout = withOctaveNumbers ? "piano" : "octave";
    const keyboardFilename = addMedia(
      `keyboard-${layout}-${card.pitch.toLowerCase()}`,
      renderKeyboardSvg({ pitch: card.pitch, layout }),
    );
    // The same keyboard with nothing on it, for a question whose answer is the
    // key. Only the octave drawn below decides how it looks, so every note in
    // an octave shares the image.
    const blankKeyboardFilename = addMedia(
      `keyboard-${layout}-blank`,
      renderKeyboardSvg({ pitch: card.pitch, layout, highlighted: false }),
    );

    return createPackageNote(
      card,
      questionFilename,
      answerFilename,
      keyboardFilename,
      blankKeyboardFilename,
      withOctaveNumbers,
    );
  };
  const notes = [
    ...CARDS.filter(({ direction }) => direction === "staff-to-note").map(
      (card) => createNote(card, false),
    ),
    ...CARDS.map((card) => createNote(card, true)),
  ];

  return { notes, media: [...mediaByFilename.values()] };
}

export function createWebDeckArtifacts(): DeckArtifacts {
  const notes = [
    ...CARDS.filter(({ direction }) => direction === "staff-to-note").map(
      (card) => createWebPackageNote(card, false),
    ),
    ...CARDS.map((card) => createWebPackageNote(card, true)),
  ];
  return { notes, media: [] };
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
  card: StaffCard,
  questionFilename: string,
  answerFilename: string,
  keyboardFilename: string,
  blankKeyboardFilename: string,
  withOctaveNumbers: boolean,
): PackageNote {
  const id = withOctaveNumbers
    ? `${card.id}-with-octave-numbers`
    : card.id;
  const displayPitch = withOctaveNumbers ? card.pitch : card.note;
  // Which keyboard it is, so the card can give the 88-key strip the width it
  // needs without blowing up a single octave to match.
  const keyboardClass = withOctaveNumbers ? "keyboard-piano" : "keyboard-octave";
  // The name is written by the card, not drawn into the keyboard, so it can be
  // sized on its own. The drawing says where it goes.
  const layout = withOctaveNumbers ? "piano" : "octave";
  const placement = keyboardLabelPlacement(
    card.pitch,
    layout,
    displayPitch.length,
  );
  const keyName = [
    `<span class="key-name" style="--key-x:${percent(placement.x)};`,
    `--key-y:${percent(placement.y)};--key-size:${round(placement.size * 100)}cqw">`,
    `${displayPitch}</span>`,
  ].join("");
  // The frame carries the layout, so the stylesheet can give it a width of its
  // own: a container sized by its contents measures zero to the units inside
  // it.
  const keyboard = (image: string, name: string): string =>
    `<span class="keyboard-frame ${keyboardClass}">${image}${name}</span>`;
  return {
    id,
    guid: stableNoteGuid(id),
    deckId: withOctaveNumbers
      ? OCTAVE_NUMBER_CLEF_DECK_IDS[card.direction][card.clef]
      : STAFF_TO_NOTE_CLEF_DECK_IDS[card.clef],
    fields: [
      id,
      card.clef,
      card.pitch,
      card.note,
      String(card.octave),
      // Filled only for note-to-staff, which is how the shared template tells
      // the two directions apart.
      card.direction === "note-to-staff" ? displayPitch : "",
      displayPitch,
      imageField(questionFilename, "staff"),
      imageField(answerFilename, "staff"),
      keyboard(imageField(keyboardFilename), keyName),
      keyboard(imageField(blankKeyboardFilename), ""),
    ],
    tags: [
      ...card.tags,
      ...(withOctaveNumbers ? ["notation::with-octave-numbers"] : []),
    ],
  };
}

function createWebPackageNote(
  card: StaffCard,
  withOctaveNumbers: boolean,
): PackageNote {
  const id = withOctaveNumbers
    ? `${card.id}-with-octave-numbers`
    : card.id;
  const displayPitch = withOctaveNumbers ? card.pitch : card.note;
  const layout = withOctaveNumbers ? "piano" : "octave";
  const questionStaff =
    card.direction === "staff-to-note"
      ? `${card.clef}|${card.pitch}`
      : card.clef;
  const answerStaff = `${card.clef}|${card.pitch}`;
  const keyboard = `${layout}|${card.pitch}|${displayPitch}`;
  const blankKeyboard =
    layout === "piano" ? layout : `${layout}|${card.octave}`;

  return {
    id,
    guid: stableNoteGuid(id),
    deckId: withOctaveNumbers
      ? OCTAVE_NUMBER_CLEF_DECK_IDS[card.direction][card.clef]
      : STAFF_TO_NOTE_CLEF_DECK_IDS[card.clef],
    fields: [
      id,
      card.clef,
      card.pitch,
      card.note,
      String(card.octave),
      card.direction === "note-to-staff" ? displayPitch : "",
      displayPitch,
      questionStaff,
      answerStaff,
      keyboard,
      blankKeyboard,
    ],
    tags: [
      ...card.tags,
      ...(withOctaveNumbers ? ["notation::with-octave-numbers"] : []),
    ],
  };
}

function percent(fraction: number): string {
  return `${round(fraction * 100)}%`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function imageField(filename: string, className?: string): string {
  const attributes = className === undefined ? "" : ` class="${className}"`;
  return `<img${attributes} src="${filename}" alt="">`;
}

function mediaFilename(name: string, content: string): string {
  const digest = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return `music-staff-${name}-${digest}.svg`;
}
