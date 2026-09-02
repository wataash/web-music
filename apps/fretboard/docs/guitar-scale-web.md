# genscale specification

## AI prompt

Fret positions can be chosen from
- `L - L / 2^(n/12)`, computed from the equal-temperament string length ratio
  (default)
- equal spacing

Block inlays, with n as the number of strings:
- x width: 60% of the gap between the fret lines on either side of the position
- y top: 20% of the way from string 1 to string 2
- y bottom: 80% of the way from string (n - 1) to string n

## Overview

genscale is a web app that visualises scales and chord tones on a guitar
fretboard. In `edit` you set the key, a scale preset and the tuning, and the
function name of each note is shown from fret 0 to 24. In `concat` you paste
several settings URLs, obtained from
`Copy URL with this settings (experimental)`, and the fretboards are stacked
vertically. The `concat` textarea starts with three sample URLs already in it.
The fretboard shown in `edit` can be exported as SVG.

## Features

- key selection
- scale preset selection
- enharmonic key spellings
- custom editing of the 12 note labels
- greyscale adjustment of the NOTE colours
- switching fret spacing between equal temperament and equal width
- drawing scale tones differently from non-scale tones
- SVG rendering of the 24-fret fretboard
- downloading the SVG on screen
- a link to the GitHub repository
- copying a URL that carries the current settings
- tab switching between edit and concat
- previewing several settings URLs at once

## Screens

The app has two screens, `edit` and `concat`, switched by tabs.

```text
genscale     [GitHub] [Export SVG in edit]  [EN][JA]
[edit] [concat]

edit
+--------------------------------------------------------------+
|                                                              |
|                    fretboard SVG preview                     |
|                                                              |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| Key / Scale                                                  |
| [select box] [select box]                                    |
|                                                              |
| Notes                                                        |
| +----------------------------------------------------------+ |
| |                                                          | |
| | textarea                                                 | |
| |                                                          | |
| +----------------------------------------------------------+ |
|                                                              |
| NOTE grayscale                                               |
| [NOTE  (Δ7) 20%] [slider]                                   |
| [.NOTE (Δ7) 40%] [slider]                                   |
| [..NOTE(Δ7) 75%] [slider]                                   |
| [...NOTE(Δ7)100%] [slider]                                  |
|                                                              |
| Tuning                                                       |
| [select box]                                                 |
| +----------------------------------------------------------+ |
| | E4                                                       | |
| | B3                                                       | |
| | G3                                                       | |
| | D3                                                       | |
| | A2                                                       | |
| | E2                                                       | |
| +----------------------------------------------------------+ |
|                                                              |
| Fret spacing                                                 |
| [Equal temperament / Equal width]                            |
|                                                              |
| Settings editor                                              |
| +----------------------------------------------------------+ |
| | {                                                        | |
| |   "key": "A",                                           | |
| |   "tuning": ["E4", "B3", "G3", "D3", "A2", "E2"],       | |
| |   "notes": ["1", "...♭9", "...9", "..♭3", "...3", ...] | |
| | }                                                        | |
| +----------------------------------------------------------+ |
| [Copy URL with this settings (experimental)]                |
+--------------------------------------------------------------+

concat
+--------------------------------------------------------------+
| Copied settings URLs                                         |
| +----------------------------------------------------------+ |
| | http://localhost:18427/?settings={"key":"D",...}         | |
| | http://localhost:18427/?settings={"key":"G",...}         | |
| | http://localhost:18427/?settings={"key":"C",...}         | |
| +----------------------------------------------------------+ |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| Line 1: D m7                                                 |
| fretboard                                                    |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| Line 2: G Altered                                            |
| fretboard                                                    |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| Line 3: C Δ7                                                 |
| fretboard                                                    |
+--------------------------------------------------------------+
```

- `edit` shows the fretboard SVG in the preview area at the top, and the panel
  below it edits the key, scale, Notes, NOTE colours, tuning, fret spacing and
  the settings JSON.
- `concat` takes one settings URL per line in the textarea and draws a
  fretboard for each valid URL below it.
- The `concat` textarea starts with three sample settings URLs: D m7, G Altered
  and C Δ7.
- Each fretboard in `concat` is headed `Line N: KEY SCALE`, or
  `N行目: KEY SCALE` in the Japanese UI.
- The export-SVG button in the header appears only in `edit` and saves what is
  currently shown.
- The GitHub icon on the right of the header links to
  `https://github.com/wataash/genscale`.
- The button below the Settings editor copies a URL carrying the current
  settings.

## i18n

