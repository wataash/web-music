// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The page left on learnmusic.wataash.com carries the progress stored under
// that domain over to this app, in the URL fragment. Storage is per-origin —
// the whole reason the page exists — so the test serves it from an origin of
// its own, catches the redirect it makes, and hands the app the fragment it
// built. Delete this along with deploy/old-domain/ once the old domain is
// retired.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = readFileSync(
  resolve(HERE, "../../../deploy/old-domain/index.html"),
  "utf8",
);
const OLD_ORIGIN = "https://learnmusic.wataash.example";
const NEW_HOME = "https://mf.wataash.com/";
const IMPORT_TIMEOUT = 30_000;

// The old page is served from its own origin, and the domain it moves on to is
// caught rather than followed: the app under test is on localhost. Where it
// went is read off the page rather than off the request, since a fragment is
// never sent to a server — which is what makes it the right place for this.
async function serveOldDomain(page: Page): Promise<void> {
  await page.route(`${OLD_ORIGIN}/`, (route) =>
    route.fulfill({ contentType: "text/html", body: PAGE }),
  );
  // Somewhere on that origin to write its storage from: the page itself moves
  // on as soon as it loads, taking its execution context with it.
  await page.route(`${OLD_ORIGIN}/seed`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>seed</p>" }),
  );
  await page.route(`${NEW_HOME}**`, (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>moved</p>" }),
  );
}

async function storeProgress(
  page: Page,
  cards: readonly string[],
  answers: readonly string[],
): Promise<void> {
  await page.evaluate(
    async ([keys, eventIds]) => {
      await new Promise<void>((done, fail) => {
        const request = indexedDB.open("music-flashcards", 2);
        request.onupgradeneeded = () => {
          const database = request.result;
          database.createObjectStore("states", { keyPath: "key" });
          database.createObjectStore("revlog", {
            keyPath: "id",
            autoIncrement: true,
          });
        };
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(
            ["states", "revlog"],
            "readwrite",
          );
          for (const key of keys) {
            transaction.objectStore("states").put({
              key,
              fsrs: { due: 1, state: 1 },
              due: 1,
              stateKind: "learning",
              introducedDay: 1,
              updatedAt: 1,
              updatedBy: `old:${key}`,
            });
          }
          for (const eventId of eventIds) {
            transaction.objectStore("revlog").add({
              eventId,
              deviceId: "old",
              key: keys[0],
              rating: 3,
              ts: 1,
            });
          }
          transaction.oncomplete = () => {
            database.close();
            done();
          };
          transaction.onerror = () => fail(transaction.error);
        };
        request.onerror = () => fail(request.error);
      });
      localStorage.setItem("music-flashcards:hidden-decks", '["Intervals"]');
      localStorage.setItem("music-flashcards:review-device-id", "old-device");
    },
    [cards, answers] as const,
  );
}

test("moves the progress on with the reader", async ({ page, shot }) => {
  await serveOldDomain(page);

  await page.goto(`${OLD_ORIGIN}/seed`);
  await storeProgress(page, ["a#0", "b#0"], ["e1", "e2", "e3"]);

  await page.goto(`${OLD_ORIGIN}/`);
  await page.waitForURL(/^https:\/\/mf\.wataash\.com\/#import=/);

  // The app is on localhost, so it is handed the fragment the old page built.
  const fragment = new URL(page.url()).hash;
  await page.goto(`/${fragment}`);
  await expect(page.getByRole("status")).toHaveText(
    /Brought 2 cards and 3 answers over from learnmusic\.wataash\.com\./,
    { timeout: IMPORT_TIMEOUT },
  );

  await shot("handed-over");

  // Taken out of the address bar, so a reload cannot apply it twice and the
  // URL is not carrying the reader's progress around.
  expect(await page.evaluate(() => location.hash)).toBe("");

  // The deck the old browser had turned off is off here too, and the schedule
  // it sent is in this database.
  const restored = await page.evaluate(
    async () =>
      await new Promise<{ states: number; revlog: number }>((done, fail) => {
        const request = indexedDB.open("music-flashcards");
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(
            ["states", "revlog"],
            "readonly",
          );
          const states = transaction.objectStore("states").count();
          const revlog = transaction.objectStore("revlog").count();
          transaction.oncomplete = () => {
            database.close();
            done({ states: states.result, revlog: revlog.result });
          };
          transaction.onerror = () => fail(transaction.error);
        };
        request.onerror = () => fail(request.error);
      }),
  );
  expect(restored).toEqual({ states: 2, revlog: 3 });
  expect(
    await page.evaluate(() =>
      localStorage.getItem("music-flashcards:hidden-decks"),
    ),
  ).toBe('["Intervals"]');
  // The device id belongs to the browser it was made in, not to the reader.
  expect(
    await page.evaluate(() =>
      localStorage.getItem("music-flashcards:review-device-id"),
    ),
  ).not.toBe("old-device");
});

test("moves a browser that studied nothing straight on", async ({ page }) => {
  await serveOldDomain(page);

  await page.goto(`${OLD_ORIGIN}/`);
  await page.waitForURL(NEW_HOME);
});

test("asks for a file when there is too much to send in a link", async ({
  page,
  shot,
}) => {
  await serveOldDomain(page);

  await page.goto(`${OLD_ORIGIN}/seed`);
  // Past the fragment limit once compressed: the keys are random, so they do
  // not pack down the way a real deck's would.
  const keys = await page.evaluate(() =>
    Array.from(
      { length: 4000 },
      () => `${crypto.randomUUID()}${crypto.randomUUID()}#0`,
    ),
  );
  await storeProgress(page, keys, []);

  await page.goto(`${OLD_ORIGIN}/`);
  await expect(page.locator("#status")).toHaveText(
    "Your progress is too large to send in a link.",
  );
  await expect(page.locator("#counts")).toHaveText(
    "4000 cards studied, 0 answers recorded.",
  );
  await shot("old-domain-too-large");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "EXPORT PROGRESS" }).click(),
  ]);
  const written = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(written.format).toBe("music-flashcards-backup");
  expect(written.states).toHaveLength(4000);
  expect(page.url()).toBe(`${OLD_ORIGIN}/`);
});
