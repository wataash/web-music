// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { extractSource } from "./extract-source.js";

const html = music => `<a href="irealb://${encodeURIComponent("Example===Swing=C==1r34LbKcu7" + music + "==0=0")}">import</a>`;

test("CLI supports stdin and both output formats and reports errors", () => {
  const run = (args, input) => spawnSync(process.execPath, [new URL("./extract.js", import.meta.url).pathname, ...args], { input, encoding: "utf8" });
  const plain = run(["--output", "chords", "-"], "[C][G7]");
  assert.equal(plain.status, 0, String(plain.error ?? plain.stderr));
  assert.equal(plain.stdout, "C G7\n");
  const json = run(["-"], html("C-7"));
  assert.equal(json.status, 0);
  assert.deepEqual(JSON.parse(json.stdout).chords, ["Cm7"]);
  const invalid = run(["--output", "csv", "-"], "[C]");
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, "");
  assert.match(invalid.stderr, /--output/);
});

test("dispatches explicit and automatic formats and rejects unknown formats", () => {
  for (const format of ["auto", "chordwiki"]) assert.deepEqual(extractSource("[C]", format).chords, ["C"]);
  for (const format of ["auto", "ireal"]) assert.deepEqual(extractSource(html("C-7"), format).chords, ["Cm7"]);
  assert.throws(() => extractSource("[C]", "other"), /Unknown format/);
});
