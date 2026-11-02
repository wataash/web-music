// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from "./fixtures";

test("orders deck families and shows promoted decks by default", async ({ page, shot }) => {
  await page.setViewportSize({ width: 411, height: 841 });
  await page.goto("/");
  await expect(page.locator('[data-deck="Music Staff"]')).toBeVisible();
  await expect(page.locator('.preparing,.importing')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('[data-deck="Diatonic Chords"]')).toBeVisible();
  await expect(page.locator('[data-deck="Music Staff (with Octave Numbers)"]')).toHaveCount(0);
  await shot("default-deck-list");
  await page.getByRole("button", { name: "CHOOSE DECKS", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Decks", exact: true });
  await expect(dialog.getByRole("checkbox", { name: "Diatonic Chords", exact: true })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "(Experimental) Music Staff (with Octave Numbers)", exact: true })).not.toBeChecked();
  await expect(dialog.getByRole('checkbox',{name:'II–V–I Progressions',exact:true})).toBeChecked();
  await expect(dialog.getByRole('checkbox',{name:'Circle of Fifths',exact:true})).toBeChecked();
  await expect(dialog.getByRole('checkbox',{name:'Note → Cell',exact:true})).toBeChecked();
  await expect(dialog.getByRole('checkbox',{name:'(Experimental) Cell → All Notes',exact:true})).not.toBeChecked();
  await expect(dialog.getByRole('checkbox',{name:'(Experimental) Intervals',exact:true}).last()).not.toBeChecked();
  await expect(dialog.getByRole('checkbox',{name:'Key + Degree → Chord',exact:true})).toHaveCount(0);
  await shot('default-hidden-deck-choices');
  for (const name of ["Music Staff", "(Experimental) Music Staff (with Octave Numbers)", "(Experimental) Music Staff (Movable Do)", "Diatonic Chords", "(Experimental) Chord Tones (Triads)", "(Experimental) Chord Tones (Four-note Chords)", "II–V–I Progressions", "(Experimental) Intervals", "(Experimental) Interval Identification", "Guitar Fretboard", "Guitar Intervals", "Circle of Fifths"]) {
    await dialog.getByRole("checkbox", { name, exact: true }).first().check();
  }
  await dialog.getByRole("button", { name: "APPLY", exact: true }).click();
  const roots = () => page.locator('.deck-row[data-deck]').evaluateAll(rows => rows.map(row => row.getAttribute("data-deck")!).filter(name => !name.includes("::")));
  await expect.poll(roots).toEqual(["Music Staff", "Music Staff (with Octave Numbers)", "Music Staff (Movable Do)", "Diatonic Chords", "Chord Tones (Triads)", "Chord Tones (Four-note Chords)", "II–V–I Progressions", "Intervals", "Interval Identification", "Guitar Fretboard", "Guitar Intervals", "(Experimental) Circle of Fifths"]);
  const diatonic = page.locator('[data-deck="Diatonic Chords"]');
  await expect(diatonic).toContainText("Diatonic Chords");
  const children = () => page.locator('.deck-row[data-deck^="Diatonic Chords::"]').evaluateAll(rows => rows.map(row => row.getAttribute("data-deck")));
  await expect.poll(children).toEqual([]);
  const expandedRoots = page.locator('.deck-row[data-deck]:not([data-deck*="::"]) .deck-expander[aria-expanded="true"]');
  while (await expandedRoots.count()) await expandedRoots.first().click();
  await shot("all-decks-in-learning-order");
  await page.setViewportSize({ width: 900, height: 800 });
  await shot("deck-order-full-labels");
  await page.reload();
  await expect(diatonic).toBeVisible({ timeout: 30_000 });
});
