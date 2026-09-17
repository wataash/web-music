// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { normalizeTuning } from "@web-music/practice-ui/tuning";

import {
  DEFAULT_OUTPUT_PATH,
  generateAnkiDeck,
} from "./generate";

// --tuning takes the open strings as MIDI numbers, string 1 first, the way the
// web app's instrument setting keeps them: 43,38,33,28 is a four-string bass.
const { values } = parseArgs({
  options: {
    output: {
      type: "string",
      short: "o",
    },
    tuning: { type: "string" },
  },
});

const outputPath = resolve(values.output ?? DEFAULT_OUTPUT_PATH);
const tuning =
  values.tuning === undefined
    ? undefined
    : normalizeTuning(values.tuning.split(",").map(Number));
const summary = await generateAnkiDeck(outputPath, tuning);

process.stdout.write(
  `${outputPath}\n${summary.deckCount} decks, ${summary.noteCount} notes, ${summary.mediaCount} media files\n`,
);

