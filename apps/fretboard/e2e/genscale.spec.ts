// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { scaleTokens } from "../lib/genscale/scales";
import { readableSettingsParam } from "../lib/genscale/settings";
import type { AppSettings } from "../lib/genscale/types";
import { expect, test } from "./fixtures";

function copiedSettingsUrl(settings: AppSettings, locale = "en") {
  return `http://localhost:18427/${locale}?settings=${readableSettingsParam(settings)}`;
}

test("renders the guitar scale board", async ({ page, shot }) => {
  await page.goto("/en");

  await expect(
    page.getByRole("heading", { name: "genscale" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("A m7 guitar scale fretboard"),
  ).toBeVisible();
  await shot("edit-loaded", { fullPage: true });
});

test("switches to concat and renders one fretboard per pasted URL", async ({
  page,
  shot,
}) => {
  await page.goto("/en");

  const firstSettings: AppSettings = {
    key: "C",
    tuning: ["E4", "B3", "G3", "D3", "A2", "E2"],
    notes: scaleTokens("M"),
    noteGrayLevels: [20, 40, 75, 100],
    fretSpacing: "equal-temperament",
  };
  const secondSettings: AppSettings = {
    key: "D",
    tuning: ["E4", "B3", "G3", "D3", "A2", "E2"],
    notes: scaleTokens("alt"),
    noteGrayLevels: [20, 40, 75, 100],
    fretSpacing: "equal-width",
  };

  await page.getByRole("tab", { name: "concat" }).click();
  await expect(page.getByLabel("Copied settings URLs")).toHaveValue(
    [
      'http://localhost:18427/?settings={"key":"D","tuning":["E4","B3","G3","D3","A2","E2"],"notes":["1","...♭9","...9","..♭3","...3","...11","...♯11",".5","...♭13","...13","..♭7","...Δ7"],"noteGrayLevels":[20,40,75,100]}',
      'http://localhost:18427/?settings={"key":"G","tuning":["E4","B3","G3","D3","A2","E2"],"notes":["1","..♭9","...9","..♯9","..3","...11","..♯11","...5","..♭13","...13","..♯13","...Δ7"],"noteGrayLevels":[20,40,75,100]}',
      'http://localhost:18427/?settings={"key":"C","tuning":["E4","B3","G3","D3","A2","E2"],"notes":["1","...♭9","...9","...♯9","..3","...11","...♯11",".5","...♭13","...13","...♭7","..Δ7"],"noteGrayLevels":[20,40,75,100]}',
    ].join("\n"),
  );
  await expect(page.getByLabel("D m7 guitar scale fretboard")).toBeVisible();
  await expect(
    page.getByLabel("G Altered dominant guitar scale fretboard"),
  ).toBeVisible();
  await expect(page.getByLabel("C Δ7 guitar scale fretboard")).toBeVisible();
  await shot("concat-samples", { fullPage: true });
  await page.getByLabel("Copied settings URLs").fill(
    [
      copiedSettingsUrl(firstSettings),
      "not a copied settings url",
      copiedSettingsUrl(secondSettings),
    ].join("\n"),
  );

  await expect(
    page.getByText(
      "These lines do not contain valid copied settings URLs: 2.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("C Major guitar scale fretboard")).toBeVisible();
  await expect(
    page.getByLabel("D Altered dominant guitar scale fretboard"),
  ).toBeVisible();
  await shot("concat-pasted", { fullPage: true });
});

test("updates the fretboard label when key and scale change", async ({
  page,
  shot,
}) => {
  await page.goto("/en");
  await expect(page.getByLabel("A m7 guitar scale fretboard")).toBeVisible();
  await shot("key-a-m7");

  await page.getByRole("combobox", { name: "Key" }).selectOption("C");
  await page.getByRole("combobox", { name: "Scale" }).selectOption("M7");

  await expect(
    page.getByLabel("C Δ7 guitar scale fretboard"),
  ).toBeVisible();
  await shot("key-c-maj7");
});

test("shows formal scale names while keeping compact scale identifiers", async ({
  page,
}) => {
  await page.goto("/en");

  const scaleSelect = page.getByRole("combobox", { name: "Scale" });
  await expect(scaleSelect.locator("option").nth(0)).toHaveText("Major");
  await expect(scaleSelect.locator("option").nth(1)).toHaveText("6");
  await expect(scaleSelect.locator("option").nth(2)).toHaveText("69");
  await expect(scaleSelect.locator("option").nth(3)).toHaveText("7");
  await expect(scaleSelect.locator("option", { hasText: "Altered" })).toHaveAttribute(
    "value",
    "alt",
  );

  await scaleSelect.selectOption("alt");

  await expect(
    page.getByLabel("A Altered dominant guitar scale fretboard"),
  ).toBeVisible();
  await expect(scaleSelect).toHaveValue("alt");
});

test("supports editable tuning and string count", async ({ page, shot }) => {
  await page.goto("/en");

  const tuningPreset = page.getByRole("combobox", { name: "Preset" });
  await expect(tuningPreset).toHaveValue("guitar");
  await expect(page.getByLabel("Tuning")).toHaveValue(
    "E4\nB3\nG3\nD3\nA2\nE2",
  );
  await expect(page.locator('svg line[stroke="#a59c8f"]')).toHaveCount(6);
  await shot("tuning-guitar");

  await tuningPreset.selectOption("bass6");
  await expect(page.getByLabel("Tuning")).toHaveValue(
    "C3\nG2\nD2\nA1\nE1\nB1",
  );
  await expect(page.locator('svg line[stroke="#a59c8f"]')).toHaveCount(6);
  await shot("tuning-bass6");

  await page.getByLabel("Tuning").fill("G3\nD3\nA2\nE2");

  await expect(tuningPreset).toHaveValue("custom");
  await expect(page.locator('svg line[stroke="#a59c8f"]')).toHaveCount(4);
  await shot("tuning-four-strings");
});

test("switches between equal-temperament and equal-width fret spacing", async ({
  page,
  shot,
}) => {
  await page.goto("/en");

  const firstFret = page.locator('svg line[stroke="#b7ad9d"]').nth(1);
  await expect(
    page.getByRole("combobox", { name: "Fret spacing" }),
  ).toHaveValue("equal-temperament");
  await expect(firstFret).not.toHaveAttribute("x1", "96");
  await shot("spacing-equal-temperament");

  await page
    .getByRole("combobox", { name: "Fret spacing" })
    .selectOption("equal-width");

  await expect(firstFret).toHaveAttribute("x1", "96");
  await shot("spacing-equal-width");
});

test("syncs the settings editor with the controls", async ({ page }) => {
  await page.goto("/en");

  const settingEditor = page.getByLabel("Settings editor");
  let settings = JSON.parse(await settingEditor.inputValue());
  expect(settings).toMatchObject({
    key: "A",
  });
  expect(settings).not.toHaveProperty("scale");
  expect(settings.tuning).toEqual(["E4", "B3", "G3", "D3", "A2", "E2"]);
  expect(settings.noteGrayLevels).toEqual([20, 40, 75, 100]);
  expect(settings.fretSpacing).toBe("equal-temperament");

  await page.getByRole("combobox", { name: "Key" }).selectOption("C");
  await page.getByRole("combobox", { name: "Scale" }).selectOption("alt");
  const noteSlider = page.getByRole("slider", {
    name: "NOTE grayscale",
    exact: true,
  });
  await noteSlider.focus();
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press("ArrowRight");
  }

  settings = JSON.parse(await settingEditor.inputValue());
  expect(settings).toMatchObject({
    key: "C",
  });
  expect(settings).not.toHaveProperty("scale");
  expect(settings.noteGrayLevels).toEqual([30, 40, 75, 100]);

  await page
    .getByRole("combobox", { name: "Fret spacing" })
    .selectOption("equal-width");

  await settingEditor.fill(
    JSON.stringify(
      {
        key: "D",
        tuning: ["G3", "D3", "A2", "E2"],
        notes: [
          "1",
          "...",
          "...",
          "♭3",
          "...",
          "...",
          "...",
          "5",
          "...",
          "...",
          "♭7",
          "...",
        ],
        noteGrayLevels: [10, 20, 30, 40],
        fretSpacing: "equal-width",
      },
      null,
      2,
    ),
  );

  await expect(page.getByRole("combobox", { name: "Key" })).toHaveValue("D");
  await expect(page.getByRole("combobox", { name: "Scale" })).toHaveValue(
    "custom",
  );
  await expect(page.getByLabel("Tuning")).toHaveValue("G3\nD3\nA2\nE2");
  await expect(page.getByLabel("Notes")).toHaveValue(
    "1\n...\n...\n♭3\n...\n...\n...\n5\n...\n...\n♭7\n...",
  );
  await expect(
    page.getByRole("slider", { name: "NOTE grayscale", exact: true }),
  ).toHaveValue("10");
  await expect(
    page.getByRole("combobox", { name: "Fret spacing" }),
  ).toHaveValue("equal-width");
  await expect(page.locator('svg line[stroke="#a59c8f"]')).toHaveCount(4);
  await expect(page.locator('svg circle[fill="#1a1a1a"]')).not.toHaveCount(0);
  await expect(page.getByLabel("D Custom guitar scale fretboard")).toBeVisible();
});

test("copies and restores settings through the URL", async ({ page }) => {
  await page.goto("/en");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as Window & { copiedSettingsUrl?: string }).copiedSettingsUrl =
            text;
        },
      },
    });
  });

  await page.getByRole("combobox", { name: "Key" }).selectOption("D");
  await page.getByRole("combobox", { name: "Scale" }).selectOption("alt");
  await page
    .getByRole("combobox", { name: "Fret spacing" })
    .selectOption("equal-width");
  await page.getByRole("button", {
    name: "Copy URL with this settings (experimental)",
  }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

  const copiedUrl = await page.evaluate(
    () => (window as Window & { copiedSettingsUrl?: string }).copiedSettingsUrl,
  );
  expect(copiedUrl).toBeTruthy();
  expect(copiedUrl).toContain('?settings={"key":"D"');
  expect(copiedUrl).not.toContain("%7B");
  expect(copiedUrl).not.toContain("%22");
  const settingsParam = new URL(copiedUrl ?? "").searchParams.get("settings");
  expect(settingsParam).toBeTruthy();

  await page.goto(copiedUrl ?? "/en");

  await expect(page.getByRole("combobox", { name: "Key" })).toHaveValue("D");
  await expect(page.getByRole("combobox", { name: "Scale" })).toHaveValue(
    "alt",
  );
  await expect(
    page.getByRole("combobox", { name: "Fret spacing" }),
  ).toHaveValue("equal-width");
  await expect(
    page.getByLabel("D Altered dominant guitar scale fretboard"),
  ).toBeVisible();
});

