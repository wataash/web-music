// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The app used to be served from another domain, and a browser keeps each
// domain's storage to itself, so a reader arriving from the old one arrives
// with nothing. The page left behind there hands the progress over in the URL
// fragment — never sent to a server, so it goes from that browser's storage
// straight into this one's. See `deploy/old-domain/index.html` for the half
// that writes it.

import { parseBackupDocument, type BackupDocument } from "./backup";

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
