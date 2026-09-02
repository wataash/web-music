// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { describe, it } from "node:test";

import { readInput } from "./input.js";

const playlist = {
  name: "Standard input",
  songs: [
    {
      key: "C",
      music: { measures: [["C7"]] },
    },
  ],
};

describe("CLI", () => {
  it("reads playlist JSON from standard input", async () => {
    const stdin = Readable.from([JSON.stringify(playlist)]);
    const input = await readInput("-", stdin);

    assert.deepEqual(JSON.parse(input), playlist);
  });
});