The UI supports English and Japanese.

- `/en`: English UI
- `/ja`: Japanese UI
- `/`: English UI

The language is switched with the `EN` / `JA` links on the right of the
header.

## Keys

Keys are handled in semitones. Internally `A = 0`, and `A#`, `B`, `C` and the
rest follow up to 11. Flat spellings and some enharmonics normalise to the same
pitch.

Examples:

- `Bb` is `A#`
- `Db` is `C#`
- `E#` is `F`
- `Cb` is `B`

## Scale presets

A scale preset is 12 label tokens, ordered by their semitone offset from the
root.

Example:

```text
1
...♭9
...9
..♭3
...3
...11
...♯11
.5
...♭13
...13
..♭7
...Δ7
```

The app currently ships presets for major, minor, dominant, diminished,
pentatonic, altered and others.

The scale selector shows the full name, such as `Altered dominant` or
`オルタード`; the Japanese UI shows the scale names in Japanese too. Internal IDs
and SVG filenames use a short identifier such as `alt`.

## Settings editor

The Settings editor shows the current settings as JSON. Changing the key,
scale, tuning, Notes, NOTE grayscale or fret spacing in the `edit` UI updates
the JSON as well.

Editing the JSON updates the UI whenever the content is valid. The settings
JSON holds `key`, `tuning`, `notes`, `noteGrayLevels` and `fretSpacing`; it has
no `scale`. `fretSpacing` is either `equal-temperament` or `equal-width`, and
older JSON that omits it is read as `equal-temperament`.

```json
{
  "key": "A",
  "tuning": ["E4", "B3", "G3", "D3", "A2", "E2"],
  "notes": [
    "1",
    "...♭9",
    "...9",
    "..♭3",
    "...3",
    "...11",
    "...♯11",
    ".5",
    "...♭13",
    "...13",
    "..♭7",
    "...Δ7"
  ],
  "noteGrayLevels": [20, 40, 75, 100],
  "fretSpacing": "equal-temperament"
}
```

`tuning` and `notes` are arrays in the same order as the lines of their inputs.
The scale is detected from `notes`, and becomes `Custom` when it matches no
preset.

The `Copy URL with this settings (experimental)` button below the Settings
editor copies a URL holding the current JSON in a `settings` query parameter.
The JSON in the URL is compact and on one line, keeping `{}`, `[]`, `"`, `♭`,
`♯` and the like as they are wherever possible; only characters that would
break the query are encoded.

```text
https://example.com/en?settings={"key":"A","tuning":["E4","B3","G3","D3","A2","E2"],"notes":["1","...♭9","...9","..♭3","...3","...11","...♯11",".5","...♭13","...13","..♭7","...Δ7"],"noteGrayLevels":[20,40,75,100],"fretSpacing":"equal-temperament"}
```

Opening that URL reads the JSON in `settings` and applies it as the initial
`edit` settings. If `settings` is invalid JSON, or JSON that is incomplete as
genscale settings, the default settings are shown and the Settings editor goes
into an error state.

In `concat`, those URLs are pasted into the textarea one per line.

- Three sample URLs are filled in on first load.
- A URL may be absolute or relative, but it must carry a `settings` query
  parameter.
- One fretboard is drawn per valid line.
- Invalid lines are reported with their line number.
- When every line is empty, or no line holds a valid URL, an empty-state
  message is shown instead of any fretboard.

## Notes

The Notes textarea edits the 12 note labels directly.

Input rules:

- 12 entries, one per line.
- They are ordered by semitone offset from the root.
- The number of leading `.` characters sets how dark the dot is.
- `TEXT` draws a black dot, `.TEXT` a near-black one, `..TEXT` a near-white one
  and `...TEXT` a white one.
- All leading `.` characters are stripped before display.
- A note written as only dots — `.`, `..` or `...` — draws the dot with no label
  text.

Example with the labels left out:

```text
1
...
...
♭3
...
...
...
5
...
...
♭7
...
```

Any count other than 12 raises a warning on screen, and the fretboard is drawn
from the currently selected scale preset.

## NOTE colours

NOTE grayscale adjusts the dot greyscale from 0 to 100% for each of the four
levels `NOTE` / `.NOTE` / `..NOTE` / `...NOTE`.

- To the left of each slider, a sample dot for that level shows `Δ7` inside it.
- `Δ7` is a placeholder, independent of what the Notes input holds.
- The sample dot's fill, outline and text colour reflect that level's current
  greyscale setting.
- Changes are reflected in the dots on the fretboard and in `noteGrayLevels` in
  the settings JSON.

