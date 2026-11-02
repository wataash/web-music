// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Page } from "@playwright/test";

import { expect, test, openDeckSettings } from "./fixtures";
import { staffCardVariables, DEFAULT_STAFF_NOTE_SELECTION } from "../src/lib/staff-note-selection";

test.use({ viewport: { width: 390, height: 844 } });

test("changes Solfege keyboard keys in steps of two in Arrange card", async ({ page, shot }) => {
  await page.addInitScript(() => {
    if (window.top !== window) return;
    localStorage.setItem("music-flashcards:movable-do-major-keys", "[-1]");
  });
  await page.goto("/");
  await showMovableDo(page);
  const row = page.locator('[data-deck="Music Staff (Movable Do)::Staff → Solfege::Treble Clef"]');
  await row.locator(".deck-study").click({ position: { x: 20, y: 20 } });
  const card = page.frameLocator('iframe[title="card"]');
  await expect(card.locator("svg.keyboard [data-semitone]")).toHaveCount(25);
  await expect(card.locator('svg.keyboard [data-semitone="65"]')).toHaveCount(1);
  await expect(card.locator('svg.keyboard [data-semitone="77"].is-root-octave')).toHaveCount(1);
  await expect(card.locator("svg.keyboard .is-context")).toHaveCount(12);
  await page.getByRole("button", { name: "Deck actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Arrange card", exact: true }).click();
  const keys = page.getByRole("slider", { name: "Reference keyboard keys", exact: true });
  await expect(keys).toHaveValue("25");
  await keys.fill("13");
  await expect(card.locator("svg.keyboard [data-semitone]")).toHaveCount(13);
  await keys.press("ArrowRight");
  await expect(keys).toHaveValue("15");
  await expect(card.locator("svg.keyboard [data-semitone]")).toHaveCount(15);
  await keys.press("ArrowRight");
  await expect(keys).toHaveValue("17");
  await expect(card.locator("svg.keyboard [data-semitone]")).toHaveCount(17);
  await keys.fill("49");
  await expect(card.locator("svg.keyboard [data-semitone]")).toHaveCount(49);
  await keys.fill("25");
  await expect(card.locator("svg.keyboard [data-semitone]")).toHaveCount(25);
  await shot("f-major-focused-keyboard-arrangement");
  await keys.fill("27");
  await expect(card.locator("svg.keyboard [data-semitone]")).toHaveCount(27);
  await page.getByRole("button", { name: "DONE", exact: true }).click();
  const keyboard = card.locator("svg.keyboard");
  const before = await keyboard.boundingBox();
  await page.getByRole("button", { name: "SHOW ANSWER", exact: true }).click();
  await expect(page.getByRole("button", { name: /GOOD/ })).toBeVisible();
  expect(await keyboard.boundingBox()).toEqual(before);
  await shot("f-major-focused-keyboard-answer");
  const settings = await page.evaluate(() => (Object.values(JSON.parse(localStorage.getItem("music-flashcards:card-layouts")!))[0] as { settings: { referenceKeyboardKeys: number } }).settings);
  expect(settings.referenceKeyboardKeys).toBe(27);
});

test("offers only study keys in the range editor and handles deselection", async ({ page, shot }) => {
  await page.goto("/");
  await showMovableDo(page);
  await openDeckSettings(page.locator('[data-deck="Music Staff (Movable Do)::Staff → Solfege::Treble Clef"]'));
  const dialog = page.getByRole("dialog", { name: "What to ask" });
  const editor = dialog.getByLabel("Edit note range for key", { exact: true });
  await dialog.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(editor).toBeDisabled();
  await expect(dialog.locator(".note-table-section")).toHaveCount(0);
  const f = dialog.getByRole("button", { name: "F major", exact: true });
  const bb = dialog.getByRole("button", { name: "B♭ major", exact: true });
  await f.click();
  await bb.click();
  await expect(editor).toBeEnabled();
  await expect(editor.locator("option")).toHaveCount(2);
  expect(await editor.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).sort())).toEqual(["-1", "-2"]);
  await editor.selectOption("-1");
  await dialog.getByRole("radio", { name: "6 ledger lines", exact: true }).check();
  await f.click();
  await expect(editor).toHaveValue("-2");
  await expect(editor.locator("option")).toHaveCount(1);
  await bb.click();
  await expect(editor).toBeDisabled();
  await f.click();
  await expect(editor).toHaveValue("-1");
  await expect(dialog.getByRole("radio", { name: "6 ledger lines", exact: true })).toBeChecked();
  await shot("study-keys-only-range-editor");
});

