// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

const PROJECT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEV_DECK_PREFIX = "/__dev_deck";
// The order the app imports them in, and so the order the deck list fills up:
// the decks that are visible by default and cheap to import come first, and
// the fretboard deck — 13 MB and over a thousand SVGs — comes last, since it
// alone costs more than the other three together. The circle of fifths deck is
// an advanced deck, hidden until the user asks for it, so it waits its turn.
const BUNDLED_DECKS = [
  {
    id: "music-staff",
    filename: "music-staff.json",
    sourcePath: resolve(
      PROJECT_DIRECTORY,
      "../../decks/music-staff/dist/music-staff.json",
    ),
  },
  {
    id: "intervals",
    filename: "intervals.json",
    sourcePath: resolve(
      PROJECT_DIRECTORY,
      "../../decks/intervals/dist/intervals.json",
    ),
  },
  {
    id: "guitar-intervals",
    filename: "guitar-intervals.json",
    sourcePath: resolve(
      PROJECT_DIRECTORY,
      "../../decks/guitar-intervals/dist/guitar-intervals.json",
    ),
  },
  {
    id: "circle-of-fifths",
    filename: "circle-of-fifths-intervals.json",
    sourcePath: resolve(
      PROJECT_DIRECTORY,
      "../../decks/circle-of-fifths/dist/circle-of-fifths-intervals.json",
    ),
  },
  {
    id: "guitar-fretboard",
    filename: "guitar-fretboard-notes.json",
    sourcePath: resolve(
      PROJECT_DIRECTORY,
      "../../decks/guitar-fretboard/dist/guitar-fretboard-notes.json",
    ),
  },
] as const;

export default defineConfig(({ mode }) => ({
  ...(mode === "test"
    ? { resolve: { conditions: ["browser"] } }
    : {}),
  server: {
    // Listen on every interface so the app can be opened from a phone on the
    // LAN, not just localhost. Vite rejects unknown Host headers by default
    // (DNS-rebinding protection), so this machine's hostname is allowed too.
    host: true,
    allowedHosts: ["wsh24b"],
    port: 17381,
    strictPort: true,
  },
  plugins: [
    devDeckPlugin(),
    bundledDeckManifestPlugin(),
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Music Flashcards",
        short_name: "Music Cards",
        description: "Music theory flashcards in the browser",
        theme_color: "#2196f3",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // The deck JSON is imported into IndexedDB on the first visit, so a
        // second copy in the service worker cache would only make that visit
        // download the same ~15 MB twice. The manifest stays precached, so an
        // offline launch can still see that no deck changed.
        globPatterns: ["**/*.{js,css,html,svg}", "decks/manifest.json"],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));

function devDeckPlugin(): Plugin {
  return {
    name: "music-flashcards-dev-deck",
    apply: "serve",
    configureServer(server) {
      for (const deck of BUNDLED_DECKS) server.watcher.add(deck.sourcePath);

      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname === `${DEV_DECK_PREFIX}/manifest`) {
          try {
            const entries = (
              await Promise.all(BUNDLED_DECKS.map(devDeckManifestEntry))
            ).filter((entry) => entry !== null);
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");
            response.end(JSON.stringify(entries));
          } catch (error) {
            next(error as Error);
          }
          return;
        }

        const id = url.pathname.startsWith(`${DEV_DECK_PREFIX}/`)
          ? decodeURIComponent(url.pathname.slice(DEV_DECK_PREFIX.length + 1))
          : null;
        const deck = BUNDLED_DECKS.find((candidate) => candidate.id === id);
        if (!deck) {
          next();
          return;
        }
        try {
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.setHeader(
            "Content-Disposition",
            `inline; filename="${deck.filename}"`,
          );
          response.end(await readFile(deck.sourcePath));
        } catch (error) {
          if (isMissingFile(error)) {
            response.statusCode = 404;
            response.end("web deck has not been generated yet");
          } else {
            next(error as Error);
          }
        }
      });

      const notificationTimers = new Map<
        string,
        ReturnType<typeof setTimeout>
      >();
      const notifyChanged = (changedPath: string): void => {
        const deck = BUNDLED_DECKS.find(
          (candidate) => candidate.sourcePath === resolve(changedPath),
        );
        if (!deck) return;
        const oldTimer = notificationTimers.get(deck.id);
        if (oldTimer) clearTimeout(oldTimer);
        notificationTimers.set(
          deck.id,
          setTimeout(() => {
            notificationTimers.delete(deck.id);
            server.ws.send({
              type: "custom",
              event: "dev-deck-updated",
              data: { id: deck.id },
            });
          }, 150),
        );
      };
      server.watcher.on("add", notifyChanged);
      server.watcher.on("change", notifyChanged);
      server.httpServer?.once("close", () => {
        server.watcher.off("add", notifyChanged);
        server.watcher.off("change", notifyChanged);
        for (const timer of notificationTimers.values()) clearTimeout(timer);
      });
    },
  };
}

async function devDeckManifestEntry(deck: (typeof BUNDLED_DECKS)[number]) {
  try {
    const metadata = await stat(deck.sourcePath);
    return {
      id: deck.id,
      filename: deck.filename,
      url: `${DEV_DECK_PREFIX}/${deck.id}`,
      version: `${metadata.size}:${metadata.mtimeMs}`,
      lastModified: metadata.mtimeMs,
    };
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

function bundledDeckManifestPlugin(): Plugin {
  return {
    name: "music-flashcards-bundled-deck-manifest",
    apply: "build",
    async buildStart() {
      const decks = await Promise.all(
        BUNDLED_DECKS.map(async ({ id, filename }) => {
          const data = await readFile(
            resolve(PROJECT_DIRECTORY, "public/decks", filename),
          );
          return {
            id,
            filename,
            url: `/decks/${filename}`,
            version: createHash("sha256").update(data).digest("hex"),
          };
        }),
      );
      this.emitFile({
        type: "asset",
        fileName: "decks/manifest.json",
        source: JSON.stringify({
          format: "web-music-flashcards-manifest",
          version: 1,
          decks,
        }),
      });
    },
  };
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
