// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";

export const USAGE = `Usage: node tools/chords-screenshots/compare.mjs --before REF --after REF --output DIR --device SERIAL --playlist FILE

Captures the Full chart of the same songs from two revisions on one Android
device and builds a gallery comparing them.

  --before REF        Revision to capture first (any revision git can resolve).
  --after REF         Revision to capture second.
  --output DIR        Directory to create; it must not exist yet.
  --device SERIAL     adb serial, as \`adb devices\` prints it.
  --playlist FILE     iReal Pro playlist HTML to import.
  --songs FILE        Songs to capture (default: tools/chords-screenshots/songs.json).
  --preview-port N    Port for the preview server on host and device (default 4173).
  --cdp-port N        Local port forwarded to the device's Chrome (default 19222).`;

const STRINGS = ["before", "after", "output", "device", "playlist", "songs"];
const PORTS = ["preview-port", "cdp-port"];

function port(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1024 || number > 65535) {
    throw new TypeError(`--${name} must be a port between 1024 and 65535`);
  }
  return number;
}

// `repository` is where the tool itself lives, so an output directory inside
// it can be refused: captures and playlists are never committed.
export function parseOptions(argv, { repository, defaultSongs }) {
  const values = {};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (!argument.startsWith("--")) throw new TypeError(`Unexpected argument: ${argument}`);
    const name = argument.slice(2);
    if (![...STRINGS, ...PORTS].includes(name)) throw new TypeError(`Unknown option: ${argument}`);
    const value = argv[++index];
    if (value === undefined || value.startsWith("--")) throw new TypeError(`--${name} needs a value`);
    if (name in values) throw new TypeError(`--${name} was given twice`);
    values[name] = value;
  }

  const missing = ["before", "after", "output", "device", "playlist"].filter(name => !(name in values));
  if (missing.length) throw new TypeError(`Missing ${missing.map(name => `--${name}`).join(", ")}\n\n${USAGE}`);

  const output = path.resolve(values.output);
  const relative = path.relative(repository, output);
  const inside = relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
  if (inside) throw new TypeError(`--output must be outside the repository: ${output}`);

  return {
    before: values.before,
    after: values.after,
    output,
    device: values.device,
    playlist: path.resolve(values.playlist),
    songs: values.songs === undefined ? defaultSongs : path.resolve(values.songs),
    previewPort: "preview-port" in values ? port(values["preview-port"], "preview-port") : 4173,
    cdpPort: "cdp-port" in values ? port(values["cdp-port"], "cdp-port") : 19222,
  };
}