// Movable do ships turned off as an experiment, and the list tags it as one.
// These tests are about what it asks, so the deck is turned on first, the way a
// reader would: through CHOOSE DECKS above the list.
async function showMovableDo(page: Page): Promise<void> {
  await page.getByRole("button", { name: "CHOOSE DECKS" }).click();
  const chooser = page.getByRole("dialog", { name: "Decks" });
  const movableDo = chooser.getByRole("checkbox", {
    name: "(Experimental) Music Staff (Movable Do)",
    exact: true,
  });
  await expect(movableDo).toBeVisible({ timeout: 30_000 });
  await movableDo.check();
  await chooser.getByRole("button", { name: "APPLY" }).click();
  await expect(chooser).toBeHidden();
}

test("shows movable-do reference notes for every key without changing the selection", async ({ page }) => {
  await page.goto("/");
  await showMovableDo(page);
  const row = page.locator('[data-deck="Music Staff (Movable Do)"]');
  await expect(row).toBeVisible({ timeout: 30_000 });
  await openDeckSettings(row);
  const dialog = page.getByRole("dialog", { name: "What to ask" });
  const selected = dialog.getByRole("button", { name: / major$/, pressed: true });
  const selectionCount = await selected.count();
  await dialog.locator("summary").filter({ hasText: "Scale reference" }).click();
  const reference = dialog.locator("details").filter({ hasText: "Scale reference" });
  const key = reference.getByLabel("Reference key", { exact: true });
  const clef = reference.getByLabel("Reference clef", { exact: true });
  const staff = reference.locator("svg.staff-row");
  await expect(key.locator("option")).toHaveCount(15);
  await expect(staff).toBeVisible();
  await expect(staff.locator('[data-pitch="G2"]')).toContainText("G2");
  await expect(staff.locator('[data-pitch="G2"]')).toContainText("So");
  await expect(staff.locator('[data-pitch="A2"]')).toContainText("La");

  for (let fifths = 7; fifths >= -7; fifths--) {
    await key.selectOption(String(fifths));
    await expect(staff.locator(".staff__note")).toHaveCount(33);
    await expect(staff.getByRole("checkbox")).toHaveCount(0);
    await expect(selected).toHaveCount(selectionCount);
  }
  await key.selectOption("7");
  await expect(staff.locator(".staff__key-signature .glyph.sharp")).toHaveCount(7);
  await expect(staff.locator('[data-pitch="B2"]')).toContainText("B♯2");
  await expect(staff.locator('[data-pitch="B2"]')).toContainText("Ti");
  await key.selectOption("-7");
  await expect(staff.locator(".staff__key-signature .glyph.flat")).toHaveCount(7);
  await expect(staff.locator('[data-pitch="C3"]')).toContainText("C♭3");
  await expect(staff.locator('[data-pitch="C3"]')).toContainText("Do");
  await clef.selectOption("bass");
  await expect(staff.locator('[data-clef="bass"]')).toHaveCount(1);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(selected).toHaveCount(selectionCount);
});

