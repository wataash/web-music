// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { BACKUP_FORMAT, BACKUP_VERSION } from "./backup";
import { decodeHandoff, handoffFromHash } from "./handoff";

const BACKUP = {
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: "2026-09-02T03:04:05.678Z",
  states: [
    {
      key: "note#0",
      fsrs: { due: 1 },
      due: 1,
      stateKind: "review",
      introducedDay: 0,
      updatedAt: 1,
      updatedBy: "old:note#0",
    },
  ],
  revlog: [
    { eventId: "e1", deviceId: "old", key: "note#0", rating: 3, ts: 1 },
  ],
  settings: { "music-flashcards:hidden-decks": "[]" },
};

// What the old domain's page builds, in the two shapes it can send.
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

async function gzipped(text: string): Promise<Uint8Array> {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe("reading a hand-off out of the URL", () => {
  it("finds the payload, and nothing where there is none", () => {
    expect(handoffFromHash("#import=abc")).toBe("abc");
    expect(handoffFromHash("import=abc")).toBe("abc");
    expect(handoffFromHash("")).toBeNull();
    expect(handoffFromHash("#")).toBeNull();
    expect(handoffFromHash("#import=")).toBeNull();
    expect(handoffFromHash("#something-else=abc")).toBeNull();
  });

  it("takes a compressed backup", async () => {
    const payload = toBase64Url(await gzipped(JSON.stringify(BACKUP)));
    const decoded = await decodeHandoff(payload);
    expect(decoded.states).toHaveLength(1);
    expect(decoded.revlog[0].eventId).toBe("e1");
    expect(decoded.settings).toEqual({ "music-flashcards:hidden-decks": "[]" });
  });

  it("takes an uncompressed one, from a browser without CompressionStream", async () => {
    const payload = toBase64Url(
      new TextEncoder().encode(JSON.stringify(BACKUP)),
    );
    expect((await decodeHandoff(payload)).states).toHaveLength(1);
  });

  it("refuses a payload that is not a backup", async () => {
    const payload = toBase64Url(new TextEncoder().encode('{"format":"other"}'));
    await expect(decodeHandoff(payload)).rejects.toThrow(
      /not a Music Flashcards backup/,
    );
  });
});
