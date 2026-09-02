#!/usr/bin/env node

// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { parseArgs } from "node:util";

import { analyzePlaylist } from "./analyze.js";
import { readInput } from "./input.js";

const usage = `Usage: node tools/ireal-analysis/src/cli.js [--exact-limit NUMBER] <playlist.json|->

Analyze the JSON emitted by pianosnake/ireal-reader.
Use - to read JSON from standard input.`;

function parseExactLimit(value) {
  if (value === undefined) return Infinity;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new TypeError("--exact-limit must be a non-negative integer");
  }
  return limit;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "exact-limit": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  if (positionals.length !== 1) throw new TypeError(usage);

  const playlist = JSON.parse(await readInput(positionals[0]));
  const result = analyzePlaylist(playlist, {
    exactLimit: parseExactLimit(values["exact-limit"]),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ireal-analysis: ${message}\n`);
  process.exitCode = 1;
}
