// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The app used to be served from another domain, and a browser keeps each
// domain's storage to itself, so a reader arriving from the old one arrives
// with nothing. The page left behind there hands the progress over in the URL
// fragment — never sent to a server, so it goes from that browser's storage
// straight into this one's. See `deploy/old-domain/index.html` for the half
// that writes it.

import { counted } from "./format";
import { restoreBackup, parseBackupDocument, type BackupDocument } from "./backup";

const HANDOFF_KEY = "import";

export function handoffFromHash(hash: string): string | null {
  const payload = new URLSearchParams(hash.replace(/^#/, "")).get(HANDOFF_KEY);
  return payload === null || payload === "" ? null : payload;
}

export async function decodeHandoff(
  payload: string,
): Promise<BackupDocument> {
  const bytes = fromBase64Url(payload);
  // gzip's magic number. The old page sends the JSON uncompressed where the
  // browser has no CompressionStream, and says so this way rather than in a
  // flag of its own.
  const json =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await gunzip(bytes)
      : new TextDecoder().decode(bytes);
  return parseBackupDocument(JSON.parse(json));
}

function fromBase64Url(payload: string): Uint8Array {
  const binary = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

/** Restore data before the application or its preference modules are loaded. */
export async function receiveHandoff(): Promise<{ notice?: string; error?: string }> {
  const payload = handoffFromHash(location.hash);
  if (payload === null) return {};
  // A reload must not restore twice or keep progress in the address bar.
  history.replaceState(history.state, "", location.pathname + location.search);
  try {
    const summary = await restoreBackup(await decodeHandoff(payload));
    return { notice: "Brought " + counted(summary.statesWritten, "card") + " and " + counted(summary.reviewsAdded, "answer") + " over from learnmusic.wataash.com." };
  } catch (e) {
    // Keep the app usable; the old origin still has the original progress.
    return { error: "The progress from the old domain could not be restored: " + (e instanceof Error ? e.message : String(e)) };
  }
}
