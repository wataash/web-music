<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->

# chords-screenshots

Captures the Chords Full chart from two revisions on one Android device and
builds a gallery comparing them song by song.

```sh
node tools/chords-screenshots/compare.mjs --before base --after main --output /tmp/example --device emulator-5554 --playlist tools/ireal-analysis/data/jazz-1460.html
```

| Option | |
|---|---|
| `--before` `--after` | Revisions to capture, in that order. Anything `git rev-parse` resolves; the same revision twice checks the capture against itself. |
| `--output` | Directory to create. It must not exist, and it must be outside the repository. |
| `--device` | adb serial, as `adb devices` prints it. |
| `--playlist` | iReal Pro playlist HTML to import. |
| `--songs` | Songs to capture; defaults to `songs.json` next to this file. |
| `--preview-port` | Port served on the host and reversed onto the device (default 4173). |
| `--cdp-port` | Host port forwarded to the device's Chrome (default 19222). |

## Song selection

The default 50-song list preserves the original 13 captures in order, starting
with **It Could Happen To You**. Six familiar standards provide ordinary-chart
comparisons; the remaining selections broaden coverage of the local Jazz 1460
feature catalog:

- All 25 source keys, six time signatures plus unspecified meter, and final-row
  lengths from 0 to 8 measures.
- All recorded per-measure chord densities and ending numbers, including brackets
  spanning rows and short, medium and long charts.
- Catalog maxima for rows, measures, main, alternate, slash and narrow chords, repeat signs,
  navigation marks, fermatas, notes, meter changes and row gaps.

Examples include **Harlequin** (30 slash chords), **H & H** (six meter changes),
**Fantasy in D (or Ugetsu)** (15 two-bar repeats), **Locomotion** (six fermatas)
and **You Know I Care** (seven row gaps). These are layout samples, not a claim
to cover every chord spelling or every combination of features. Tests check
the list against the tracked feature catalog; no playlist download is needed.

## What it needs

- `git`, `adb` and `tar` on the path, and Node 22.5 or newer.
- The repository's dependencies installed: both revisions are built against
  this checkout's `node_modules`.
- Playwright's desktop Chromium installed, for rendering the comparison PNGs.
- The Android device already running, with Chrome open and USB debugging on.
  The tool never starts, stops or configures the device or the browser.

## What it does

Each revision is resolved to a commit and unpacked with `git archive` into a
temporary directory; the working tree is never checked out, switched or
stashed. That copy is built with Vite and served with `vite preview`, and the
device reaches it through `adb reverse` on the same port.

The chart is photographed through Chrome's debugging port with the cache and
service workers off, in the dark theme, in the song's original key, at chart
size Fit, with chord degrees on. Whatever web fonts the page declares are
loaded before anything is measured — which font that is belongs to the
revision, not to this tool.

The chart scrolls inside its ancestors, so a screenshot of it would stop where
the screen does. Those ancestors are opened up for the exposure and the row
sizes are measured before and after: if opening them changed the layout, the
capture fails rather than record a chart that is not the one on screen.

Afterwards the two sides are checked against each other. The songs, the row
counts, the window and every chord's accessible name must match; only the
drawing may differ. The output then holds `before/` and `after/` captures,
`pairs/NN.png` comparing each song, `index.html`, and `metadata.json` with the
commits, the conditions and the songs.

## Limits

- Both revisions share this checkout's install. Before building, the lockfile,
  the app manifest and the source of the workspace packages Chords depends on
  are compared against the revision; if they differ, the run stops and says
  so, since a dependency link would resolve to the checkout's copy. Capture
  such a revision from a checkout of its own.
- Captures must stay outside the repository. The playlist is a local input and is never copied into the output or committed by the tool.
- Only what the run starts is cleaned up: its preview server, its temporary
  copies, and the adb mappings it made. Mappings that were already there are
  reused and left in place, and one that points somewhere else stops the run
  rather than being taken over.
- SIGINT/SIGTERM stops the run and cleans up those resources. Partial output
  remains available for inspection; rerun with a new output directory.
- The selected localhost preview origin retains imported songs and display
  preferences in Android Chrome. Use a dedicated preview port for this tool.

## Tests

```sh
node --test tools/chords-screenshots/src/*.test.mjs
```

They cover the parts that are pure: the command line, the song list, the adb
listings, the dependency comparison, the cross-checks between the two sides
and the pages the gallery writes.
