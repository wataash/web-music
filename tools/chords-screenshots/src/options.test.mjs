// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseOptions } from "./options.mjs";

const context = { repository: "/repo", defaultSongs: "/repo/tools/chords-screenshots/songs.json" };
const required = ["--before", "base", "--after", "main", "--output", "/tmp/example", "--playlist", "/tmp/jazz.html"];
const android = [...required, "--browser", "android", "--device", "emulator-5554"];

describe("options", () => {
  it("captures in this machine's Chrome unless told otherwise", () => {
    const options = parseOptions(required, context);

    assert.deepEqual(options, {
      before: "base", after: "main", output: "/tmp/example", browser: "chrome", device: null, irealDir: null,
      playlist: "/tmp/jazz.html", songs: context.defaultSongs, previewPort: 4173, cdpPort: 19222,
    });
  });

  it("takes a device only for the browser that has one", () => {
    assert.equal(parseOptions(android, context).device, "emulator-5554");
    assert.throws(() => parseOptions([...required, "--browser", "android"], context), /Missing --device/);
    assert.throws(() => parseOptions([...required, "--device", "emulator-5554"], context), /--device only applies to --browser android/);
    assert.throws(() => parseOptions([...required, "--browser", "safari"], context), /--browser must be chrome or android/);
  });

  it("takes iReal captures to stand beside the revisions", () => {
    assert.equal(parseOptions([...required, "--ireal-dir", "/tmp/ireal"], context).irealDir, "/tmp/ireal");
  });

  it("takes the same revision twice, which captures the run against itself", () => {
    const options = parseOptions(["--before", "main", "--after", "main", ...required.slice(4)], context);

    assert.equal(options.before, "main");
    assert.equal(options.after, "main");
  });

  it("keeps captures out of the repository", () => {
    assert.throws(() => parseOptions([...required.slice(0, 5), "/repo/tools/chords-screenshots/out", ...required.slice(6)], context),
      /must be outside the repository/);
    assert.throws(() => parseOptions([...required.slice(0, 5), "/repo", ...required.slice(6)], context), /must be outside/);
    assert.throws(() => parseOptions([...required.slice(0, 5), "/repo/..hidden", ...required.slice(6)], context), /must be outside/);
  });

  it("rejects a missing option, an unknown one and a bad port", () => {
    assert.throws(() => parseOptions(required.slice(0, 6), context), /Missing --playlist/);
    assert.throws(() => parseOptions([...required, "--colour", "dark"], context), /Unknown option: --colour/);
    assert.throws(() => parseOptions([...required, "--cdp-port", "80"], context), /--cdp-port must be a port/);
    assert.throws(() => parseOptions([...required, "--songs"], context), /--songs needs a value/);
    assert.throws(() => parseOptions([...android, "--device", "other"], context), /--device was given twice/);
  });
});
