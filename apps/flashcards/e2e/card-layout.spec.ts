// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";

async function arrange(page: Page) {
  await page.getByRole("button", { name: "Deck actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Arrange card", exact: true }).click();
}
async function enlargeKeyboard(page: Page) {
  const keyboard = page.frameLocator('iframe[title="card"]').locator('[data-card-part="keyboard"]');
  for (let i = 0; i < 9; i++) {
    const box = (await keyboard.boundingBox())!;
    await page.mouse.move(195, box.y + box.height / 2);
    await page.mouse.wheel(0, -100);
    await expect(page.getByRole("group", { name: "Arrange card", exact: true })).toContainText("Keyboard");
  }
}

test.use({ viewport: { width: 390, height: 844 } });
test("keeps zoom and position per key count across navigation and reset", async ({ page, shot }) => {
  await page.addInitScript(() => {
    if (window !== window.top) return;
    // A previous long keyboard must not crop the ordinary 13-key card.
    localStorage.setItem("music-flashcards:card-scales", JSON.stringify({ keyboard: 2, board: 2 }));
  });
  await page.goto("/");
  const staffDeck = page.locator('[data-deck="Music Staff::Staff → Note::Treble Clef"] .deck-study');
  await expect(staffDeck).toBeVisible({ timeout: 30_000 });
  await staffDeck.click({ position: { x: 20, y: 20 } });
  const root = page.frameLocator('iframe[title="card"]').locator("html");
  const scale = () => root.evaluate(element => element.style.getPropertyValue("--keyboard-scale"));
  await expect.poll(scale).toBe("1");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "CHOOSE DECKS", exact: true }).click();
  const chooser = page.getByRole("dialog", { name: "Decks", exact: true });
  await chooser.getByRole("checkbox", { name: "(Experimental) Music Staff (Movable Do)", exact: true }).check();
  await chooser.getByRole("button", { name: "APPLY", exact: true }).click();
  // Start from the parent: settings must still come from the actual Solfege card.
  const movable = page.locator('[data-deck="Music Staff (Movable Do)"] .deck-study').first();
  await movable.click({ position: { x: 20, y: 20 } });
  const keyboard = page.frameLocator('iframe[title="card"]').locator('[data-card-part="keyboard"]');
  await expect(page.frameLocator('iframe[title="card"]').locator('svg.keyboard [data-semitone]')).toHaveCount(25);
  await arrange(page);
  await enlargeKeyboard(page);
  await expect.poll(async () => Number(await scale())).toBeGreaterThan(1.8);
  const largeScale = await scale();
  const box = (await keyboard.boundingBox())!;
  await page.mouse.move(195, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(210, box.y + box.height / 2 + 25, { steps: 5 });
  await page.mouse.up();
  const offset = () => root.evaluate(element => element.style.getPropertyValue("--keyboard-y"));
  const moved = await offset();
  expect(moved).not.toBe("0vh");
  const keys = page.getByRole("slider", { name: "Reference keyboard keys", exact: true });
  await keys.fill("13");
  await expect.poll(scale).toBe("1");
  await expect.poll(offset).toBe("0vh");
  const small = (await keyboard.boundingBox())!;
  expect(small.x).toBeGreaterThanOrEqual(0);
  expect(small.x + small.width).toBeLessThanOrEqual(390);
  await shot("13-keys-without-inherited-zoom");
  await keys.fill("25");
  await expect.poll(scale).toBe(largeScale);
  await expect.poll(offset).toBe(moved);
  await page.getByRole("button", { name: "DONE", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await staffDeck.click({ position: { x: 20, y: 20 } });
  await expect.poll(scale).toBe("1");
  await arrange(page);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "DONE", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await movable.click({ position: { x: 20, y: 20 } });
  await expect.poll(scale).toBe(largeScale);
  await expect.poll(offset).toBe(moved);
  await page.reload();
  await expect.poll(scale).toBe(largeScale);
  await shot("restored-25-key-layout");
});
