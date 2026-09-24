// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PLAYWRIGHT = new URL("../../../apps/chords/node_modules/@playwright/test/index.mjs", import.meta.url);
export const SIDES = ["before", "after"];

export const escapeHtml = value => String(value).replace(/[&<>"]/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
const short = commit => commit.slice(0, 12);
const number = index => String(index).padStart(2, "0");

const STYLE = `
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: #11151b; color: #e7edf5;
    font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  h2 { font-size: 15px; margin: 0 0 10px; }
  .meta { color: #9fb0c4; font-size: 12px; margin: 0 0 4px; }
  code { font-family: ui-monospace, monospace; color: #cfe0f4; }
  a { color: #7fb5ff; }
  figure { margin: 0; min-width: 0; }
  figcaption { color: #9fb0c4; font-size: 12px; margin: 0 0 6px; display: flex; gap: 8px; justify-content: space-between; }
  .side { color: #e7edf5; font-weight: 600; }
  .shots { display: grid; gap: 16px; align-items: start; }
  .grew { color: #ffce7a; }
`;
// Both sides share one column width, so they are drawn at one scale: a row
// that grew taller is taller here, and nothing is stretched or cropped.
const GALLERY_STYLE = `
  .shots { grid-template-columns: 1fr 1fr; }
  .shots img { display: block; width: 100%; height: auto; border: 1px solid #2b3542; background: #000; }
  section { margin: 0 0 34px; }
  .links { margin: 8px 0 0; font-size: 12px; }
  .links a { margin-right: 14px; }
`;
// A pair is drawn at the captures' own size, one pixel to one pixel.
const PAIR_STYLE = `
  body { padding: 0; }
  .pair { display: inline-block; padding: 20px; }
  .pair .shots { grid-template-columns: max-content max-content; gap: 20px; }
  .pair img { display: block; border: 1px solid #2b3542; background: #000; }
  footer { color: #9fb0c4; font-size: 12px; margin: 12px 0 0; }
`;

const shotPath = (report, side, song) => `${side}/${report.sides[side].songs[song.index - 1].file}`;

function figure(report, side, song, from) {
  const source = path.posix.join(from, shotPath(report, side, song));
  const size = song.sizes?.[side];
  return `<figure><figcaption><span class="side">${side}</span><code>${short(report.sides[side].commit)}</code>` +
    (size ? `<span>${size.width}&times;${size.height}</span>` : "") + `</figcaption>` +
    `<a href="${escapeHtml(source)}"><img src="${escapeHtml(source)}" alt="${escapeHtml(`${song.title}, ${side}`)}"></a></figure>`;
}

export function pairPage(report, song) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(song.title)}</title>
<style>${STYLE}${PAIR_STYLE}</style></head>
<body><div class="pair">
<h2>${number(song.index)}. ${escapeHtml(song.title)} &middot; ${escapeHtml(song.composer)}</h2>
<div class="shots">${SIDES.map(side => figure(report, side, song, "..")).join("")}</div>
<footer>before <code>${short(report.sides.before.commit)}</code> &middot; after <code>${short(report.sides.after.commit)}</code> &middot; ${escapeHtml(report.conditions.join(" · "))}</footer>
</div></body></html>`;
}

export function galleryPage(report) {
  const sections = report.songs.map(song => {
    const { before, after } = song.sizes ?? {};
    const difference = before && after ? after.height - before.height : 0;
    const note = !before || !after ? "" : difference === 0 ? "same height"
      : `after is ${Math.abs(difference)}px ${difference > 0 ? "taller" : "shorter"}`;
    return `<section>
<h2>${number(song.index)}. ${escapeHtml(song.title)} <span class="grew">${escapeHtml(note)}</span></h2>
<div class="shots">${SIDES.map(side => figure(report, side, song, ".")).join("")}</div>
<p class="links"><a href="pairs/${number(song.index)}.png">comparison image</a>` +
      SIDES.map(side => `<a href="${escapeHtml(shotPath(report, side, song))}">${side} capture</a>`).join("") + `</p>
</section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Full chart: ${escapeHtml(report.sides.before.ref)} vs ${escapeHtml(report.sides.after.ref)}</title>
<style>${STYLE}${GALLERY_STYLE}</style></head>
<body>
<header>
<h1>Full chart: ${escapeHtml(report.sides.before.ref)} vs ${escapeHtml(report.sides.after.ref)}</h1>
<p class="meta">before <code>${escapeHtml(report.sides.before.commit)}</code></p>
<p class="meta">after <code>${escapeHtml(report.sides.after.commit)}</code></p>
<p class="meta">device <code>${escapeHtml(report.device)}</code> &middot; ${escapeHtml(report.conditions.join(" · "))}</p>
<p class="meta">${report.songs.length} songs, ${escapeHtml(String(report.sides.before.viewport.width))}&times;${escapeHtml(String(report.sides.before.viewport.height))} at ${escapeHtml(String(report.sides.before.viewport.deviceScaleFactor))}x. Each capture links to the file it came from.</p>
</header>
${sections}
</body></html>`;
}

// One comparison image per song, drawn from the captures themselves.
export async function renderGallery(output, report, signal) {
  signal?.throwIfAborted();
  const { chromium } = await import(PLAYWRIGHT.href);
  const pairs = path.join(output, "pairs");
  const page = path.join(pairs, "_pair.html");
  await mkdir(pairs, { recursive: true });
  const browser = await chromium.launch();
  const abort = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    signal?.throwIfAborted();
    const tab = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
    for (const song of report.songs) {
      await writeFile(page, pairPage(report, song));
      await tab.goto(pathToFileURL(page).href);
      await tab.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      const [before, after] = await tab.evaluate(() => [...document.images]
        .map(image => ({ width: image.naturalWidth, height: image.naturalHeight })));
      song.sizes = { before, after };
      await tab.locator(".pair").screenshot({ path: path.join(pairs, `${number(song.index)}.png`) });
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    await rm(page, { force: true });
    await browser.close();
  }
  await writeFile(path.join(output, "index.html"), galleryPage(report));
  await writeFile(path.join(output, "metadata.json"), `${JSON.stringify(report, null, 2)}\n`);
}
