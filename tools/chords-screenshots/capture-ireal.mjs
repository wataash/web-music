#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseSongs, songFile } from './src/songs.mjs';
import { uiNodes, byId, center, searchQuery, matchSong, keyPitch } from './src/ireal-ui.mjs';

const { values } = parseArgs({ options: {
  device: { type: 'string' }, output: { type: 'string' }, songs: { type: 'string' },
  resume: { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
} });
if (values.help) {
  console.log('Usage: node tools/chords-screenshots/capture-ireal.mjs --device SERIAL --output DIR [--songs FILE] [--resume]\nStart iReal Pro with its search screen or a song opened from search. Uses the existing Jazz 1460 library and fullscreen display settings.');
  process.exit(0);
}
if (!values.device || !values.output) throw new Error('--device and --output are required');
const output = path.resolve(values.output);
const repository = path.resolve(import.meta.dirname, '../..');
if (output === repository || output.startsWith(repository + path.sep)) throw new Error('Output must be outside the repository');
const songs = parseSongs(await readFile(values.songs ?? new URL('./songs.json', import.meta.url), 'utf8'), 'songs.json');
const catalog = JSON.parse(await readFile(new URL('../ireal-analysis/jazz-1460-chart-features.json', import.meta.url), 'utf8')).songs;
for (const song of songs) {
  if (!catalog.some(entry => entry.title === song.title && entry.composer === song.composer)) throw new Error(`Song not found in the Jazz 1460 catalog: ${song.title}`);
}
const metadataPath = path.join(output, 'metadata.json');
const report = values.resume ? JSON.parse(await readFile(metadataPath, 'utf8')) : { device: values.device, songs: [], elapsedMs: 0, complete: false };
if (report.device !== values.device) throw new Error('Resume device does not match');
for (const [i, song] of report.songs.entries()) {
  if (songs[i]?.title !== song.title || songs[i]?.composer !== song.composer) throw new Error('Resume song list does not match');
  if (song.file !== songFile(songs[i], i)) throw new Error('Resume image filename does not match');
  await access(path.join(output, song.file));
}
if (!values.resume) await mkdir(output);
if (report.complete && report.songs.length === songs.length) {
  console.log(`Already complete: ${metadataPath}`);
  process.exit(0);
}
const run = new AbortController();
for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => run.abort());
const exec = promisify(execFile);
const adb = async (...args) => (await exec('adb', ['-s', values.device, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, signal: run.signal })).stdout;
const shell = command => adb('shell', command);
const quote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
const tap = node => { const [x,y] = center(node); return shell(`input tap ${x} ${y}`); };
const dumpPath = `/sdcard/chords-capture-${process.pid}.xml`;
const dump = async () => {
  const result = await adb('shell', 'uiautomator', 'dump', dumpPath);
  if (!result.includes(`UI hierchary dumped to: ${dumpPath}`)) throw new Error(`UI dump failed: ${result.trim()}`);
  return uiNodes(await adb('shell', 'cat', dumpPath));
};
let nodes;
async function showSearch() {
  if (byId(nodes, 'open_search_view_edit_text')) return;
  const chart = byId(nodes, 'songScrollView');
  if (chart) {
    if (!byId(nodes, 'topBar')) { await tap(chart); nodes = await dump(); }
    const back = nodes.find(n => n['content-desc'] === 'Back');
    if (!back) throw new Error('Cannot find the song Back button');
    await tap(back);
    nodes = await dump();
  }
  if (!byId(nodes, 'open_search_view_edit_text')) throw new Error('Open iReal Pro search, then rerun with --resume');
}
const priorMs = report.elapsedMs;
const start = performance.now();
const save = async () => {
  report.elapsedMs = priorMs + performance.now() - start;
  await writeFile(metadataPath, JSON.stringify(report, null, 2) + '\n');
};
try {
  nodes = await dump();
  const info = await adb('shell', 'dumpsys', 'package', 'com.massimobiolcati.irealb');
  const appVersion = /versionName=(\S+)/.exec(info)?.[1] ?? 'unknown';
  const display = (await adb('shell', 'wm', 'size')).trim();
  if (report.songs.length && (report.appVersion !== appVersion || report.display !== display)) throw new Error('App version or display changed since the previous capture');
  report.appVersion = appVersion;
  report.display = display;
  await save();
  await showSearch();
  for (let i=report.songs.length; i<songs.length; i++) {
    const song = songs[i];
    const started = performance.now();
    const clear = byId(nodes, 'open_search_view_clear_button');
    if (clear) await tap(clear);
    await tap(byId(nodes, 'open_search_view_edit_text'));
    await shell(`input text ${quote(searchQuery(song.title).replaceAll(' ', '%s'))}`);
    await shell('input keyevent 4');
    nodes = await dump();
    const match = matchSong(nodes, song);
    await tap(match);
    nodes = await dump();
    if (!byId(nodes, 'songScrollView')) throw new Error(`No chart opened for ${song.title}`);
    if (!byId(nodes, 'topBar')) { await tap(byId(nodes, 'songScrollView')); nodes = await dump(); }
    const key = byId(nodes, 'playerTranspositionButton')?.text;
    const expected = catalog.find(s => s.title === song.title && s.composer === song.composer)?.key;
    if (keyPitch(key) !== keyPitch(expected)) throw new Error(`${song.title}: displayed key ${key} differs from ${expected}; restore the original key and resume`);
    await tap(byId(nodes, 'songScrollView'));
    nodes = await dump();
    const chart = byId(nodes, 'songScrollView');
    if (!chart || byId(nodes, 'topBar') || chart.scrollable !== 'false') throw new Error(`${song.title}: chart does not fit fullscreen; adjust its display and resume`);
    await sleep(250, undefined, { signal: run.signal });
    const file = songFile(song, i);
    const { stdout } = await exec('adb', ['-s', values.device, 'exec-out', 'screencap', '-p'], { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024, signal: run.signal });
    await writeFile(path.join(output, file), stdout);
    report.songs.push({ title: song.title, composer: song.composer, file, key, originalKey: expected, selectionLabel: match['content-desc'], chartBounds: chart.bounds, elapsedMs: performance.now() - started });
    await save();
    console.log(`iReal ${i+1}/${songs.length}: ${song.title}`);
    await showSearch();
  }
  report.complete = true;
  await save();
  console.log(`iReal capture: ${(report.elapsedMs / 1000).toFixed(1)} s; ${metadataPath}`);
} catch (error) {
  await save();
  console.error(error.message);
  process.exitCode = run.signal.aborted ? 130 : 1;
} finally {
  await exec('adb', ['-s', values.device, 'shell', 'rm', dumpPath]).catch(() => {});
}