test("selects enharmonic keys independently on the circle of fifths", async ({ page }) => {
  await page.goto("/");
  await showMovableDo(page);
  const openSettings = () => openDeckSettings(page.locator('[data-deck="Music Staff (Movable Do)"]'));
  await expect(page.locator('[data-deck="Music Staff (Movable Do)"]')).toBeVisible({ timeout: 30_000 });
  await openSettings();
  const dialog = page.getByRole("dialog", { name: "What to ask" });
  const wheel = dialog.locator("svg.wheel");
  expect((await wheel.boundingBox())?.width).toBeGreaterThan(300);
  const cells = dialog.getByRole("button", { name: / major$/ });
  await expect(cells).toHaveCount(15);
  await expect(dialog.getByRole("button", { name: "C♯ major", exact: true }).locator(".glyph.sharp")).toHaveCount(7);
  await expect(dialog.getByRole("button", { name: "C♭ major", exact: true }).locator(".glyph.flat")).toHaveCount(7);
  const bounds = (await wheel.boundingBox())!;
  const labelPosition = async (name: string) => {
    // SVG text boxes include font-dependent extents in WebKit. Compare the
    // label's explicit anchor in screen coordinates instead.
    return dialog.getByRole("button", { name, exact: true }).locator(".tonic").evaluate(element => {
      const text = element as SVGTextElement;
      const point = new DOMPoint(text.x.baseVal[0].value, text.y.baseVal[0].value).matrixTransform(text.getScreenCTM()!);
      return { x: point.x, y: point.y };
    });
  };
  const radius = async (name: string) => {
    const label = await labelPosition(name);
    return Math.hypot(label.x - bounds.x - bounds.width / 2, label.y - bounds.y - bounds.height / 2);
  };
  for (const [outer, inner] of [["B major", "C♭ major"], ["F♯ major", "G♭ major"], ["C♯ major", "D♭ major"]]) {
    expect(await radius(inner)).toBeLessThan(await radius(outer));
  }
  await dialog.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(dialog.getByRole("button", { name: / major$/, pressed: true })).toHaveCount(0);

  const b = dialog.getByRole("button", { name: "B major", exact: true });
  const cb = dialog.getByRole("button", { name: "C♭ major", exact: true });
  // Use the visible label's anchor, not browser-dependent SVG box extents.
  const bPosition = await labelPosition("B major");
  await page.mouse.click(bPosition.x, bPosition.y);
  await expect(b).toHaveAttribute("aria-pressed", "true");
  await expect(cb).toHaveAttribute("aria-pressed", "false");
  await cb.focus();
  await cb.press("Space");
  await expect(cb).toHaveAttribute("aria-pressed", "true");
  await cb.press("Enter");
  await expect(cb).toHaveAttribute("aria-pressed", "false");
  await expect(b).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("button", { name: "APPLY", exact: true }).click();
  await page.reload();
  await openSettings();
  await expect(dialog.getByRole("button", { name: / major$/, pressed: true })).toHaveCount(1);
  await expect(b).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(dialog.getByRole("button", { name: / major$/, pressed: true })).toHaveCount(15);
});

