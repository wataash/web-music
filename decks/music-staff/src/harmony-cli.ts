// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { mkdir, writeFile } from "node:fs/promises";
import { createDiatonicWebDeckData } from "./diatonic-deck";
import { createChordTonesWebDeckData } from "./chord-tones-deck";
import { createProgressionWebDeckData } from "./progression-deck";

await mkdir("dist", { recursive: true });
for (const [name, deck] of [
  ["diatonic-chords", createDiatonicWebDeckData()],
  ["ii-v-i", createProgressionWebDeckData()],
  ["chord-tones", createChordTonesWebDeckData()],
] as const) {
  const path = `dist/${name}.json`;
  await writeFile(path, JSON.stringify({ format: "web-music-flashcards-deck", version: 1, deck }));
  process.stdout.write(`${path}\n`);
}
