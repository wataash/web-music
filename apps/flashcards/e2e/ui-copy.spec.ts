// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

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
