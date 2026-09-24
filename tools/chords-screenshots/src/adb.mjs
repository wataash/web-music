// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

// A line of `adb forward --list` or `adb reverse --list` ends with the two
// specs. What comes first is the device for a forward, where the list covers
// every device, and a connection name such as `host-15` for a reverse, where
// it covers only the device asked about.
export function parseMappings(text) {
  return text.split("\n").map(line => line.trim().split(/\s+/)).filter(parts => parts.length >= 2)
    .map(parts => ({ owner: parts.length >= 3 ? parts[0] : null, local: parts.at(-2), remote: parts.at(-1) }));
}

// Whether this mapping has to be made, is already the one wanted, or belongs
// to something else — another session, or another device — and must be left
// alone. `serial` is given for a forward, whose local ports are the host's
// and shared between devices; a reverse names no device to compare.
export function mappingState(mappings, { serial = null, local, remote }) {
  const existing = mappings.find(mapping => mapping.local === local);
  if (!existing) return "absent";
  if (serial && existing.owner && existing.owner !== serial) return "taken";
  return existing.remote === remote ? "present" : "taken";
}

// Every call names the device: another device, or another session on this one,
// is never touched.
export class Device {
  #serial;
  #added = [];

  constructor(serial) {
    this.#serial = serial;
  }

  async #adb(...args) {
    const { stdout } = await run("adb", ["-s", this.#serial, ...args], { encoding: "utf8" });
    return stdout;
  }

  async check() {
    const { stdout } = await run("adb", ["devices"], { encoding: "utf8" });
    const listed = stdout.split("\n").some(line => line.trim().split(/\s+/).join(" ") === `${this.#serial} device`);
    if (!listed) throw new Error(`adb has no device "${this.#serial}" (start it, or check \`adb devices\`)`);
  }

  // Adds a mapping only when it is missing, and remembers only what it added.
  // `--no-rebind` makes adb refuse rather than take over a mapping that
  // appeared between the listing and the call.
  async #map(kind, local, remote) {
    const mappings = parseMappings(await this.#adb(kind, "--list"));
    const serial = kind === "forward" ? this.#serial : null;
    const state = mappingState(mappings, { serial, local, remote });
    if (state === "taken") {
      const existing = mappings.find(mapping => mapping.local === local);
      throw new Error(`adb ${kind} ${local} already goes to ${existing.remote}${serial && existing.owner ? ` on ${existing.owner}` : ""}; choose another port`);
    }
    if (state === "present") return;
    await this.#adb(kind, "--no-rebind", local, remote);
    this.#added.push([kind, local]);
  }

  forward(localPort, remoteSpec) {
    return this.#map("forward", `tcp:${localPort}`, remoteSpec);
  }

  reverse(devicePort, hostPort) {
    return this.#map("reverse", `tcp:${devicePort}`, `tcp:${hostPort}`);
  }

  async release() {
    for (const [kind, local] of this.#added.reverse()) {
      await this.#adb(kind, "--remove", local).catch(() => { /* already gone */ });
    }
    this.#added = [];
  }
}
