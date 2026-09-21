// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

test("shows movable-do reference notes for every key without changing the selection", async ({ page }) => {
  await page.goto("/");
  const row = page.locator('[data-deck="Music Staff (Movable Do)"]');
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByTitle("What to ask").click();
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
  await expect(staff.locator('[data-pitch="G2"]')).toContainText("Sol");
  await expect(staff.locator('[data-pitch="A2"]')).toContainText("La");

  for (let fifths = 7; fifths >= -7; fifths--) {
    await key.selectOption(String(fifths));
    await expect(staff.locator(".staff__note")).toHaveCount(33);
    await expect(staff.getByRole("checkbox")).toHaveCount(0);
    await expect(selected).toHaveCount(selectionCount);
  }
  await key.selectOption("7");
  expect(await staff.locator(".staff__key-signature text").first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(20);
  await expect(staff.locator('[data-pitch="B2"]')).toContainText("B♯2");
  await expect(staff.locator('[data-pitch="B2"]')).toContainText("Ti");
  await key.selectOption("-7");
  expect(await staff.locator(".staff__key-signature text").first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(30);
  await expect(staff.locator('[data-pitch="C3"]')).toContainText("C♭3");
  await expect(staff.locator('[data-pitch="C3"]')).toContainText("Do");
  await clef.selectOption("bass");
  await expect(staff.locator('[data-clef="bass"]')).toHaveCount(1);
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(selected).toHaveCount(selectionCount);
});

test("selects enharmonic keys independently on the circle of fifths", async ({ page }) => {
  await page.goto("/");
  const openSettings = () => page.locator('[data-deck="Music Staff (Movable Do)"]').getByTitle("What to ask").click();
  await expect(page.locator('[data-deck="Music Staff (Movable Do)"]')).toBeVisible({ timeout: 30_000 });
  await openSettings();
  const dialog = page.getByRole("dialog", { name: "What to ask" });
  const wheel = dialog.locator("svg.wheel");
  expect((await wheel.boundingBox())?.width).toBeGreaterThan(300);
  const cells = dialog.getByRole("button", { name: / major$/ });
  await expect(cells).toHaveCount(15);
  const bounds = (await wheel.boundingBox())!;
  const radius = async (name: string) => {
    const label = (await dialog.getByRole("button", { name, exact: true }).locator(".tonic").boundingBox())!;
    return Math.hypot(label.x + label.width / 2 - bounds.x - bounds.width / 2, label.y + label.height / 2 - bounds.y - bounds.height / 2);
  };
  for (const [outer, inner] of [["B major", "C♭ major"], ["F♯ major", "G♭ major"], ["C♯ major", "D♭ major"]]) {
    expect(await radius(inner)).toBeLessThan(await radius(outer));
  }
  await dialog.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(dialog.getByRole("button", { name: / major$/, pressed: true })).toHaveCount(0);

  const b = dialog.getByRole("button", { name: "B major", exact: true });
  const cb = dialog.getByRole("button", { name: "C♭ major", exact: true });
  await b.click();
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
