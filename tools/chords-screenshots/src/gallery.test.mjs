// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeHtml, galleryPage, pairPage } from "./gallery.mjs";

const report = {
  device: "emulator-5554",
  conditions: ["dark theme", "Chart size: Fit"],
  sides: {
    before: {
      ref: "base", commit: "6a7989998c93daf3b9b3a1760c96c8093a9f6eaf",
      viewport: { width: 412, height: 883, deviceScaleFactor: 2.625 },
      songs: [{ index: 1, file: "01-take-five.png" }],
    },
    after: {
      ref: "main", commit: "4c4173716db96fb561d56c6cb635b7c2bfd9ff48",
      viewport: { width: 412, height: 883, deviceScaleFactor: 2.625 },
      songs: [{ index: 1, file: "01-take-five.png" }],
    },
  },
  songs: [{ index: 1, title: "Take Five", composer: "Desmond Paul", rows: 8, sizes: { before: { width: 400, height: 600 }, after: { width: 400, height: 640 } } }],
};

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
    assert.ok(page.includes("emulator-5554"));
    assert.ok(page.includes("dark theme · Chart size: Fit"));
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
});
