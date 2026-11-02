// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

test("changes the piano key count beside the live card in Arrange card", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-deck="Music Staff::Staff → Note::Treble Clef"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "CHOOSE DECKS", exact: true }).click();
  const chooser = page.getByRole("dialog", { name: "Decks", exact: true });
  await chooser.getByRole("checkbox", { name: "(Experimental) Music Staff (with Octave Numbers)", exact: true }).check();
  await chooser.getByRole("button", { name: "APPLY", exact: true }).click();
  await page.locator('[data-deck="Music Staff (with Octave Numbers)::Staff → Note::Treble Clef"] .deck-study').click({ position: { x: 20, y: 20 } });
  await expect(page.locator(".count.new")).not.toHaveText("0");
  await page.getByRole("button", { name: "Deck actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Arrange card", exact: true }).click();
  const count = page.getByRole("combobox", { name: "Piano keys", exact: true });
  await expect(count).toHaveValue("88");
  const keyboard = page.frameLocator('iframe[title="card"]').locator("svg.keyboard");
  const full = await keyboard.getAttribute("viewBox");
  await count.selectOption("49");
  await expect(page.frameLocator('iframe[title="card"]').locator("html")).toHaveAttribute("data-piano-keys", "49");
  expect(await keyboard.getAttribute("viewBox")).not.toBe(full);
  await page.getByRole("button", { name: "DONE", exact: true }).click();
  expect(await page.evaluate(() => (Object.values(JSON.parse(localStorage.getItem("music-flashcards:card-layouts")!))[0] as { pianoKeys: number }).pianoKeys)).toBe(49);
});

test("keeps details available and shows layout instructions only on first use", async ({ page }) => {
  await page.goto("/");
  const deck = page.locator('[data-deck="Music Staff::Staff → Note::Treble Clef"]');
  await expect(deck).toBeVisible({ timeout: 30_000 });
  const about = page.locator("footer.legal details");
  await expect(about).not.toHaveAttribute("open");
  await about.locator("summary").click();
  await expect(about.getByText("Anki is a trademark", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "BACKUP", exact: true }).click();
  const backup = page.getByRole("dialog", { name: "Backup", exact: true });
  await expect(backup).toContainText("Back up progress and settings.");
  await expect(backup.locator("details")).not.toHaveAttribute("open");
  await backup.locator("summary").click();
  await expect(backup.locator("details")).toHaveAttribute("open");
  await backup.getByRole("button", { name: "CANCEL", exact: true }).click();

  await deck.locator(".deck-study").click();
  await expect(page.locator(".count.new")).not.toHaveText("0");
  const openLayout = async () => {
    await page.getByRole("button", { name: "Deck actions", exact: true }).click();
    await page.getByRole("menuitem", { name: "Arrange card" }).click();
  };
  await openLayout();
  const toolbar = page.getByRole("group", { name: "Arrange card", exact: true });
  const help = toolbar.locator("details");
  await expect(help).toHaveAttribute("open");
  await toolbar.getByRole("button", { name: "DONE", exact: true }).click();
  await expect(toolbar).toBeHidden();
  await openLayout();
  await expect(help).not.toHaveAttribute("open");
  await help.locator("summary").click();
  await expect(help.getByText("Drag to move", { exact: false })).toBeVisible();
});

test("arranges fretboard height independently and remembers it", async ({ page, shot }) => {
  await page.goto("/");
  const deck = page.locator('[data-deck="Guitar Fretboard::Note → Positions"]');
  await expect(deck).toBeVisible({ timeout: 30_000 });
  await deck.locator(".deck-study").click({ position: { x: 20, y: 20 } });
  await expect(page.locator(".count.new")).not.toHaveText("0");
  await page.getByRole("button", { name: "Deck actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Arrange card" }).click();
  const board = page.frameLocator('iframe[title="card"]').locator('svg.fretboard');
  const box = (await board.boundingBox())!;
  const height = page.getByRole("slider", { name: "Fretboard height" });
  await expect(height).toBeVisible();
  await height.fill("1.5");
  const tall = (await board.boundingBox())!;
  expect(tall.width).toBeCloseTo(box.width, 1);
  expect(tall.height).toBeCloseTo(box.height * 1.5, 1);
  await shot("fretboard-height-arrangement");
  await page.getByRole("button", { name: "DONE", exact: true }).click();
  expect(await page.evaluate(() => (Object.values(JSON.parse(localStorage.getItem("music-flashcards:card-layouts")!))[0] as { settings: { boardHeight: number; rotation: number; offsets: Record<string, { x: number; y: number }> } }).settings.boardHeight)).toBe(1.5);
});

