// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "@playwright/test";

test("deck actions align on mobile and wrap without overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const actions = page.locator(".list-toggles .list-action");
  await expect(actions).toHaveCount(3);
  const boxes = await actions.evaluateAll(elements => elements.map(element => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  }));
  expect(new Set(boxes.map(box => box.y + box.height / 2)).size).toBe(1);
  await expect(page.getByRole("link", { name: "PREVIEW DECKS" })).toHaveCSS("text-decoration-line", "none");
  await page.locator(".list-toggles").screenshot({ path: testInfo.outputPath("deck-actions-mobile.png") });
  await page.setViewportSize({ width: 320, height: 844 });
  for (const action of await actions.all()) {
    const box = (await action.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  await page.getByRole("link", { name: "PREVIEW DECKS" }).click();
  await expect(page.getByRole("heading", { name: "Deck preview", exact: true })).toBeVisible();
});

test("preview lists fixed front/back samples without changing storage", async ({ page }, testInfo) => {
  await page.goto("/preview");
  await expect(page.getByRole("status")).toHaveText(/\d+ \/ \d+ decks/, { timeout: 30_000 });
  const before = await page.evaluate(async () => ({
    storage: { ...localStorage },
    databases: await indexedDB.databases(),
  }));
  expect(before.databases).toEqual([]);
  const rows = page.locator("section");
  expect(await rows.count()).toBeGreaterThan(20);
  const names = await rows.locator("h2").allTextContents();
  expect(names.slice(0, 4)).toEqual([
    "Music Staff / Staff → Note / Treble Clef",
    "Music Staff / Staff → Note / Bass Clef",
    "Music Staff / Staff → Note / Alto Clef",
    "Music Staff / Staff → Note / Tenor Clef",
  ]);
  expect(names.at(-2)).toContain("Circle of Fifths / (Experimental) Intervals / ♭3");
  expect(names.at(-1)).toContain("Circle of Fifths / (Experimental) Intervals / Δ3");
  const sample = await rows.first().locator(".sample").textContent();
  await page.getByLabel("Filter decks").fill("Circle of Fifths / (Experimental) Intervals / Δ3");
  await expect(rows).toHaveCount(1);
  const front = rows.locator("iframe").first();
  const back = rows.locator("iframe").last();
  await front.scrollIntoViewIfNeeded();
  await expect(front.contentFrame().locator("svg.keyboard")).toBeVisible();
  await expect(front.contentFrame().locator("svg.keyboard .is-highlighted")).toHaveCount(0);
  await expect(back.contentFrame().locator(".keyboard-degree")).toHaveText("Δ3");
  await page.screenshot({ path: testInfo.outputPath("deck-preview.png"), fullPage: true });
  await expect(front).toHaveCSS("width", "390px");
  await page.getByLabel("Card width").selectOption("640");
  await expect(front).toHaveCSS("width", "640px");
  await page.getByLabel("Optional keyboards").uncheck();
  await expect(front.contentFrame().locator("svg.keyboard")).toHaveCount(0);
  await expect(back.contentFrame().locator("svg.keyboard")).toHaveCount(0);
  expect(await page.evaluate(async () => ({
    storage: { ...localStorage },
    databases: await indexedDB.databases(),
  }))).toEqual(before);
  await page.reload();
  await expect(rows.first().locator(".sample")).toHaveText(sample!);
});

test("Treble Clef preview keeps the octave keyboard aligned with the staff", async ({ page }) => {
  await page.goto("/preview");
  await expect(page.getByRole("status")).toHaveText(/\d+ \/ \d+ decks/, { timeout: 30_000 });
  const row = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Music Staff / Staff → Note / Treble Clef", exact: true }),
  });
  const frames = row.locator("iframe");
  await expect(frames).toHaveCount(2);

  for (const width of [390, 640]) {
    await page.getByLabel("Card width").selectOption(String(width));
    for (const frame of await frames.all()) {
      await frame.scrollIntoViewIfNeeded();
      const card = frame.contentFrame();
      await expect(card.locator("svg.staff")).toBeVisible();
      await expect(card.locator(".keyboard-frame")).toBeVisible();
      const staffWidth = await card.locator("svg.staff").evaluate(element => element.getBoundingClientRect().width);
      const keyboardWidth = await card.locator(".keyboard-frame").evaluate(element => element.getBoundingClientRect().width);
      expect(keyboardWidth).toBe(staffWidth);
    }
  }
});

test("preview exposes fetch errors and retries", async ({ page }) => {
  await page.route("**/__dev_deck/manifest", route => route.fulfill({ status: 503, body: "" }));
  await page.goto("/preview");
  await expect(page.getByRole("alert")).toContainText("503");
  await page.unroute("**/__dev_deck/manifest");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("status")).toHaveText(/\d+ \/ \d+ decks/, { timeout: 30_000 });
});

test("all preview samples keep their staff notes inside the visible crop", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/preview");
  await expect(page.getByRole("status")).toHaveText(/\d+ \/ \d+ decks/, { timeout: 30_000 });
  const rows = page.locator("section");
  for (const width of [390, 640]) {
    await page.getByLabel("Card width").selectOption(String(width));
    for (const [index, row] of (await rows.all()).entries()) {
      const name = await row.locator("h2").textContent();
      for (const iframe of await row.locator("iframe").all()) {
        await iframe.scrollIntoViewIfNeeded();
        const frame = iframe.contentFrame();
        await expect(frame.locator("body")).not.toBeEmpty();
        // Staff images intentionally have negative margins outside their crop.
        // Check the actual ink against the clipping container, not the SVG box.
        for (const head of await frame.locator(".staff__note-head").all()) {
          const bounds = await head.evaluate(element => {
            const note = element.getBoundingClientRect();
            const diagram = element.closest(".diagram")!.getBoundingClientRect();
            return { top: note.top - diagram.top, bottom: diagram.bottom - note.bottom };
          });
          expect(bounds.top, `${name}: note clipped at top (${width}px)`).toBeGreaterThanOrEqual(-1);
          expect(bounds.bottom, `${name}: note clipped at bottom (${width}px)`).toBeGreaterThanOrEqual(-1);
        }
      }
      if (width === 390) {
        await row.screenshot({ path: testInfo.outputPath(`preview-${index}.png`) });
      }
    }
  }
});
