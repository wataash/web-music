#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { Command } from "commander";

import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  renderCircleOfFifthsSvg,
} from "@circle-of-fifths/svg";

const program = new Command()
  .name("circle-of-fifths")
  .description("Generate the circle of fifths as a self-contained SVG")
  .option(
    "-o, --output <path>",
    "output SVG path",
    "circle-of-fifths.svg",
  )
  .option("--stdout", "write the SVG to standard output")
  .option("--title <text>", "accessible SVG title", DEFAULT_TITLE)
  .option(
    "--description <text>",
    "accessible SVG description",
    DEFAULT_DESCRIPTION,
  )
  .action(
    async (options: {
      output: string;
      stdout?: boolean;
      title: string;
      description: string;
    }) => {
      const svg = renderCircleOfFifthsSvg({
        title: options.title,
        description: options.description,
        showKeySignatures: true,
      });

      if (options.stdout) {
        process.stdout.write(svg);
        return;
      }

      const outputPath = resolve(options.output);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, svg, "utf8");
      process.stdout.write(`${outputPath}\n`);
    },
  );

program.parseAsync().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