test.describe("touch fretboard arrangement", () => {
  test.use({ viewport: { width: 411, height: 841 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 });

  test("height slider takes touches above a rotated card", async ({ page, browserName, shot }) => {
    test.skip(browserName !== "chromium", "Uses Chromium touch input");
    await page.addInitScript(() => {
      if (window.top !== window) return;
      localStorage.setItem("music-flashcards:deck-card-settings", JSON.stringify({
        "Guitar Fretboard": { rotation: -90 },
      }));
    });
    await page.goto("/");
    const deck = page.locator('[data-deck="Guitar Fretboard::Note → Positions"]');
    await expect(deck).toBeVisible({ timeout: 30_000 });
    await deck.locator(".deck-study").tap({ position: { x: 20, y: 20 } });
    await expect(page.locator(".count.new")).not.toHaveText("0");
    await page.getByRole("button", { name: "Deck actions", exact: true }).tap();
    await page.getByRole("menuitem", { name: "Arrange card" }).tap();
    const slider = page.getByRole("slider", { name: "Fretboard height" });
    const box = (await slider.boundingBox())!;
    const y = box.y + box.height / 2;
    const fromX = box.x + 8 + (box.width - 16) / 3;
    const toX = box.x + 8 + (box.width - 16) * 0.8;
    expect(await slider.evaluate((element, point) => document.elementFromPoint(point.x, point.y) === element, { x: fromX, y })).toBe(true);
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: fromX, y }] });
    for (let step = 1; step <= 8; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: fromX + (toX - fromX) * step / 8, y }] });
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(Number(await slider.inputValue())).toBeGreaterThan(1.3);
    const frets = page.getByRole("combobox", { name: "Fretboard frets" });
    const board = page.frameLocator('iframe[title="card"]').locator('svg.fretboard');
    const full = (await board.boundingBox())!;
    await frets.selectOption("12");
    await expect(board.locator('.fretboard__fret-label')).toHaveCount(13);
    const short = (await board.boundingBox())!;
    expect(short.height / full.height).toBeCloseTo(712 / 1384, 2);
    await page.getByRole("button", { name: "Screen width", exact: true }).tap();
    const frame = (await page.locator('iframe[title="card"]').boundingBox())!;
    await expect.poll(async () => (await board.boundingBox())!.height).toBeCloseTo(frame.height, 1);
    await frets.selectOption("24");
    await expect(board.locator('.fretboard__fret-label')).toHaveCount(25);
    expect((await board.boundingBox())!.height).toBeCloseTo(frame.height, 1);
    await frets.selectOption("12");
    await expect(board.locator('.fretboard__fret-label')).toHaveCount(13);
    await shot("touch-height-slider");
    await page.getByRole("button", { name: "DONE", exact: true }).tap();
    const settings = await page.evaluate(() => (Object.values(JSON.parse(localStorage.getItem("music-flashcards:card-layouts")!))[0] as { settings: { boardHeight: number; rotation: number; offsets: Record<string, { x: number; y: number }> } }).settings);
    expect(settings.boardHeight).toBeGreaterThan(1.3);
    expect(settings.rotation).toBe(-90);
    expect(settings.offsets.board).toEqual({ x: 0, y: 0 });
    expect(settings.offsets.text).toEqual({ x: 0, y: 0 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("music-flashcards:guitar-fretboard-fret-count")!))).toBe(12);
  });
});

test.describe("touch layout toolbar", () => {
  test.use({ viewport: { width: 411, height: 841 }, isMobile: true, hasTouch: true });

  test("moves the toolbar away and lets the covered staff be dragged", async ({ page, browserName, shot }) => {
    test.skip(browserName !== "chromium", "Uses Chromium touch input");
    await page.addInitScript(() => {
      if (window.top !== window) return;
      localStorage.setItem("music-flashcards:layout-help-seen", "true");
    });
    await page.goto("/");
    await expect(page.locator('[data-deck="Music Staff::Staff → Note::Treble Clef"]')).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "CHOOSE DECKS", exact: true }).tap();
    const chooser = page.getByRole("dialog", { name: "Decks", exact: true });
    await chooser.getByRole("checkbox", { name: "(Experimental) Music Staff (Movable Do)", exact: true }).check();
    await chooser.getByRole("button", { name: "APPLY", exact: true }).tap();
    await page.locator('[data-deck="Music Staff (Movable Do)::Staff → Solfege::Treble Clef"] .deck-study').tap({ position: { x: 20, y: 20 } });
    await expect(page.locator(".count.new")).not.toHaveText("0");
    await page.getByRole("button", { name: "Deck actions", exact: true }).tap();
    await page.getByRole("menuitem", { name: "Arrange card", exact: true }).tap();
    const toolbar = page.getByRole("group", { name: "Arrange card", exact: true });
    const card = page.frameLocator('iframe[title="card"]');
    const staff = card.locator('[data-card-part="staff"]');
    const keyboard = card.locator('svg.keyboard');
    const before = (await staff.boundingBox())!;
    const keyboardBefore = await keyboard.boundingBox();
    const frameBefore = await page.locator('iframe[title="card"]').boundingBox();
    await expect(toolbar).toHaveClass(/high/);
    await toolbar.getByRole("button", { name: "Move toolbar to bottom", exact: true }).tap();
    await expect(toolbar).not.toHaveClass(/high/);
    await toolbar.getByRole("button", { name: "Move toolbar to top", exact: true }).tap();
    await expect(toolbar).toHaveClass(/high/);
    await toolbar.getByRole("button", { name: "Move toolbar to bottom", exact: true }).tap();
    await expect(toolbar).not.toHaveClass(/high/);
    expect(await staff.boundingBox()).toEqual(before);
    expect(await keyboard.boundingBox()).toEqual(keyboardBefore);
    expect(await page.locator('iframe[title="card"]').boundingBox()).toEqual(frameBefore);
    const x = before.x + before.width / 2;
    const y = before.y + before.height / 2;
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step++) {
      await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + step * 10 }] });
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    expect(Math.abs((await staff.boundingBox())!.y - before.y - 60)).toBeLessThan(2);
    expect(await keyboard.boundingBox()).toEqual(keyboardBefore);
    await expect(toolbar).toContainText("Staff");
    await shot("toolbar-moved-and-staff-dragged");
  });
});
