// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { copyFile, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PLAYWRIGHT = new URL("../../../apps/chords/node_modules/@playwright/test/index.mjs", import.meta.url);
export const SIDES = ["before", "after"];

// The captures made in iReal Pro, when there are any, stand to the right of
// the two revisions.
export const columnsOf = report => report.ireal ? [...SIDES, "ireal"] : SIDES;

// Captures made by hand in iReal Pro. They are only comparable when they are
// of the same songs, so every song must be there, named the same way, and
// each file must be one the directory itself holds.
export function readIrealCaptures(parsed, songs, source) {
  if (!Array.isArray(parsed?.songs)) throw new Error(`${source}: expected "songs" to be an array`);
  if (parsed.songs.length !== songs.length) {
    throw new Error(`${source}: ${parsed.songs.length} captures for ${songs.length} songs`);
  }
  const captures = new Map();
  for (const [index, capture] of parsed.songs.entries()) {
    const { title, composer, file } = capture ?? {};
    if (typeof title !== "string" || typeof composer !== "string" || typeof file !== "string" || !file) {
      throw new Error(`${source}: capture ${index + 1} needs a "title", a "composer" and a "file"`);
    }
    if (path.posix.isAbsolute(file) || path.win32.isAbsolute(file) || file.split(/[\\/]/).includes("..")) {
      throw new Error(`${source}: "${file}" reaches outside the directory`);
    }
    if (captures.has(title)) throw new Error(`${source}: "${title}" is captured twice`);
    captures.set(title, { title, composer, file });
  }
  return songs.map(song => {
    const capture = captures.get(song.title);
    if (!capture) throw new Error(`${source}: no capture of "${song.title}"`);
    if (capture.composer !== song.composer) {
      throw new Error(`${source}: "${song.title}" is by "${capture.composer}" there and "${song.composer}" here`);
    }
    return capture;
  });
}

// Real paths on both sides, so a link pointing out of the directory cannot
// bring in a file from elsewhere. The copies are named by their base name, so
// two captures may not share one.
export async function copyIrealCaptures(directory, output, captures) {
  const root = await realpath(directory);
  const into = path.join(output, "ireal");
  await mkdir(into, { recursive: true });
  const names = new Set();
  const copied = [];
  for (const capture of captures) {
    const source = await realpath(path.resolve(root, capture.file))
      .catch(() => { throw new Error(`"${capture.file}" is not a file in ${directory}`); });
    const relative = path.relative(root, source);
    if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`"${capture.file}" reaches outside ${directory}`);
    }
    const name = path.basename(source);
    if (names.has(name)) throw new Error(`Two captures would both be written as "${name}"`);
    names.add(name);
    await copyFile(source, path.join(into, name));
    copied.push({ ...capture, file: name });
  }
  return copied;
}

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

const shotPath = (report, column, song) => column === "ireal"
  ? `ireal/${report.ireal.songs[song.index - 1].file}`
  : `${column}/${report.sides[column].songs[song.index - 1].file}`;

const columnNote = (report, column) => column === "ireal"
  ? escapeHtml(report.ireal.device ?? "iReal Pro")
  : `<code>${short(report.sides[column].commit)}</code>`;

function figure(report, column, song, from) {
  const source = path.posix.join(from, shotPath(report, column, song));
  const size = song.sizes?.[column];
  return `<figure><figcaption><span class="side">${column}</span>${columnNote(report, column)}` +
    (size ? `<span>${size.width}&times;${size.height}</span>` : "") + `</figcaption>` +
    `<a href="${escapeHtml(source)}"><img src="${escapeHtml(source)}" alt="${escapeHtml(`${song.title}, ${column}`)}"></a></figure>`;
}

export function pairPage(report, song) {
  const columns = columnsOf(report);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(song.title)}</title>
<style>${STYLE}${PAIR_STYLE}</style></head>
<body><div class="pair">
<h2>${number(song.index)}. ${escapeHtml(song.title)} &middot; ${escapeHtml(song.composer)}</h2>
<div class="shots" style="grid-template-columns: repeat(${columns.length}, max-content)">${columns.map(column => figure(report, column, song, "..")).join("")}</div>
<footer>before <code>${short(report.sides.before.commit)}</code> &middot; after <code>${short(report.sides.after.commit)}</code> &middot; ${escapeHtml(report.conditions.join(" · "))}</footer>
</div></body></html>`;
}

export function galleryPage(report) {
  const columns = columnsOf(report);
  const sections = report.songs.map(song => {
    const { before, after } = song.sizes ?? {};
    const difference = before && after ? after.height - before.height : 0;
    const note = !before || !after ? "" : difference === 0 ? "same height"
      : `after is ${Math.abs(difference)}px ${difference > 0 ? "taller" : "shorter"}`;
    return `<section>
<h2>${number(song.index)}. ${escapeHtml(song.title)} <span class="grew">${escapeHtml(note)}</span></h2>
<div class="shots" style="grid-template-columns: repeat(${columns.length}, 1fr)">${columns.map(column => figure(report, column, song, ".")).join("")}</div>
<p class="links"><a href="pairs/${number(song.index)}.png">comparison image</a>` +
      columns.map(column => `<a href="${escapeHtml(shotPath(report, column, song))}">${column} capture</a>`).join("") + `</p>
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
<p class="meta">${escapeHtml(report.sides.before.browser.mode)} <code>${escapeHtml(report.sides.before.browser.version)}</code>${report.device ? ` on <code>${escapeHtml(report.device)}</code>` : ""} &middot; ${escapeHtml(report.conditions.join(" · "))}</p>
${report.ireal ? `<p class="meta">iReal Pro captures from <code>${escapeHtml(report.ireal.device ?? "an unnamed device")}</code>${report.ireal.elapsedMs ? ` in ${Math.round(report.ireal.elapsedMs / 1000)}s` : ""}</p>` : ""}
${SIDES.map(side => `<p class="meta">${side} built in ${(report.sides[side].buildMs / 1000).toFixed(1)}s, captured in ${(report.sides[side].captureMs / 1000).toFixed(1)}s</p>`).join("")}
${report.timings ? `<p class="meta">gallery ${(report.timings.galleryMs / 1000).toFixed(1)}s, ${(report.timings.totalMs / 1000).toFixed(1)}s in all</p>` : ""}
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
      const measured = await tab.evaluate(() => [...document.images]
        .map(image => ({ width: image.naturalWidth, height: image.naturalHeight })));
      song.sizes = Object.fromEntries(columnsOf(report).map((column, at) => [column, measured[at]]));
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
