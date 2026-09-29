// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test, type Page } from "@playwright/test";
import { fretboardCards } from "../../../decks/guitar-fretboard/src/cards";
import { FIELD_NAMES, CARD_CSS, WEB_FRONT_TEMPLATE, WEB_BACK_TEMPLATE } from "../../../decks/guitar-fretboard/src/template";
import { createPackageNote } from "../../../decks/guitar-fretboard/src/web-deck";
import { buildCardDocument, renderTemplate } from "../src/lib/template";

async function show(page: Page, fields: Record<string, string>, back = false, showKeyboard?: boolean) {
  await page.setContent(buildCardDocument({
    html: renderTemplate(back ? WEB_BACK_TEMPLATE : WEB_FRONT_TEMPLATE, fields),
    css: CARD_CSS,
    nightMode: true,
    showKeyboard,
  }));
}

test("disabled keyboard adds no row or layout gap", async ({ page }) => {
  const fields = { String: "1", Fret: "0", Note: "E", Tuning: "64 59 55 50 45 40" };
  for (const enabled of [undefined, false]) {
    await show(page, fields, false, enabled);
    await expect(page.locator('[data-card-part="keyboard"]')).toHaveCount(0);
    await expect(page.locator(".fretboard-card > *")).toHaveCount(2);
    const before = await page.locator(".fretboard-card").boundingBox();
    await show(page, fields, false, true);
    await expect(page.locator("svg.keyboard")).toBeVisible();
    await page.locator('[data-card-part="keyboard"]').evaluate((row) => row.remove());
    expect(await page.locator(".fretboard-card").boundingBox()).toEqual(before);
  }
});

test("every generated spelling marks its pitch on both note-to-positions sides", async ({ page }) => {
  const tuning = [61, 54, 46, 33];
  const cards = fretboardCards(tuning).filter((card) => card.kind === "note-to-positions" && card.string === 1);
  for (const card of cards) {
    const note = createPackageNote(card, "", "", tuning);
    const fields = Object.fromEntries(FIELD_NAMES.map((field, index) => [field, note.fields[index]]));
    for (const back of [false, true]) {
      await show(page, fields, back, true);
      const marked = page.locator("svg.keyboard .is-highlighted");
      await expect(marked).toHaveCount(1);
      // Cards number pitch classes from A; MIDI numbers them from C.
      await expect(marked).toHaveAttribute("data-semitone", String(60 + (card.pitchClass + 9) % 12));
    }
  }
});

test("custom tuning position questions stay blank until answered without moving the keyboard", async ({ page }) => {
  for (const [string, fret, note, midi] of [[1, 0, "C♯D♭", 61], [4, 14, "B", 71]] as const) {
    const fields = { String: String(string), Fret: String(fret), Note: note, Tuning: "61 54 46 33" };
    await show(page, fields, false, true);
    await expect(page.locator("svg.keyboard .is-highlighted")).toHaveCount(0);
    const before = await page.locator("svg.keyboard").boundingBox();
    await show(page, fields, true, true);
    await expect(page.locator("svg.keyboard .is-highlighted")).toHaveAttribute("data-semitone", String(midi));
    expect(await page.locator("svg.keyboard").boundingBox()).toEqual(before);
    const ids = await page.locator("[id]").evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(new Set(ids).size).toBe(ids.length);
  }
});

test("keyboard reuses part scale and offsets independently of the fretboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await show(page, { String: "1", Fret: "", Positions: "1-0 1-12", Note: "E" }, false, true);
  const compactWidth = (await page.locator("svg.keyboard").boundingBox())!.width;
  expect(compactWidth).toBeCloseTo(Math.min(390 * 0.88, 26 * 16, 844 * 0.62), 1);

  await page.setViewportSize({ width: 1280, height: 720 });
  await show(page, { String: "1", Fret: "", Positions: "1-0 1-12", Note: "E" }, false, true);
  const keyboard = page.locator("svg.keyboard");
  const board = page.locator("svg.fretboard");
  const initial = (await keyboard.boundingBox())!;
  expect(initial.width).toBeCloseTo(Math.min(1280 * 0.88, 26 * 16, 720 * 0.62), 1);
  const boardBefore = await board.boundingBox();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--keyboard-scale", "1.5");
  });
  const scaled = (await keyboard.boundingBox())!;
  expect(scaled.width).toBeCloseTo(initial.width * 1.5, 0);
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--keyboard-x", "30px");
    document.documentElement.style.setProperty("--keyboard-y", "20px");
  });
  const moved = (await keyboard.boundingBox())!;
  expect(moved.x - scaled.x).toBeCloseTo(30, 0);
  expect(moved.y - scaled.y).toBeCloseTo(20, 0);
  expect(await board.boundingBox()).toEqual(boardBefore);
});
