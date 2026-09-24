// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { songFile } from "./songs.mjs";
import { PHONE } from "./options.mjs";

const PLAYWRIGHT = new URL("../../../apps/chords/node_modules/@playwright/test/index.mjs", import.meta.url);
const TIMEOUT = 60_000;

// How every capture is taken, on both sides, so the pictures can only differ
// in how the chart itself is drawn. Which browser drew them is read from the
// browser afterwards, not assumed here.
export const CONDITIONS = [
  "dark theme",
  "original key (no transposition)",
  "Chart size: Fit",
  "chord names with degrees",
  "minor chords written with -",
  "annotation highlighting off",
];

// The chart sits in scrolling ancestors, so a screenshot of it stops where
// the screen does. Opening them up is only safe while the rows keep the size
// they had; the chart on the picture is then the chart on the screen.
const UNCLIP = element => {
  const measure = () => [...element.querySelectorAll(".ireal-row")].map(row => {
    const rect = row.getBoundingClientRect();
    return [Math.round(rect.width * 100), Math.round(rect.height * 100)];
  });
  const before = measure();
  const originals = [];
  for (let node = element; node; node = node.parentElement) {
    originals.push([node, node.getAttribute("style")]);
    node.style.setProperty("overflow", "visible", "important");
    node.style.setProperty("contain", "none", "important");
  }
  for (const node of document.querySelectorAll(".step-buttons, .appbar")) {
    originals.push([node, node.getAttribute("style")]);
    node.style.setProperty("visibility", "hidden", "important");
  }
  window.__chordsCaptureOriginals = originals;
  const after = measure();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Unclipping changed the chart layout");
};

const RESTORE = () => {
  for (const [node, style] of window.__chordsCaptureOriginals ?? []) {
    if (style === null) node.removeAttribute("style"); else node.setAttribute("style", style);
  }
  delete window.__chordsCaptureOriginals;
};

// Whatever faces the page declares are loaded before anything is measured.
// Which face that is belongs to the revision, not to this tool.
const FONTS = async () => {
  await document.fonts.ready;
  const faces = [...document.fonts];
  await Promise.all(faces.map(face => face.load()));
  await document.fonts.ready;
  return faces.map(face => ({ family: face.family, status: face.status }));
};

// Chrome on this machine gets a context of its own at the phone's size; the
// device's Chrome is used as it stands, in a page of its own.
async function openPage(chromium, mode, cdpPort) {
  if (mode === "android") {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    return { browser, page: await browser.contexts()[0].newPage() };
  }
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: PHONE.width, height: PHONE.height },
    deviceScaleFactor: PHONE.deviceScaleFactor,
    colorScheme: "dark",
    serviceWorkers: "block",
  });
  return { browser, page: await context.newPage() };
}

async function importPlaylist(page, playlist) {
  await page.getByRole("button", { name: "Choose song", exact: true }).click();
  await page.getByRole("button", { name: "Add chart", exact: true }).click();
  await page.getByRole("radio", { name: "iReal Pro", exact: true }).check();
  await page.getByLabel("Shared link / HTML").fill(playlist);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("status").filter({ hasText: /Added \d+ songs?/ }).waitFor();
  await page.getByRole("button", { name: "Close song library" }).click();
}

async function applySettings(page) {
  await page.getByRole("group", { name: "View mode" }).getByRole("button", { name: "Card", exact: true }).click();
  await page.getByRole("button", { name: "Chord practice settings", exact: true }).click();
  await page.getByRole("group", { name: "Chord names" }).getByRole("button", { name: "Dm7 + IIm7", exact: true }).click();
  const minor = page.getByRole("menuitemcheckbox", { name: "Write minor chords as Cm7" });
  if (await minor.getAttribute("aria-checked") === "true") await minor.click();
  await page.keyboard.press("Escape");
}

async function openSong(page, song) {
  await page.getByRole("button", { name: "Choose song", exact: true }).click();
  await page.getByLabel("Search songs", { exact: true }).fill(song.title);
  await page.getByLabel("Song", { exact: true }).getByRole("button", { name: song.label, exact: true }).click();
  const close = page.getByRole("button", { name: "Close song library" });
  if (await close.isVisible()) await close.click();
  const details = page.locator("details.song-source");
  if (await details.getAttribute("open") === null) await page.getByText("Full chart", { exact: true }).click();
  await details.waitFor();
  const originalKey = await details.locator('dl[aria-label="Source song information"] > div')
    .filter({ has: page.locator("dt", { hasText: /^Original key$/ }) }).locator("dd").textContent();
  await page.getByLabel("Song key", { exact: true }).selectOption(originalKey.trim().replace(/[-m]$/, ""));
  await page.getByLabel("Chart size", { exact: true }).selectOption("1");
  const highlight = page.getByLabel("Highlight annotations", { exact: true });
  if (await highlight.isChecked()) await highlight.uncheck();
}

// Photographs each song's chart in the browser asked for. On a device the
// browser and its context are the device's own, so only the page opened here
// is closed; on this machine the whole browser belongs to the run.
export async function captureSide({ browser: mode, cdpPort, url, playlist, songs, directory, signal }) {
  signal?.throwIfAborted();
  const { chromium } = await import(PLAYWRIGHT.href);
  await mkdir(directory, { recursive: true });
  const { browser, page } = await openPage(chromium, mode, cdpPort);
  const abort = () => { void page.close().catch(() => {}); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    page.setDefaultTimeout(TIMEOUT);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setBypassServiceWorker", { bypass: true });
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(url, { waitUntil: "networkidle" });

    await importPlaylist(page, playlist);
    await applySettings(page);

    const captured = [];
    let fonts = [];
    for (const [index, song] of songs.entries()) {
      signal?.throwIfAborted();
      await openSong(page, song);
      const chart = page.locator(".full-score");
      await chart.scrollIntoViewIfNeeded();
      fonts = await page.evaluate(FONTS);
      const unloaded = fonts.filter(face => face.status !== "loaded");
      if (unloaded.length) throw new Error(`Fonts did not load: ${unloaded.map(face => face.family).join(", ")}`);

      const file = songFile(song, index);
      await chart.evaluate(UNCLIP);
      try {
        await chart.screenshot({ path: path.join(directory, file) });
      } finally {
        await page.evaluate(RESTORE);
      }
      captured.push({
        index: index + 1,
        title: song.title,
        composer: song.composer,
        file,
        rows: await chart.locator(".ireal-row").count(),
        key: await page.getByLabel("Song key", { exact: true }).inputValue(),
        viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio })),
        chords: await chart.locator(".chord").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-label"))),
      });
      console.log(`${path.basename(directory)} ${index + 1}/${songs.length}: ${song.title}`);
    }
    return {
      viewport: captured.at(-1).viewport,
      browser: { mode, version: browser.version() },
      fonts: fonts.map(face => face.family).sort(),
      songs: captured,
    };
  } finally {
    signal?.removeEventListener("abort", abort);
    await page.close().catch(() => {});
    await browser.close();
  }
}
