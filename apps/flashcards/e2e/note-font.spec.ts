// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "@playwright/test";

test("note fonts load in sandboxed cards and persist across screens", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/preview");
  await page.getByLabel("Filter decks").fill("Circle of Fifths / (Experimental) Intervals / Δ3");
  const frame = page.locator("iframe").last().contentFrame();
  for (const font of ["termes", "roboto", "heros"]) {
    await page.getByLabel("Note font", { exact: true }).selectOption(font);
    await expect(frame.locator(".question")).toHaveCSS("font-family", /"?Flashcard Notes"?, serif/);
    await expect.poll(async () => frame.locator("body").evaluate(async () => {
      await document.fonts.ready;
      const faces = [...document.fonts].filter(face => face.family.replaceAll('"', '') === "Flashcard Notes");
      return faces.length === 2 && faces.every(face => face.status === "loaded");
    })).toBe(true);
    const sources = await frame.locator("#card-style").textContent();
    expect(sources).toContain("data:font/woff2;base64,");
    await expect(frame.locator(".keyboard-note-name").first()).toHaveCSS("font-family", /"?Flashcard Notes"?, serif/);
  }
  await page.reload();
  await expect(page.getByLabel("Note font", { exact: true })).toHaveValue("heros");
  await page.goto("/");
  await expect(page.getByLabel("Note font", { exact: true })).toHaveCount(0);
  const row = page.locator(".deck-row").filter({ has: page.locator(".deck-name").and(page.getByText("Treble Clef", { exact: true })) });
  await expect(page.locator(".preparing, .importing")).toHaveCount(0, { timeout: 30_000 });
  await row.locator(".deck-study").click({ timeout: 30_000 });
  await expect(page.locator('iframe[title="card"]')).toBeVisible();
  await page.getByRole("button", { name: "Deck actions" }).click();
  await expect(page.getByLabel("Note font", { exact: true })).toHaveValue("heros");
  const cardStyle = page.locator('iframe[title="card"]').contentFrame().locator("#card-style");
  const previousStyle = await cardStyle.textContent();
  await page.getByLabel("Note font", { exact: true }).selectOption("termes");
  await expect.poll(() => cardStyle.textContent()).not.toBe(previousStyle);
  expect(await cardStyle.textContent()).toContain("data:font/woff2;base64,");
});

test("new and invalid preferences default to Termes", async ({ page }) => {
  await page.goto("/preview");
  await expect(page.getByLabel("Note font", { exact: true })).toHaveValue("termes");
  await page.evaluate(() => localStorage.setItem("music-flashcards:note-font", "unknown"));
  await page.reload();
  await expect(page.getByLabel("Note font", { exact: true })).toHaveValue("termes");
});
