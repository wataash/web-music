// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// A `shot` fixture (a fixture injects a capability into a test) that saves a
// named checkpoint screenshot, so a test with visible state changes can be
// reviewed as a sequence of PNGs.
//
// They are kept outside `test-results/`, which Playwright empties before every
// run, and filed by checkpoint rather than by run: one directory per screen,
// holding that screen as it was on each run. Opening one in an image viewer
// and holding the arrow key shows what the interface did between then and now.

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { expect, test as base } from "@playwright/test";

// Beside the app rather than under the tests, and outside `test-results/`.
const SCREENSHOT_DIRECTORY = "screenshots";

type ShotOptions = {
  fullPage?: boolean;
};

type ScreenshotFixtures = {
  shot: (label: string, options?: ShotOptions) => Promise<void>;
};

// Set by the config, so every test of a run files its screenshots under the
// same name and the runs line up across checkpoints.
function runStamp(): string {
  return process.env.PLAYWRIGHT_RUN_STAMP ?? forFilename(new Date().toISOString());
}

function forFilename(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "unnamed"
  );
}

export const test = base.extend<ScreenshotFixtures>({
  shot: async ({ browserName, page }, provide, testInfo) => {
    let sequence = 0;

    await provide(async (label, options = {}) => {
      // Chromium alone, so the same screen is not saved three times over.
      if (browserName !== "chromium") return;

      sequence += 1;
      const id = String(sequence).padStart(3, "0");
      const path = join(
        testInfo.project.testDir,
        "..",
        SCREENSHOT_DIRECTORY,
        forFilename(testInfo.title),
        `${id}.${forFilename(label)}`,
        `${runStamp()}.png`,
      );
      await mkdir(dirname(path), { recursive: true });
      await page.screenshot({ path, fullPage: options.fullPage ?? false });
      await testInfo.attach(`${id} ${label}`, {
        path,
        contentType: "image/png",
      });
    });
  },
});

export { expect };
