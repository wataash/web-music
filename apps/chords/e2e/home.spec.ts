// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "@playwright/test";

test("opens chords directly and keeps the practice position after reload", async ({ page }) => {
  const deckRequests: string[] = [];
  page.on("request", request => {
    if (/\/decks\/|\/__dev_deck\//.test(request.url())) deckRequests.push(request.url());
  });
  await page.goto("/");
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await expect(page).toHaveTitle("Chord Positions");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("[data-chord-practice]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to decks" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "CHORDS", exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Import iReal Pro charts', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close song library' }).click();
  const number = page.getByLabel("Chord number", { exact: true });
  await number.fill("2");
  await number.press("Tab");
  await page.reload();
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await expect(number).toHaveValue("2");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-chord-practice]")).toBeVisible();
  expect(deckRequests).toEqual([]);
});
