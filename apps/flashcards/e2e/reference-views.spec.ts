// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

async function showDecks(page: Page, labels: readonly string[]): Promise<void> {
  await expect(page.locator(".preparing, .importing")).toHaveCount(0, { timeout: 30_000 });
  await page.getByRole("button", { name: "CHOOSE DECKS" }).click();
  const chooser = page.getByRole("dialog", { name: "Decks" });
  for (const label of labels) {
    await chooser.getByRole("checkbox", { name: label, exact: true }).first().check();
  }
  await chooser.getByRole("button", { name: "APPLY" }).click();
  await expect(chooser).toBeHidden();
}

// The gear of a deck, and the reference folded at the foot of its dialog.
async function openReference(page: Page, deck: string, title: string): Promise<Locator> {
  const row = page.locator(`[data-deck="${deck}"]`);
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByTitle("What to ask").click();
  const dialog = page.getByRole("dialog", { name: "What to ask" });
  await dialog.locator("summary").filter({ hasText: title }).click();
  const reference = dialog.locator("details").filter({ hasText: title });
  await reference.scrollIntoViewIfNeeded();
  return reference;
}

test("intervals: the answer table writes each pair's answer", async ({ page, shot }) => {
  await page.goto("/");
  await showDecks(page, ["(Experimental) Intervals"]);
  const reference = await openReference(page, "Intervals", "Answer table");
  const table = reference.getByRole("table", { name: "Interval answers" });
  const header = await table.locator("thead th").allTextContents();
  const row = table.locator("tbody tr").filter({ has: page.locator("th", { hasText: /^B♭$/ }) });
  const cells = await row.locator("td").allTextContents();
  expect(cells[header.indexOf("M3") - 1].trim()).toBe("D");
  expect(cells[header.indexOf("P5") - 1].trim()).toBe("F");
  await shot("interval-answer-table");
});

test("guitar fretboard: every position is named on the neck", async ({ page, shot }) => {
  await page.goto("/");
  const reference = await openReference(page, "Guitar Fretboard::Note → Positions", "Fretboard reference");
  const board = reference.locator("svg.fretboard");
  await expect(board).toBeVisible();
  await expect(board.locator(".fretboard__target")).toHaveCount(6 * 25);
  const dot = (string: number, fret: number) =>
    board.locator(`.fretboard__target[data-string="${string}"][data-fret="${fret}"] + text`);
  await expect(dot(1, 1)).toHaveText("F");
  await expect(dot(1, 2)).toHaveText("F♯G♭");
  // Only the naturals are asked at first, so the accidentals are faint.
  await expect(board.locator('.off > .fretboard__target[data-string="1"][data-fret="2"]')).toHaveCount(1);
  await expect(board.locator('.off > .fretboard__target[data-string="1"][data-fret="1"]')).toHaveCount(0);
  await shot("fretboard-reference");
});

test("circle of fifths: cell decks offer every spelling on the circle", async ({ page, shot }) => {
  await page.goto("/");
  await showDecks(page, ["(Experimental) Circle of Fifths"]);
  const reference = await openReference(
    page,
    "(Experimental) Circle of Fifths::Cell → All Notes::Outer (Major) Cell → Notes",
    "Circle reference",
  );
  await expect(reference.locator("svg.circle-of-fifths")).toBeVisible();
  await shot("circle-reference");
});

test("music staff: the scale reference names notes by letter", async ({ page, shot }) => {
  await page.goto("/");
  const reference = await openReference(page, "Music Staff::Staff → Note::Bass Clef", "Scale reference");
  await expect(reference.getByLabel("Reference clef", { exact: true })).toHaveValue("bass");
  await reference.getByLabel("Reference key", { exact: true }).selectOption({ label: "D major" });
  const names = await reference.locator("svg.staff-row text").allTextContents();
  expect(names.join(" ")).not.toMatch(/\b(Do|Re|Mi|Fa|So|La|Ti)\b/);
  await shot("staff-scale-reference");
});
