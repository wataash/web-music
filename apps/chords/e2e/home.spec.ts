// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "@playwright/test";
import { openLibrary } from "./helpers";

test("opens chords directly without loading flashcard decks", async ({ page }) => {
  const deckRequests: string[] = [];
  page.on("request", request => {
    if (/\/decks\/|\/__dev_deck\//.test(request.url())) deckRequests.push(request.url());
  });
  await page.goto("/");
  await openLibrary(page);
  await expect(page).toHaveTitle("Chords");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("[data-chord-practice]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to decks" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "CHORDS", exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add chart', exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-chord-practice]")).toBeVisible();
  expect(deckRequests).toEqual([]);
});
