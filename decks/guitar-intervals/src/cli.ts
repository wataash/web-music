// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { DEFAULT_OUTPUT_PATH, generateAnkiDeck } from "./generate";

const { values } = parseArgs({
  options: { output: { type: "string", short: "o" } },
});
const outputPath = resolve(values.output ?? DEFAULT_OUTPUT_PATH);
const summary = await generateAnkiDeck(outputPath);
process.stdout.write(
  `${outputPath}\n${summary.deckCount} decks, ${summary.noteCount} notes, ${summary.mediaCount} media files\n`,
);
