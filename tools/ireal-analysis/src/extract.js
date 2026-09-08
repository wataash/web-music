#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { parseArgs } from "node:util";
import { readInput } from "./input.js";
import { extractSource } from "./extract-source.js";

const usage = `Usage: node tools/ireal-analysis/src/extract.js [--format auto|chordwiki|ireal] [--output json|chords] <file|->

Extract written chord order from a ChordWiki Markdown or single-song iReal HTML.
Defaults: auto-detect input, JSON output. Use - for standard input.
Repeat signs are not expanded. Source files are never modified.`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      format: { type: "string", default: "auto" },
      output: { type: "string", default: "json" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    process.stdout.write(usage + "\n");
  } else {
    if (positionals.length !== 1) throw new Error(usage);
    if (!["json", "chords"].includes(values.output)) throw new Error("--output must be json or chords");
    const result = extractSource(await readInput(positionals[0]), values.format);
    if (result.unmappedSymbols.length) {
      process.stderr.write(`Unmapped iReal symbols retained verbatim: ${result.unmappedSymbols.join(", ")}\n`);
    }
    process.stdout.write(values.output === "json"
      ? JSON.stringify(result, null, 2) + "\n"
      : result.chords.join(" ") + "\n");
  }
} catch (error) {
  process.stderr.write(`extract-chords: ${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
}
