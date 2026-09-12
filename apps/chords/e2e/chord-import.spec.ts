// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "@playwright/test";
import { extractIrealPlaylist, scramble } from "@web-music/ireal";
import { readFileSync } from "node:fs";

const song = (title: string, music: string, key = "C") => `${title}=Example==Swing=${key}==1r34LbKcu7${scramble(music)}==120=2`;
const url = "irealb://" + encodeURIComponent(song("Import One", "*AC-69|G7#11", "C-") + "===" + song("Import Two", "D^9(A7b9)|C*-^*", "C#-") + "===Test Playlist");

test("imports, searches, transposes, persists and deletes iReal songs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await page.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
  const input = page.getByLabel("Shared link / HTML");
  await input.fill(url);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Imported 2 songs" })).toBeVisible();
  await expect(page.getByLabel("Song", { exact: true })).toContainText("Import One");
  const firstId = await page.getByLabel("Song", { exact: true }).getAttribute('data-selected');
  await page.getByRole('button', { name: 'Close song library' }).click();
  await page.getByLabel("Song key", { exact: true }).selectOption("D");
  await expect(page.locator(".card-area h2")).toContainText("D-69");
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await page.getByLabel("Search songs", { exact: true }).fill("Import Two");
  await page.getByLabel("Song", { exact: true }).getByRole('button', { name: "Import Two · Example", exact: true }).click();
  const secondId = await page.getByLabel("Song", { exact: true }).getAttribute('data-selected');
  await expect(page.getByLabel("Song key", { exact: true })).toHaveValue("C#");
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByText("Chord tones are not supported for this chord. The original symbol is shown.", { exact: true })).toBeVisible();
  await page.getByText("Full chart", { exact: true }).click();
  await expect(page.getByLabel("Source song information")).toContainText("Import Two");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-chord-practice]")).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await expect(page.getByLabel("Song", { exact: true })).toHaveAttribute('data-selected', secondId);
  await page.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
  await page.getByLabel("HTML file", { exact: true }).setInputFiles({ name: "test.html", mimeType: "text/html", buffer: Buffer.from(`<a href="${url}">Test</a>`) });
  await expect(page.getByLabel("Song", { exact: true })).toHaveAttribute('data-selected', firstId);
  await expect(page.getByLabel("Song", { exact: true }).locator('button').filter({ hasText: "Import One" })).toHaveCount(1);
  await page.getByRole('button', { name: 'Close song library' }).click();
  await page.getByRole('button', { name: 'Chord practice settings' }).click();
  await page.getByRole("button", { name: "Delete selected imported chart" }).click();
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await expect(page.getByLabel("Song", { exact: true }).locator(`button[value="${firstId}"]`)).toHaveCount(0);
  await expect(page.getByLabel("Song", { exact: true }).locator(`button[value="${secondId}"]`)).toHaveCount(1);
});

test("invalid input leaves the current library usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  await page.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
  const selected = await page.getByLabel("Song", { exact: true }).getAttribute('data-selected');
  await page.getByLabel("Shared link / HTML").fill("irealb://%ZZ");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Import failed" })).toBeVisible();
  await expect(page.getByLabel("Song", { exact: true })).toHaveAttribute('data-selected', selected);
});

test("imports and searches the complete local Jazz playlist", async ({ page }) => {
  test.skip(!process.env.IREAL_PLAYLIST_PATH, "Requires a locally saved playlist");
  const path = process.env.IREAL_PLAYLIST_PATH!;
  const source = extractIrealPlaylist(readFileSync(path, "utf8")).songs.at(-1)!;
  await page.goto("/");
  await page.getByRole('button', { name: 'Choose song', exact: true }).click();
  const initial = await page.getByLabel("Song", { exact: true }).locator("button").count();
  await page.getByRole('button', { name: 'Import iReal Pro charts', exact: true }).click();
  await page.getByLabel("HTML file", { exact: true }).setInputFiles(path);
  await expect(page.getByRole("status").filter({ hasText: "Imported 1460 songs" })).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel("Song", { exact: true }).locator("button")).toHaveCount(initial + 1460);
  await page.getByLabel("Search songs", { exact: true }).fill(source.title);
  await page.getByLabel("Song", { exact: true }).getByRole('button', { name: `${source.title} · ${source.artist}`, exact: true }).click();
  await page.getByLabel("Song key", { exact: true }).selectOption("D");
  await expect(page.locator(".card-area h2")).not.toBeEmpty();
});
