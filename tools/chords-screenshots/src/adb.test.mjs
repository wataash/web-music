// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mappingState, parseMappings } from "./adb.mjs";

// `adb forward --list` names the device; `adb reverse --list` names the
// connection and only ever covers the device asked about.
const FORWARD = `emulator-5554 tcp:19222 localabstract:chrome_devtools_remote
emulator-5556 tcp:19333 localabstract:chrome_devtools_remote`;
const REVERSE = "host-15 tcp:17383 tcp:17383";

describe("adb mappings", () => {
  it("reads the device, the local spec and the remote spec", () => {
    assert.deepEqual(parseMappings(FORWARD), [
      { owner: "emulator-5554", local: "tcp:19222", remote: "localabstract:chrome_devtools_remote" },
      { owner: "emulator-5556", local: "tcp:19333", remote: "localabstract:chrome_devtools_remote" },
    ]);
    assert.deepEqual(parseMappings(REVERSE), [{ owner: "host-15", local: "tcp:17383", remote: "tcp:17383" }]);
  });

  it("reuses the mapping this device already has", () => {
    const state = mappingState(parseMappings(FORWARD), {
      serial: "emulator-5554", local: "tcp:19222", remote: "localabstract:chrome_devtools_remote",
    });

    assert.equal(state, "present");
  });

  it("treats another device's forward on the same host port as taken", () => {
    const state = mappingState(parseMappings(FORWARD), {
      serial: "emulator-5554", local: "tcp:19333", remote: "localabstract:chrome_devtools_remote",
    });

    assert.equal(state, "taken");
  });

  it("makes a mapping that is not there, and never takes one that goes elsewhere", () => {
    assert.equal(mappingState(parseMappings(FORWARD), { serial: "emulator-5554", local: "tcp:14000", remote: "tcp:14000" }), "absent");
    assert.equal(mappingState(parseMappings(FORWARD), { serial: "emulator-5554", local: "tcp:19222", remote: "tcp:9000" }), "taken");
  });

  it("compares a reverse by its ports alone, since its first name is not a serial", () => {
    assert.equal(mappingState(parseMappings(REVERSE), { local: "tcp:17383", remote: "tcp:17383" }), "present");
    assert.equal(mappingState(parseMappings(REVERSE), { local: "tcp:17383", remote: "tcp:4173" }), "taken");
    assert.equal(mappingState(parseMappings(REVERSE), { local: "tcp:4173", remote: "tcp:4173" }), "absent");
  });
});
