#!/usr/bin/env node

// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { readFile, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { chartFeaturesCsv, chartFeaturesFromHtml } from "./chart-features.js";
import { readInput } from "./input.js";

const usage = `Usage: node tools/ireal-analysis/src/chart-features-cli.js [--limit NUMBER] [--remarks FILE] [--output-prefix PATH] <playlist.html|->

Survey the chart features of an iReal Pro playlist HTML file.
Use - to read the HTML from standard input.

  --limit NUMBER         Analyze only the first NUMBER songs (default: every song).
  --remarks FILE         Read a JSON object mapping song IDs to remarks (never modified).
  --output-prefix PATH   Write PATH.json and PATH.csv instead of JSON on standard output.`;

function parseLimit(value) {
  if (value === undefined) return Infinity;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new TypeError("--limit must be a positive integer");
  }
  return limit;
}

async function canonicalPath(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return resolve(path);
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      limit: { type: "string" },
      remarks: { type: "string" },
      "output-prefix": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  if (positionals.length !== 1) throw new TypeError(usage);

  const html = await readInput(positionals[0]);
  const remarks = values.remarks === undefined ? {} : JSON.parse(await readFile(values.remarks, "utf8"));
  const features = chartFeaturesFromHtml(html, { limit: parseLimit(values.limit), source: positionals[0], remarks });
  const json = `${JSON.stringify(features, null, 2)}\n`;

  const prefix = values["output-prefix"];
  if (prefix === undefined) {
    process.stdout.write(json);
    return;
  }
  const inputs = await Promise.all([positionals[0] === "-" ? undefined : positionals[0], values.remarks]
    .filter(path => path !== undefined).map(canonicalPath));
  for (const output of [`${prefix}.json`, `${prefix}.csv`]) {
    if (inputs.includes(await canonicalPath(output))) throw new Error(`Output would overwrite an input file: ${output}`);
  }
  await writeFile(`${prefix}.json`, json);
  await writeFile(`${prefix}.csv`, chartFeaturesCsv(features));
  process.stderr.write(`ireal-analysis: wrote ${prefix}.json and ${prefix}.csv (${features.songs.length} song(s))\n`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ireal-analysis: ${message}\n`);
  process.exitCode = 1;
}