test("keeps regular and per-key Solfege ranges independent, including cancel and reload", async ({ page, shot }) => {
  await page.addInitScript(() => {
    if (window.top !== window) return;
    if (!localStorage.getItem("range-test-seeded")) {
      const selection = { treble: ["A4"], bass: ["C3"], alto: ["C4"], tenor: ["C4"] };
      localStorage.setItem("music-flashcards:music-staff-note-selection", JSON.stringify(selection));
      localStorage.setItem("range-test-seeded", "yes");
    }
  });
  await page.goto("/");
  await showMovableDo(page);
  const regularRow = page.locator('[data-deck="Music Staff::Staff → Note::Treble Clef"]');
  const solfegeRow = page.locator('[data-deck="Music Staff (Movable Do)::Staff → Solfege::Treble Clef"]');
  await openDeckSettings(regularRow);
  const dialog = page.getByRole("dialog", { name: "What to ask" });
  await dialog.getByRole("radio", { name: "6 ledger lines", exact: true }).check();
  await dialog.getByRole("button", { name: "APPLY", exact: true }).click();
  await openDeckSettings(solfegeRow);
  const key = dialog.getByLabel("Edit note range for key", { exact: true });
  const selected = dialog.locator('.note-table-section [role="checkbox"][aria-checked="true"]');
  await key.selectOption("-1");
  await expect(selected).toHaveCount(1);
  await expect(selected).toHaveAttribute("data-pitch", "A4");
  await expect(dialog.locator('.note-table-section .staff__key-signature .glyph.flat')).toHaveCount(1);
  await dialog.getByRole("radio", { name: "2 ledger lines", exact: true }).check();
  await expect(selected).toHaveCount(19);
  await shot("f-major-range");
  await key.selectOption("-2");
  await expect(selected).toHaveCount(1);
  // Add B4 to this key alone. Scroll the SVG note into view before tapping.
  const b = dialog.locator('.note-table-section [data-pitch="B4"]');
  await b.scrollIntoViewIfNeeded();
  await b.click();
  await expect(selected).toHaveCount(2);
  await shot("b-flat-major-range");
  await key.selectOption("-1");
  await expect(selected).toHaveCount(19);
  await key.selectOption("0");
  await expect(selected).toHaveCount(1);
  await dialog.getByRole("button", { name: "APPLY", exact: true }).click();
  await page.reload();
  await expect(solfegeRow).toBeVisible({ timeout: 30_000 });
  await openDeckSettings(solfegeRow);
  await key.selectOption("-2");
  await expect(selected).toHaveCount(2);
  await dialog.getByRole("radio", { name: "6 ledger lines", exact: true }).check();
  await dialog.getByRole("button", { name: "CANCEL", exact: true }).click();
  await openDeckSettings(solfegeRow);
  await key.selectOption("-2");
  await expect(selected).toHaveCount(2);
  await dialog.getByRole("button", { name: "CANCEL", exact: true }).click();
  await openDeckSettings(regularRow);
  await expect(selected).toHaveCount(33);
  await expect(key).toHaveCount(0);
  await shot("regular-staff-range");
});

for (const [fifths, pitch] of [[-1, "A4"], [-2, "D7"]] as const) {
  test(`studies and frames only the range for key ${fifths}`, async ({ page, shot }) => {
    await page.addInitScript(({ fifths, pitch }) => {
      if (window.top !== window) return;
      const regular = { treble: ["C4"], bass: ["C3"], alto: ["C4"], tenor: ["C4"] };
      localStorage.setItem("music-flashcards:music-staff-note-selection", JSON.stringify(regular));
      localStorage.setItem("music-flashcards:movable-do-staff-note-selections", JSON.stringify({
        [fifths]: { ...regular, treble: [pitch] },
      }));
      localStorage.setItem("music-flashcards:movable-do-major-keys", JSON.stringify([fifths]));
    }, { fifths, pitch });
    await page.goto("/");
    await showMovableDo(page);
    const row = page.locator('[data-deck="Music Staff (Movable Do)::Staff → Solfege::Treble Clef"]');
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.locator(".deck-study").click({ position: { x: 20, y: 20 } });
    await expect(page.locator(".count.new")).toHaveText("1");
    const card = page.frameLocator('iframe[title="card"]');
    const diagram = card.locator('[data-major-fifths]');
    await expect(diagram).toHaveAttribute("data-major-fifths", String(fifths));
    await expect(diagram).toHaveAttribute("data-staff", `treble|${pitch}`);
    const crop = staffCardVariables({ fields: ["id", "treble", pitch], tags: "clef::treble" }, { ...DEFAULT_STAFF_NOTE_SELECTION, treble: [pitch] }, ["treble"]);
    for (const [name, value] of Object.entries(crop)) {
      expect(await card.locator("html").evaluate((root, name) => getComputedStyle(root).getPropertyValue(name).trim(), name)).toBe(value);
    }
    const before = await diagram.boundingBox();
    await page.getByRole("button", { name: "SHOW ANSWER", exact: true }).click();
    await expect(page.getByRole("button", { name: /GOOD/ })).toBeVisible();
    expect(await diagram.boundingBox()).toEqual(before);
    await shot("independent-key-range-card");
  });
}
