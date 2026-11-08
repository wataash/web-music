// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from "./fixtures";

for (const filter of ["Music Staff / Staff → Note / Treble Clef", "Movable Do", "Guitar Fretboard / Note → Positions", "Guitar Intervals", "Circle of Fifths / Note → Cell / Note → Outer", "Diatonic Chords", "II–V–I Progressions", "Chord Tones", "Interval Identification", "(Experimental) Intervals"]) {
  test(`Edwin is embedded in ${filter} and ignores old font preferences`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("music-flashcards:note-font", "heros"));
    await page.goto("/preview");
    await expect(page.getByRole("status")).not.toHaveText("Loading decks…", { timeout: 60000 });
    await expect(page.getByLabel("Note font", { exact: true })).toHaveCount(0);
    await page.getByLabel("Filter decks").fill(filter);
    const frame = page.locator("section iframe").last();
    await frame.scrollIntoViewIfNeeded();
    const body = frame.contentFrame().locator("body");
    await expect(body).toHaveCSS("font-family", /Flashcard Chords/);
    await expect(body).toHaveCSS("font-weight", "400");
    const fonts = await body.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter(face => face.status === "loaded").map(face => face.family);
    });
    expect(fonts.some(family => family.includes("Flashcard Chords"))).toBe(true);
    if (filter.startsWith("Circle of Fifths")) {
      const gaps = await body.evaluate(() => [...document.querySelectorAll<SVGTextElement>(".circle-of-fifths__spelling, .keyboard-note-name")]
        .filter(text => text.textContent?.includes("𝄪") && text.getBoundingClientRect().width > 0)
        .map(text => {
          const letter = text.getExtentOfChar(0);
          const right = new DOMPoint(letter.x + letter.width, letter.y).matrixTransform(text.getScreenCTM()!).x;
          const accidental = text.nextElementSibling!.querySelector("path")!.getBoundingClientRect();
          return accidental.left - right;
        }));
      expect(gaps.length).toBeGreaterThan(0);
      for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(-0.5);
    }
    for (const text of await frame.contentFrame().locator("svg text").all()) {
      await expect(text).toHaveCSS("font-family", /Flashcard Chords/);
    }
  });
}

test("non-harmony decks no longer offer font-only Appearance screens", async ({ page }) => {
  await page.goto("/");
  const row = page.locator('[data-deck="Music Staff::Staff → Note::Treble Clef"]');
  await expect(row).toBeVisible({ timeout: 30000 });
  await row.click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "Appearance", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await row.locator(".deck-study").click();
  await expect(page.frameLocator('iframe[title="card"]').locator('svg.staff')).toBeVisible();
  await page.getByRole("button", { name: "Deck actions", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Appearance", exact: true })).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("font-family", /Flashcards UI/);
});