test("keeps the fretboard above the controls at small and large widths", async ({
  page,
  shot,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/en");

    const fretboardBox = await page
      .getByLabel("A m7 guitar scale fretboard")
      .boundingBox();
    const keyBox = await page
      .getByRole("combobox", { name: "Key" })
      .boundingBox();

    expect(fretboardBox).not.toBeNull();
    expect(keyBox).not.toBeNull();
    if (!fretboardBox || !keyBox) throw new Error("Missing layout element");

    expect(fretboardBox.y + fretboardBox.height).toBeLessThan(keyBox.y);
    await shot(`layout-${viewport.width}px`);
  }
});

test("renders a smaller fretboard on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");

  const fretboardBox = await page
    .getByLabel("A m7 guitar scale fretboard")
    .boundingBox();

  expect(fretboardBox).not.toBeNull();
  if (!fretboardBox) throw new Error("Missing fretboard");

  expect(fretboardBox.width).toBeLessThan(1100);
});

test("shows the 24th fret when the browser is wide enough", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/en");

  const label24Box = await page
    .locator("svg text")
    .filter({ hasText: /^24$/ })
    .first()
    .boundingBox();

  expect(label24Box).not.toBeNull();
  if (!label24Box) throw new Error("Missing 24th fret label");

  expect(label24Box.x + label24Box.width).toBeLessThanOrEqual(1600);
});

