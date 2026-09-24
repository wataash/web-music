#!/usr/bin/env node

// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Device } from "./src/adb.mjs";
import { CONDITIONS, captureSide } from "./src/capture.mjs";
import { renderGallery } from "./src/gallery.mjs";
import { USAGE, parseOptions } from "./src/options.mjs";
import { build, startPreview } from "./src/preview.mjs";
import { extractRevision, resolveCommit, shareDependencies } from "./src/snapshot.mjs";
import { parseSongs } from "./src/songs.mjs";
import { verifyCaptures } from "./src/verify.mjs";

const REPOSITORY = fileURLToPath(new URL("../../", import.meta.url));
const DEFAULT_SONGS = fileURLToPath(new URL("./songs.json", import.meta.url));
const CDP_SOCKET = "localabstract:chrome_devtools_remote";

const run = new AbortController();

async function captureRevision(options, songs, side, ref) {
  run.signal.throwIfAborted();
  const commit = await resolveCommit(REPOSITORY, ref);
  process.stdout.write(`${side}: ${ref} is ${commit.slice(0, 12)}\n`);
  const snapshot = await extractRevision(REPOSITORY, commit);
  try {
    await shareDependencies(REPOSITORY, snapshot, ref);
    const app = path.join(snapshot, "apps", "chords");
    await build(app, run.signal);
    const preview = await startPreview(app, options.previewPort, run.signal);
    try {
      const captured = await captureSide({
        cdpPort: options.cdpPort,
        url: preview.url,
        playlist: options.playlist,
        songs,
        directory: path.join(options.output, side),
        signal: run.signal,
      });
      return { ref, commit, ...captured };
    } finally {
      await preview.stop();
    }
  } finally {
    await rm(snapshot, { recursive: true, force: true });
  }
}

async function main() {
  if (process.argv.length === 3 && process.argv[2] === "--help") {
    console.log(USAGE);
    return;
  }
  const options = parseOptions(process.argv.slice(2), { repository: REPOSITORY, defaultSongs: DEFAULT_SONGS });
  const songs = parseSongs(await readFile(options.songs, "utf8"), options.songs);
  options.playlist = await readFile(options.playlist, "utf8");

  await mkdir(path.dirname(options.output), { recursive: true });
  try {
    await mkdir(options.output);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`--output already exists: ${options.output}`);
    throw error;
  }

  const device = new Device(options.device);
  await device.check();
  const sides = {};
  try {
    await device.forward(options.cdpPort, CDP_SOCKET);
    await device.reverse(options.previewPort, options.previewPort);
    for (const [side, ref] of [["before", options.before], ["after", options.after]]) {
      sides[side] = await captureRevision(options, songs, side, ref);
    }
  } finally {
    await device.release();
  }

  const problems = verifyCaptures(sides.before, sides.after);
  if (problems.length) throw new Error(`The two revisions did not capture the same charts:\n  ${problems.join("\n  ")}`);

  const report = {
    capturedAt: new Date().toISOString(),
    device: options.device,
    conditions: CONDITIONS,
    sides,
    songs: sides.before.songs.map(song => ({ index: song.index, title: song.title, composer: song.composer, rows: song.rows })),
  };
  await renderGallery(options.output, report, run.signal);
  run.signal.throwIfAborted();
  process.stdout.write(`\nGallery: ${path.join(options.output, "index.html")}\n`);
}

// An interrupt stops the build or the server this run started; the failure
// travels back through main, which unwinds the rest on its way out.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    process.stderr.write(`\nchords-screenshots: ${signal}, stopping\n`);
    process.exitCode = 130;
    run.abort();
  });
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`chords-screenshots: ${message}\n`);
  if (error instanceof TypeError && !message.includes("Usage:")) process.stderr.write(`\n${USAGE}\n`);
  process.exitCode = run.signal.aborted ? 130 : 1;
}
