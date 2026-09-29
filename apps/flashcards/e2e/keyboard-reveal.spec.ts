// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "@playwright/test";

for (const [deck, enabled] of [
  ["Guitar Fretboard::Position → Note", false],
  ["Music Staff (Movable Do)", true],
  ["(Experimental) Circle of Fifths", false],
] as const) {
  test(`${deck}: keyboard default, tap reveal and saved visibility`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("music-flashcards:hidden-decks", "[]"));
    await page.goto("/");
    const row = page.locator(`[data-deck="${deck}"]`);
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.locator(".deck-name").click();
    const card = page.frameLocator('iframe[title="card"]');
    await expect(card.locator("main")).toBeVisible();
    const keyboard = card.locator("svg.keyboard");
    await expect(keyboard).toHaveCount(enabled ? 1 : 0);

    await page.getByRole("button", { name: "Deck actions", exact: true }).click();
    const toggle = page.getByRole("menuitemcheckbox", { name: "Keyboard", exact: true });
    await expect(toggle).toHaveAttribute("aria-checked", String(enabled));
    if (!enabled) await toggle.click();
    // Revealing must not depend on whether the deck's sound is enabled.
    const sound = page.getByRole("menuitemcheckbox", { name: "Sound", exact: true });
    if (await sound.getAttribute("aria-checked") === "true") await sound.click();
    await page.keyboard.press("Escape");
    await expect(keyboard).toBeVisible();
    const key = keyboard.locator('[data-semitone="60"]');
    const bounds = (await key.boundingBox())!;
    await key.click({ position: { x: bounds.width / 2, y: bounds.height * 0.9 } });
    await expect(page.getByRole("button", { name: "SHOW ANSWER", exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: /GOOD/ })).toBeVisible();

    await page.reload();
    await expect(keyboard).toBeVisible();
    await page.getByRole("button", { name: "Deck actions", exact: true }).click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await page.keyboard.press("Escape");
    await expect(keyboard).toHaveCount(0);
    await page.reload();
    await expect(card.locator("main")).toBeVisible();
    await expect(keyboard).toHaveCount(0);
  });
}
