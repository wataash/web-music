// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  DEFAULT_PREVIEW_DIRECTORY,
  writeFretboardPreview,
} from "./preview";

const { values } = parseArgs({
  options: {
    output: {
      type: "string",
      short: "o",
    },
    kind: {
      type: "string",
    },
    string: {
      type: "string",
    },
    fret: {
      type: "string",
    },
    note: {
      type: "string",
    },
  },
});

const kind = parseKind(values.kind);
const string = parseInteger(values.string, "string", 3);
const fret = parseInteger(values.fret, "fret", 5);
const outputDirectory = resolve(
  values.output ?? DEFAULT_PREVIEW_DIRECTORY,
);
const summary = await writeFretboardPreview({
  outputDirectory,
  kind,
  string,
  fret,
  note: values.note,
});

process.stdout.write(
  `${summary.frontPath}\n${summary.backPath}\nanswer: ${summary.note}\n`,
);

function parseKind(
  value: string | undefined,
): "position" | "note" {
  if (value === undefined || value === "position") {
    return "position";
  }
  if (value === "note") {
    return "note";
  }
  throw new RangeError("--kind must be position or note");
}

function parseInteger(
  value: string | undefined,
  name: string,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new RangeError(`--${name} must be an integer`);
  }
  return parsed;
}
