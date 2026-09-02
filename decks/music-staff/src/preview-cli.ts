// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  CLEFS,
  DIRECTIONS,
  isClef,
  isDirection,
  type Clef,
  type Direction,
} from "./cards";
import { DEFAULT_PREVIEW_DIRECTORY, writeStaffPreview } from "./preview";

const { values } = parseArgs({
  options: {
    output: { type: "string", short: "o" },
    direction: { type: "string" },
    clef: { type: "string" },
    pitch: { type: "string" },
  },
});

const outputDirectory = resolve(values.output ?? DEFAULT_PREVIEW_DIRECTORY);
const summary = await writeStaffPreview({
  outputDirectory,
  direction: parseDirection(values.direction),
  clef: parseClef(values.clef),
  pitch: values.pitch?.toUpperCase(),
});

process.stdout.write(
  `${summary.frontPath}\n${summary.backPath}\nanswer: ${summary.pitch}\n`,
);

function parseDirection(value: string | undefined): Direction {
  if (value === undefined) return "staff-to-note";
  if (!isDirection(value)) {
    throw new RangeError(`--direction must be ${DIRECTIONS.join(" or ")}`);
  }
  return value;
}

function parseClef(value: string | undefined): Clef {
  if (value === undefined) return "treble";
  if (!isClef(value)) {
    throw new RangeError(`--clef must be ${CLEFS.join(", ")}`);
  }
  return value;
}
