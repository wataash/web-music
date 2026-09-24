// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { columnsOf, copyIrealCaptures, escapeHtml, galleryPage, pairPage, readIrealCaptures } from "./gallery.mjs";

const report = {
  device: null,
  conditions: ["dark theme", "Chart size: Fit"],
  sides: {
    before: {
      ref: "base", commit: "6a7989998c93daf3b9b3a1760c96c8093a9f6eaf",
      browser: { mode: "chrome", version: "141.0.0.0" }, buildMs: 12000, captureMs: 30000,
      viewport: { width: 412, height: 883, deviceScaleFactor: 2.625 },
      songs: [{ index: 1, file: "01-take-five.png" }],
    },
    after: {
      ref: "main", commit: "4c4173716db96fb561d56c6cb635b7c2bfd9ff48",
      browser: { mode: "chrome", version: "141.0.0.0" }, buildMs: 11000, captureMs: 31000,
      viewport: { width: 412, height: 883, deviceScaleFactor: 2.625 },
      songs: [{ index: 1, file: "01-take-five.png" }],
    },
  },
  songs: [{ index: 1, title: "Take Five", composer: "Desmond Paul", rows: 8, sizes: { before: { width: 400, height: 600 }, after: { width: 400, height: 640 } } }],
};

const withIreal = {
  ...report,
  ireal: { device: "emulator-5554", elapsedMs: 240000, songs: [{ title: "Take Five", composer: "Desmond Paul", file: "take-five.png" }] },
  songs: [{ ...report.songs[0], sizes: { ...report.songs[0].sizes, ireal: { width: 380, height: 610 } } }],
};
const songs = [{ title: "Take Five", composer: "Desmond Paul", label: "Take Five · Desmond Paul" }];

describe("gallery", () => {
  it("points at the captures where they were written, never at a copy", () => {
    const page = galleryPage(report);

    assert.ok(page.includes('src="before/01-take-five.png"'));
    assert.ok(page.includes('src="after/01-take-five.png"'));
    assert.ok(page.includes('href="pairs/01.png"'));
    assert.ok(!page.includes("data:image"));
  });

  it("says which revisions and which conditions the pictures came from", () => {
    const page = galleryPage(report);

    assert.ok(page.includes("6a7989998c93daf3b9b3a1760c96c8093a9f6eaf"));
    assert.ok(page.includes("4c4173716db96fb561d56c6cb635b7c2bfd9ff48"));
    assert.ok(page.includes("chrome"));
    assert.ok(page.includes("141.0.0.0"));
    assert.ok(page.includes("dark theme · Chart size: Fit"));
    assert.ok(page.includes("before built in 12.0s, captured in 30.0s"));
  });

  it("reports how much taller the chart became", () => {
    assert.ok(galleryPage(report).includes("after is 40px taller"));

    const same = { ...report, songs: [{ ...report.songs[0], sizes: { before: { width: 400, height: 600 }, after: { width: 400, height: 600 } } }] };
    assert.ok(galleryPage(same).includes("same height"));
  });

  it("reaches the captures from the pairs directory", () => {
    const page = pairPage(report, report.songs[0]);

    assert.ok(page.includes('src="../before/01-take-five.png"'));
    assert.ok(page.includes("Take Five"));
  });

  it("escapes what it puts in the page", () => {
    assert.equal(escapeHtml('Bat, The & "Co" <b>'), "Bat, The &amp; &quot;Co&quot; &lt;b&gt;");
  });

  it("adds the iReal captures as a third column when there are any", () => {
    assert.deepEqual(columnsOf(report), ["before", "after"]);
    assert.deepEqual(columnsOf(withIreal), ["before", "after", "ireal"]);

    const page = galleryPage(withIreal);
    assert.ok(page.includes('src="ireal/take-five.png"'));
    assert.ok(page.includes("repeat(3, 1fr)"));
    assert.ok(page.includes("emulator-5554"));
    assert.ok(pairPage(withIreal, withIreal.songs[0]).includes('src="../ireal/take-five.png"'));
    assert.ok(galleryPage(report).includes("repeat(2, 1fr)"));
  });

  it("only reports its own times once they are known", () => {
    assert.ok(!galleryPage(report).includes("in all"));
    assert.ok(galleryPage({ ...report, timings: { galleryMs: 9000, totalMs: 120000 } }).includes("gallery 9.0s, 120.0s in all"));
  });
});

describe("iReal captures", () => {
  it("rejects symlinks outside the source and colliding filenames", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ireal-copy-test-"));
    try {
      const source = path.join(root, "source");
      await mkdir(path.join(source, "nested"), { recursive: true });
      await writeFile(path.join(root, "outside.png"), "outside");
      await symlink(path.join(root, "outside.png"), path.join(source, "link.png"));
      await assert.rejects(copyIrealCaptures(source, path.join(root, "output"), [{ file: "link.png" }]), /outside/);
      await writeFile(path.join(source, "same.png"), "one");
      await writeFile(path.join(source, "nested", "same.png"), "two");
      await assert.rejects(copyIrealCaptures(source, path.join(root, "output"), [{ file: "same.png" }, { file: "nested/same.png" }]), /both be written/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("takes one capture per song, matched on title and composer", () => {
    const captures = readIrealCaptures({ songs: [{ title: "Take Five", composer: "Desmond Paul", file: "shots/take-five.png" }] }, songs, "metadata.json");

    assert.deepEqual(captures, [{ title: "Take Five", composer: "Desmond Paul", file: "shots/take-five.png" }]);
  });

  it("refuses a set that is not of the same songs", () => {
    const capture = (song = {}) => ({ songs: [{ title: "Take Five", composer: "Desmond Paul", file: "a.png", ...song }] });

    assert.throws(() => readIrealCaptures({ songs: [] }, songs, "m.json"), /0 captures for 1 songs/);
    assert.throws(() => readIrealCaptures(capture({ title: "Litha" }), songs, "m.json"), /no capture of "Take Five"/);
    assert.throws(() => readIrealCaptures(capture({ composer: "Brubeck Dave" }), songs, "m.json"), /is by "Brubeck Dave" there/);
    assert.throws(() => readIrealCaptures(capture({ file: "" }), songs, "m.json"), /needs a "title", a "composer" and a "file"/);
    assert.throws(() => readIrealCaptures({}, songs, "m.json"), /expected "songs" to be an array/);
  });

  it("refuses a file that points out of the directory", () => {
    const outside = file => readIrealCaptures({ songs: [{ title: "Take Five", composer: "Desmond Paul", file }] }, songs, "m.json");

    assert.throws(() => outside("../take-five.png"), /reaches outside the directory/);
    assert.throws(() => outside("/etc/passwd"), /reaches outside the directory/);
    assert.throws(() => outside("shots/../../take-five.png"), /reaches outside the directory/);
  });
});
