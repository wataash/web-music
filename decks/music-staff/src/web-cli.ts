// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

import { createWebDeckData } from "./apkg";
import { createWebDeckArtifacts } from "./generate";

const { values } = parseArgs({
  options: { output: { type: "string", short: "o" } },
});
const outputPath = resolve(values.output ?? "dist/music-staff.json");
const artifacts = createWebDeckArtifacts();
const document = {
  format: "web-music-flashcards-deck",
  version: 1,
  deck: createWebDeckData(artifacts.notes, artifacts.media),
} as const;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(document));
process.stdout.write(
  `${outputPath}\n${document.deck.decks.length} decks, ${document.deck.notes.length} notes, ${document.deck.media.length} media files\n`,
);
