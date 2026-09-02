// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, devices } from "@playwright/test";

// See https://playwright.dev/docs/test-configuration.
// One stamp for the whole run, so a checkpoint's directory holds one file per
// run and they sort in the order they were taken.
process.env.PLAYWRIGHT_RUN_STAMP ??= new Date()
  .toISOString()
  .replaceAll(/[-:]/g, "")
  .replace(/\.\d+Z$/, "Z");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* Every test imports the decks from scratch, so the workers compete for the
     dev server and for ~17 MB of parsing each. Six at once times out on
     WebKit, and three started dropping a test a run once the interval deck
     grew its keyboards; two is comfortable. */
  workers: process.env.CI ? 1 : 2,
  // > By default, HTML report is opened automatically if some of the tests failed.
  // -> change to 'never'
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:17381",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Preserve the final screen for failures; named checkpoints are enabled separately. */
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  /* Every test starts with empty storage, so the app imports the decks from
     the dev server's `/__dev_deck/` route. That needs the decks to have been
     generated: run `pnpm generate:decks` at the root first. */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:17381",
    reuseExistingServer: !process.env.CI,
  },
});
