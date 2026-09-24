// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readdir, readFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { compareTrees, compatibilityError } from "./compat.mjs";

const run = promisify(execFile);
const SKIP = new Set(["node_modules", "dist", ".git", ".svelte-kit", ".wrangler", "coverage", "test-results", "playwright-report"]);
const APP = "apps/chords";

export async function resolveCommit(repository, ref) {
  try {
    const { stdout } = await run("git", ["-C", repository, "rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], { encoding: "utf8" });
    return stdout.trim();
  } catch {
    throw new Error(`Not a revision in this repository: ${ref}`);
  }
}

// The revision is unpacked somewhere else. The working tree is never checked
// out, switched or stashed, so whatever is in it stays as it is.
export async function extractRevision(repository, commit) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "chords-screenshots-"));
  const archive = spawn("git", ["-C", repository, "archive", "--format=tar", commit], { stdio: ["ignore", "pipe", "inherit"] });
  const extract = spawn("tar", ["-x", "-C", directory], { stdio: ["pipe", "ignore", "inherit"] });
  archive.stdout.pipe(extract.stdin);
  const [[archived], [extracted]] = await Promise.all([once(archive, "close"), once(extract, "close")]);
  if (archived !== 0 || extracted !== 0) {
    await rm(directory, { recursive: true, force: true });
    throw new Error(`Could not unpack ${commit.slice(0, 12)}`);
  }
  return directory;
}

async function* walk(root, relative) {
  let entries;
  try {
    entries = await readdir(path.join(root, relative), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const next = `${relative}/${entry.name}`;
    if (entry.isDirectory()) yield* walk(root, next);
    else if (entry.isFile()) yield next;
  }
}

// Where each workspace package lives, by the name a dependency calls it.
async function workspaceDirectories(root) {
  const directories = new Map();
  const entries = await readdir(path.join(root, "packages"), { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP.has(entry.name)) continue;
    const manifest = `packages/${entry.name}/package.json`;
    const parsed = await readFile(path.join(root, manifest), "utf8").then(JSON.parse).catch(() => undefined);
    if (parsed?.name) directories.set(parsed.name, `packages/${entry.name}`);
  }
  return directories;
}

// Only what Chords is built from decides whether the checkout's install fits
// a revision: the lockfile, the app's manifest, and the source of the
// workspace packages it reaches, since a dependency link resolves to the
// checkout's copy of those. Anything else in the repository — this tool
// included — can differ freely.
async function installedTree(root, tracked) {
  const files = {};
  const add = async file => {
    if (tracked && !tracked.has(file)) return;
    try {
      files[file] = createHash("sha256").update(await readFile(path.join(root, file))).digest("hex");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  };
  await add("pnpm-lock.yaml");
  await add("pnpm-workspace.yaml");
  await add("package.json");
  await add(`${APP}/package.json`);

  const directories = await workspaceDirectories(root);
  const manifests = [`${APP}/package.json`];
  const seen = new Set();
  while (manifests.length) {
    const manifest = manifests.shift();
    const parsed = await readFile(path.join(root, manifest), "utf8").then(JSON.parse).catch(() => undefined);
    const dependencies = { ...parsed?.dependencies, ...parsed?.devDependencies };
    for (const [name, range] of Object.entries(dependencies)) {
      if (!String(range).startsWith("workspace:")) continue;
      const directory = directories.get(name);
      if (!directory || seen.has(directory)) continue;
      seen.add(directory);
      manifests.push(`${directory}/package.json`);
      for await (const file of walk(root, directory)) await add(file);
    }
  }
  return files;
}

// Building a revision against the checkout's install saves an install per
// revision. It is only allowed while the two agree about what is installed.
export async function shareDependencies(repository, snapshot, ref) {
  // A revision holds what Git holds. Comparing the checkout's tracked files
  // keeps ignored working files out of the answer.
  const { stdout } = await run("git", ["-C", repository, "ls-files", "-z"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const tracked = new Set(stdout.split("\0").filter(Boolean));
  const [checkout, revision] = await Promise.all([installedTree(repository, tracked), installedTree(snapshot, null)]);
  const differences = compareTrees(checkout, revision);
  if (differences.length) throw compatibilityError(ref, differences);
  for (const directory of ["", "apps/chords"]) {
    await symlink(path.join(repository, directory, "node_modules"), path.join(snapshot, directory, "node_modules"), "dir");
  }
}
