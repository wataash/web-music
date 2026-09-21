// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { createWebDeckData, type WebDeckData } from "./apkg";
import { createWebDeckArtifacts } from "./generate";
import { createMovableDoWebDeckData } from "./movable-do";

const { values } = parseArgs({
  options: { output: { type: "string", short: "o" } },
});
const outputPath = resolve(values.output ?? "dist/music-staff.json");
const artifacts = createWebDeckArtifacts();
const document = {
  format: "web-music-flashcards-deck",
  version: 1,
  deck: mergeDecks(
    createWebDeckData(artifacts.notes, artifacts.media),
    createMovableDoWebDeckData(),
  ),
} as const;

function mergeDecks(first: WebDeckData, second: WebDeckData): WebDeckData {
  return {
    models: [...first.models, ...second.models],
    decks: [...first.decks, ...second.decks],
    notes: [...first.notes, ...second.notes],
    cards: [...first.cards, ...second.cards],
    media: [...first.media, ...second.media],
    rootDeckNames: [...first.rootDeckNames, ...second.rootDeckNames],
  };
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(document));
process.stdout.write(
  `${outputPath}\n${document.deck.decks.length} decks, ${document.deck.notes.length} notes, ${document.deck.media.length} media files\n`,
);
