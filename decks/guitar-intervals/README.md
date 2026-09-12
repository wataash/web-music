# Guitar Intervals Anki

A deck that asks what degree a fretboard position plays above a root. Also
used as a bundled deck in the web app.

## Decks

```text
Guitar Intervals
```

One flat deck of 462 cards. The front marks the root `1` and puts `?` on
another position; the back writes that position's degree in its place.

```text
front                                    back
|----|----|--?-|----|----|----|----|     |----|----|-M3-|----|----|----|----|
|----|----|----|-1--|----|----|----|     |----|----|----|-1--|----|----|----|
|----|----|----|----|----|----|----|     |----|----|----|----|----|----|----|
|----|----|----|----|----|----|----|     |----|----|----|----|----|----|----|
|----|----|----|----|----|----|----|     |----|----|----|----|----|----|----|
|----|----|----|----|----|----|----|     |----|----|----|----|----|----|----|
```

String 1 (high E) is drawn at the top, as the fretboard deck draws it.
Standard tuning.

## No fret numbers

The board is drawn **around the root** rather than at a fret number: the same
two strings the same number of frets apart are the same question wherever they
are played, so the root's own fret is not part of a card. That leaves one card
per root string and reachable position — 6 roots × (6 strings × 13 frets − 1).

The drawing holds six frets either side of the root, and the reader's window is
a crop of it: `--fret-left` and `--fret-right`, set from the app, both narrow
the board and decide which positions the deck may ask about. The default is
three each way, which is what Anki gets, since it sets neither.

`--board-scale`, `--board-width` and `--answer-scale` are the reader's too: how
large the board is drawn — as a multiple of the width the deck would choose, or
the width of the screen, as the intervals deck's keyboard is sized — and how
large the names on it are. A board wider than the screen scrolls.

## Degrees

A distance is folded into one octave and every name for it is written, because
a shape is the same wherever it is played and a guitarist fingers a chord's
`♯9` at the `m3`'s fret.

| Semitones | Names | Semitones | Names |
|---:|---|---:|---|
| 0 | `1` | 6 | `d5` `A4` `♯11` |
| 1 | `m2` `♭9` | 7 | `P5` |
| 2 | `M2` `9` | 8 | `m6` `A5` `♭13` |
| 3 | `m3` `♯9` | 9 | `M6` `13` `d7` |
| 4 | `M3` | 10 | `m7` |
| 5 | `P4` `11` | 11 | `M7` |

The names are spelled as the intervals deck spells them
(`decks/intervals/README.md`, "Notation references").

## One drawing

Every card draws the same strings and frets, so the package carries a single
SVG and each note only says what to write on it. The names are HTML over the
drawing rather than shapes inside it, so a position can carry three of them
without the board having to make room, and so the app can size them on their
own.

## Learning order

New cards follow the same ten stages as the app's Learning range slider, with
stable shuffling within each stage. IDs and GUIDs stay unchanged; updating the
package preserves study history and schedules.

[learning-order.ts](src/learning-order.ts) lists 30 movable teaching voicings,
using strings 6 → 1 and frets relative to the root (null means mute). These
are curated examples, not a measured frequency ranking. The Cm9 form
8–10–8–8–8–10 is a user-supplied example; the other forms are explicit teaching
choices. Tests verify each form's actual pitch classes and complete coverage.

- Stage 1: major/minor/7/maj7/m7 forms rooted on strings 6 and 5, plus reference octaves, fifths and thirds.
- Stage 2: representative 9/m9/maj9, sus, 6/13 and add9 forms. The string-6 to string-1 +2 ninth is included here.
- Stages 3–4: string-4 forms and upper-string inversions.
- Remaining positions are added by musical role (chord tones, natural extensions, altered intervals), with bass-root context before distance. A wide string crossing alone never decides the stage.

Each named form sets a latest introduction stage for all of its root-to-tone
relationships. Remaining cards fill gradual increments without splitting those
forms. Positions beyond ±3 frets are distributed from stage 3, except where an
earlier named form needs them (for example Eadd9). The fret window still limits
selection, even when a form's stage has been reached.

| Stage | Within ±3 frets | Within ±6 frets |
|---|---:|---:|
| 1 | 47 | 47 |
| 2 | 70 | 71 |
| 3 | 92 | 119 |
| 4 | 114 | 168 |
| 5 | 136 | 217 |
| 6 | 158 | 266 |
| 7 | 180 | 315 |
| 8 | 202 | 364 |
| 9 | 224 | 413 |
| 10 | 246 | 462 |

Notes carry a learning-level::1 through learning-level::10 tag; orderGroup is
that level minus one. The app's saved numeric setting and individual overrides
remain compatible. The maximum includes every shape inside the fret window.

[Berklee Guitar Chords 101](https://online.berklee.edu/courses/guitar-chords-101)
emphasizes chord construction and note relationships across the fretboard.
[Jesse S. Hale's University of Miami DMA essay](https://scholarship.miami.edu/esploro/outputs/doctoral/Unlocking-the-Guitar-Fretboard-An-Intervallic/991031447464102976),
pp. 94 and 104, describes reference thirds, fifths and octaves. These support
the teaching approach; this particular ten-stage assignment is our design.

## Generate

```console
pnpm generate
pnpm generate:anki
```

The output is `dist/guitar-intervals.json` and `dist/guitar-intervals.apkg`.

On answer fretboards only, altered degrees have muted reference
labels on the same string one fret away: d5 → P5, d7 → m7, P4 → A4,
P5 → A5, ♭9 → 9, 9 → ♯9, 11 → ♯11, and ♭13 → 13. References sharing a
position are combined (for example P4 and 11). They are clipped by the fret
window like other labels, and omitted beyond the drawing's six-fret reach.