test("supports editable dot tokens for out-of-scale and hidden labels", async ({
  page,
  shot,
}) => {
  await page.goto("/en");

  await expect(page.getByLabel("Notes")).toHaveValue(
    "1\n...♭9\n...9\n..♭3\n...3\n...11\n...♯11\n.5\n...♭13\n...13\n..♭7\n...Δ7",
  );
  const notes = page.getByLabel("Notes");
  await notes.click();
  await notes.press("Control+A");
  await notes.press("Backspace");
  await expect(notes).toHaveValue("");
  await notes.fill("1\n...\n...\n♭3\n...\n...\n...\n5\n...\n...\n♭7\n...");

  await expect(notes).toHaveValue(
    "1\n...\n...\n♭3\n...\n...\n...\n5\n...\n...\n♭7\n...",
  );
  await expect(page.getByRole("combobox", { name: "Scale" })).toHaveValue(
    "custom",
  );
  await expect(page.getByLabel("A Custom guitar scale fretboard")).toBeVisible();
  await expect(page.locator("svg text").filter({ hasText: "♭9" })).toHaveCount(0);
  await shot("notes-labels-hidden");
});

test("adjusts note grayscale levels", async ({ page, shot }) => {
  await page.goto("/en");

  await expect(page.locator('svg circle[fill="#333333"]')).not.toHaveCount(0);
  await shot("grayscale-default");
  const noteSlider = page.getByRole("slider", {
    name: "NOTE grayscale",
    exact: true,
  });
  await expect(
    noteSlider.locator("xpath=ancestor::label[1]").getByText("Δ7", { exact: true }),
  ).toBeVisible();
  await noteSlider.focus();
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("ArrowRight");
  }

  await expect(page.locator('svg circle[fill="#999999"]')).not.toHaveCount(0);
  await shot("grayscale-lightened");
});

test("renders Japanese UI at /ja", async ({ page, shot }) => {
  await page.goto("/ja");

  await expect(page.getByRole("heading", { name: "genscale" })).toBeVisible();
  await expect(page.getByRole("button", { name: "SVGを書き出し" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "キー" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "スケール" })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "プリセット" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "フレット間隔" }),
  ).toHaveValue("equal-temperament");
  await expect(
    page
      .getByRole("combobox", { name: "スケール" })
      .locator("option", { hasText: "オルタード" }),
  ).toHaveAttribute("value", "alt");
  await expect(page.getByLabel("チューニング")).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "NOTE のグレースケール", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("設定エディタ")).toBeVisible();
  await expect(page.getByLabel("A m7 ギター指板スケール")).toBeVisible();
  await shot("japanese-ui", { fullPage: true });
});