## Interval names

Each line of Notes corresponds to a semitone offset from the root. The interval
name used as a label is free text, but the presets and this document use the
names below.

| semitones | common names |
| ---: | --- |
| 0    | `1`, `R` (Root), `P1` |
| 1    | `m2`, `♭9`, `♯1` |
| 2    | `M2`, `2`, `9` |
| 3    | `m3`, `♭3`, `♯9` |
| 4    | `M3`, `3`, `Δ3` |
| 5    | `4`, `P4`, `11` |
| 6    | `♭5`, `♯4`, `♯11` |
| 7    | `5`, `P5` |
| 8    | `m6`, `♭6`, `♯5`, `♭13` |
| 9    | `6`, `M6`, `13`, `𝄫7` |
| 10   | `7`, `m7`, `♭7`, |
| 11   | `M7`, `Δ7`, `maj7` |

## Fretboard

- The tuning is one string per line, the top line being the top string of the
  fretboard.
- The default is standard guitar tuning, `E4 B3 G3 D3 A2 E2`.
- Selecting a tuning preset fills the tuning input with that preset's strings.
- The presets are guitar, bass, 5-string bass, 6-string bass and 7-string
  guitar.
- Adding or removing lines changes how many strings are drawn.
- Each line is a note name with an octave, such as `E4` or `Bb2`.
- Frets 0 through 24 are drawn.
- Frets 3/5/7/9/12/15/17/19/21/24 carry a tall rectangular inlay.
- An inlay is 70% as wide as `w`, the gap between the right edge of the fret
  line on its left and the left edge of the one on its right.

The length of an inlay follows the number of strings. Number the strings 1, 2,
… n from the top, and let `h` be the spacing between them.

- `n = 0` and `n = 1` are undefined.
- `n = 2` gives `0.80h`.
- For `n >= 3`, the top edge sits 20% of the way from string 1 to string 2 and
  the bottom edge 80% of the way from string (n - 1) to string n.

Fret positions come from one of two methods, equal temperament by default.

- `equal-temperament`: computed from the equal-temperament string length ratio
  `L - L / 2^(n/12)`.
- `equal-width`: the 25 spans from 0F to 24F are all the same width.

Either way the result is normalised for the 0–24 fret view and converted into
SVG X coordinates.

## SVG export

The SVG element on screen is serialised and saved from the browser through a
Blob URL. The filename follows the current key and scale, or the custom mode.

Examples:

- `A-m7.svg`
- `C-M7.svg`

## Implementation

The app itself is [app/genscale-app.tsx](../app/genscale-app.tsx). State lives in React's `useState`, and the static fretboard data is built with `useMemo`. There is no server API; everything is drawn in the browser.

The pure logic — scale definitions, tunings, the settings JSON, the fretboard geometry — is split out into [lib/genscale](../lib/genscale).

- [lib/genscale/scales.ts](../lib/genscale/scales.ts): scale presets, display names, matching against Notes
- [lib/genscale/tuning.ts](../lib/genscale/tuning.ts): tuning presets, parsing tuning strings
- [lib/genscale/notes.ts](../lib/genscale/notes.ts): note names, enharmonics, Notes labels, dot colours
- [lib/genscale/settings.ts](../lib/genscale/settings.ts): reading and writing the Settings editor JSON, the settings string for URLs
- [lib/genscale/fretboard.ts](../lib/genscale/fretboard.ts): fret positions, fretboard data, the dimension constants used for drawing
- [lib/genscale/i18n.ts](../lib/genscale/i18n.ts): the English and Japanese UI strings
- [lib/genscale/svg.ts](../lib/genscale/svg.ts): SVG serialisation
- [lib/genscale/types.ts](../lib/genscale/types.ts): shared types

## Tests

The pure logic is covered by Vitest unit tests over
[lib/genscale](../lib/genscale).

- [lib/genscale/notes.test.ts](../lib/genscale/notes.test.ts): the Notes dot notation, label parsing, dot greyscale colours
- [lib/genscale/scales.test.ts](../lib/genscale/scales.test.ts): scale order, display names, preset matching, detecting Custom
- [lib/genscale/settings.test.ts](../lib/genscale/settings.test.ts): the Settings editor JSON, the settings string for URLs, input validation

End-to-end tests use Playwright. Screen interaction, SVG rendering, restoring settings from a URL and responsive layout are covered in [e2e/genscale.spec.ts](../e2e/genscale.spec.ts).

The main commands:

```bash
pnpm test
pnpm lint
pnpm build
pnpm exec playwright test
```
