// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const IMPORT_TIMEOUT = 30_000;

function deckRow(page: Page, name: string) {
  return page.locator(".deck-row").filter({
    has: page.locator(".deck-name", { hasText: new RegExp(`^${name}$`) }),
  });
}

async function settle(page: Page): Promise<void> {
  await expect(deckRow(page, "Guitar Fretboard")).toBeVisible({ timeout: IMPORT_TIMEOUT });
  await expect
    .poll(() => page.evaluate(async () => {
      const manifest: readonly { id: string; version: string }[] = await (await fetch("/__dev_deck/manifest")).json();
      const versions: Record<string, string> = JSON.parse(localStorage.getItem("music-flashcards:dev-deck-versions") ?? "{}");
      return manifest.every(({ id, version }) => versions[id] === version);
    }), { timeout: IMPORT_TIMEOUT })
    .toBe(true);
  await expect(page.locator(".preparing")).toHaveCount(0, { timeout: IMPORT_TIMEOUT });
  await expect(page.locator(".importing")).toHaveCount(0, { timeout: IMPORT_TIMEOUT });
}

// The tuning of every guitar note in the database, as one string per package.
function storedTunings(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate(async () => {
    const dbPath = "/src/lib/db.ts";
    const { db } = await import(dbPath);
    const notes = await db.notes.where("pkg").anyOf(["Guitar Intervals", "Guitar Fretboard"]).toArray();
    const result: Record<string, Set<string>> = {};
    for (const note of notes) (result[note.pkg] ??= new Set()).add(note.fields[8]);
    return Object.fromEntries(Object.entries(result).map(([pkg, tunings]) => [pkg, [...tunings]]));
  });
}

test("draws both guitar decks for the chosen instrument and keeps each instrument's progress apart", async ({ page, shot }) => {
  await page.goto("/");
  await settle(page);
  const intervals = deckRow(page, "Guitar Intervals");
  const dialog = page.getByRole("dialog", { name: "What to ask" });
  const preset = dialog.getByLabel("Instrument preset");
  const map = dialog.getByRole("region", { name: "Question map" });

  // The map redraws for the instrument being chosen, before it is applied.
  await intervals.getByRole("button", { name: "What Guitar Intervals asks" }).click();
  await expect(preset).toHaveValue("guitar-6");
  await expect(map.getByRole("table")).toHaveCount(6);
  await expect(dialog).toContainText("118 / 220 shapes selected");
  await preset.selectOption("bass-4");
  await expect(map.getByRole("table")).toHaveCount(4);
  await expect(map.locator(".roots .cell")).toHaveCount(4 * (4 * 13 - 1));
  await expect(dialog).toContainText("APPLY updates both decks.");
  await shot("bass-question-map");
  await dialog.getByRole("button", { name: "CANCEL" }).click();
  expect(await storedTunings(page)).toEqual({
    "Guitar Intervals": ["64 59 55 50 45 40"],
    "Guitar Fretboard": ["64 59 55 50 45 40"],
  });

  await intervals.getByRole("button", { name: "What Guitar Intervals asks" }).click();
  await preset.selectOption("bass-4");
  await dialog.getByRole("button", { name: "APPLY" }).click();
  await expect.poll(() => storedTunings(page), { timeout: IMPORT_TIMEOUT }).toEqual({
    "Guitar Intervals": ["43 38 33 28"],
    "Guitar Fretboard": ["43 38 33 28"],
  });
  await expect(page.locator(".importing")).toHaveCount(0, { timeout: IMPORT_TIMEOUT });

  // Every guitar deck's gear offers the same instrument.
  await deckRow(page, "Position → Note").getByRole("button", { name: "What Position → Note asks" }).click();
  await expect(preset).toHaveValue("bass-4");
  await expect(dialog.getByRole("slider", { name: "Learning range" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "CANCEL" }).click();

  // The cards are drawn on four strings and sounded on them.
  await intervals.locator(".deck-study").click();
  await expect(page.locator(".count.new")).not.toHaveText("0");
  const card = page.frameLocator('iframe[title="card"]');
  await expect(card.locator(".fret-window-board")).toHaveAttribute("data-strings", "4");
  await shot("bass-interval-card");
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await page.getByRole("button", { name: /GOOD/ }).click();
  const keys: string[] = await page.evaluate(async () => {
    const dbPath = "/src/lib/db.ts";
    const { db } = await import(dbPath);
    return (await db.states.toArray()).map((state: { key: string }) => state.key);
  });
  expect(keys).toHaveLength(1);
  expect(keys[0]).toContain("43-38-33-28");
  await page.getByRole("button", { name: "Back" }).click();
  await deckRow(page, "Position → Note").locator(".deck-study").click();
  await expect(page.locator(".count.new")).not.toHaveText("0");
  await expect(card.locator(".fretboard__string")).toHaveCount(4);
  await expect(card.locator("[data-fret-cell]")).toHaveCount(4 * 25);
  await shot("bass-fretboard-card");
  await page.getByRole("button", { name: "Back" }).click();

  // The setting survives a reload, and the bundled guitar decks do not come
  // back over it.
  await page.reload();
  await settle(page);
  expect(await storedTunings(page)).toEqual({
    "Guitar Intervals": ["43 38 33 28"],
    "Guitar Fretboard": ["43 38 33 28"],
  });

  // Back on a guitar, the bass's answer is not the guitar's progress.
  await intervals.getByRole("button", { name: "What Guitar Intervals asks" }).click();
  await preset.selectOption("guitar-6");
  await dialog.getByRole("button", { name: "APPLY" }).click();
  await expect.poll(() => storedTunings(page), { timeout: IMPORT_TIMEOUT }).toEqual({
    "Guitar Intervals": ["64 59 55 50 45 40"],
    "Guitar Fretboard": ["64 59 55 50 45 40"],
  });
  await expect(page.locator(".importing")).toHaveCount(0, { timeout: IMPORT_TIMEOUT });
  await expect(intervals.locator(".count.learn")).toHaveText("0");
  await intervals.getByRole("button", { name: "What Guitar Intervals asks" }).click();
  await expect(dialog).toContainText("118 / 220 shapes selected");
  await dialog.getByRole("button", { name: "CANCEL" }).click();
});
