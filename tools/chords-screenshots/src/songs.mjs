// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The library lists a song as `Title · Composer`, so a capture needs both to
// pick the right one out of a playlist of more than a thousand.
export function parseSongs(text, source) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source}: ${error.message}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`${source}: expected a non-empty array of songs`);
  const titles = new Set();
  return parsed.map((song, index) => {
    const { title, composer } = song ?? {};
    if (typeof title !== "string" || !title || typeof composer !== "string" || !composer) {
      throw new Error(`${source}: song ${index + 1} needs a "title" and a "composer"`);
    }
    if (titles.has(title)) throw new Error(`${source}: "${title}" is listed twice`);
    titles.add(title);
    return { title, composer, label: `${title} · ${composer}` };
  });
}

// A stable file name per song: its place in the list, then its title with its
// accents folded into the letters they sit on.
export function songFile(song, index) {
  const slug = song.title.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${String(index + 1).padStart(2, "0")}-${slug || "song"}.png`;
}
