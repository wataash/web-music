// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { scramble } from "@web-music/ireal";
import { chartFeaturesFromHtml, chartFeaturesCsv } from "./chart-features.js";

function html(titles = ["First", "Second"], music = "T44C   |G7   Z") {
  const entries = titles.map(title => `${title}=Example==Swing=C==1r34LbKcu7${scramble(music)}==120=2`);
  return `<a href="irealb://${encodeURIComponent(entries.join("===") + "===Test")}">Test</a>`;
}

test("remarks follow stable identities through reordering, limiting and chart edits", () => {
  const original = chartFeaturesFromHtml(html());
  const firstId = original.songs[0].id;
  const secondId = original.songs[1].id;
  const remarks = { [firstId]: '要確認, "注記"\n次の行', [secondId]: "別の備考" };
  assert.match(firstId, /^song-[0-9a-f]{64}$/);
  assert.equal(original.songs[0].remarks, "");
  const reordered = chartFeaturesFromHtml(html(["Second", "First"], "T44F   |C7   Z"), { remarks });
  assert.deepEqual(reordered.songs.map(s => [s.id, s.remarks]), [[secondId, "別の備考"], [firstId, remarks[firstId]]]);
  const limited = chartFeaturesFromHtml(html(), { limit: 1, remarks });
  assert.equal(limited.songs.length, 1);
  assert.equal(limited.songs[0].remarks, remarks[firstId]);
  assert.ok(chartFeaturesCsv(limited).includes('"要確認, ""注記""\n次の行"'));
});

test("invalid remarks and ambiguous identities are rejected", () => {
  const id = chartFeaturesFromHtml(html()).songs[0].id;
  for (const remarks of [null, [], "note", { [id]: 42 }, { typo: "note" }]) {
    assert.throws(() => chartFeaturesFromHtml(html(), { remarks }));
  }
  assert.throws(() => chartFeaturesFromHtml(html(["First", "First"])), /Duplicate song identity/);
});

test("CLI preserves the remarks source and merges it on every regeneration", () => {
  const dir = mkdtempSync(join(tmpdir(), "chart-remarks-"));
  try {
    const input = join(dir, "playlist.html");
    const remarksPath = join(dir, "remarks.json");
    const prefix = join(dir, "features");
    const id = chartFeaturesFromHtml(html()).songs[0].id;
    const remarksSource = JSON.stringify({ [id]: "手入力の備考\n改行あり" }, null, 2) + "\n";
    writeFileSync(input, html());
    writeFileSync(remarksPath, remarksSource);
    const cli = fileURLToPath(new URL("./chart-features-cli.js", import.meta.url));
    const run = outputPrefix => spawnSync(process.execPath,
      [cli, "--limit", "1", "--remarks", remarksPath, "--output-prefix", outputPrefix, input], { encoding: "utf8" });
    for (let iteration = 0; iteration < 2; iteration++) {
      const result = run(prefix);
      assert.equal(result.status, 0, String(result.error ?? result.stderr));
      const report = JSON.parse(readFileSync(`${prefix}.json`, "utf8"));
      assert.equal(report.songs[0].remarks, "手入力の備考\n改行あり");
      assert.equal(readFileSync(`${prefix}.csv`, "utf8"), chartFeaturesCsv(report));
      assert.equal(readFileSync(remarksPath, "utf8"), remarksSource);
    }
    assert.equal(run(join(dir, "remarks")).status, 1);
    symlinkSync(remarksPath, join(dir, "alias.json"));
    assert.equal(run(join(dir, "alias")).status, 1);
    assert.equal(readFileSync(remarksPath, "utf8"), remarksSource);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
