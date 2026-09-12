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

New cards are introduced by priority group, with a stable shuffle within each
group. Learn reference shapes first, then recognize other degrees around them.
Card IDs and GUIDs stay unchanged; re-importing the web deck updates the order
of unlearned cards while preserving study history and review schedules.

| Group | Shapes | Cards |
|---|---|---:|
| 1 | Fifths and octaves rooted on strings 6 and 5 (power-chord shapes) | 4 |
| 2 | Adjacent-string major thirds rooted on strings 6 and 5 | 2 |
| 3 | These anchors on other strings, including the B-string correction, and same-fret notes on strings 1 and 6 | 10 |
| 4 | Remaining nearby roots, fifths, and major thirds | 21 |
| 5 | Nearby minor thirds and fourths | 29 |
| 6 | Nearby minor and major sevenths | 28 |
| 7 | Other nearby degrees: seconds, sixths, and tritones | 70 |
| 8 | Remaining same-string shapes within four frets | 12 |
| 9 | Remaining shapes three or more strings away, within three frets | 82 |
| 10 | Remaining shapes four to six frets away | 204 |

“Nearby” means at most two strings and three frets away, in either direction.
The reader's fret window still filters the queue: cards outside the selected
window are not introduced. The table describes groups, not a fixed order
within each group.

Notes carry a `learning-level::1` through `learning-level::10` tag. Flashcards
uses it for the cumulative difficulty slider in What to ask, combined with
the fret window. The default includes all ten levels.

Using major thirds, fifths, and octaves as reference shapes is described in
[Jesse S. Hale's University of Miami DMA essay](https://scholarship.miami.edu/esploro/outputs/doctoral/Unlocking-the-Guitar-Fretboard-An-Intervallic/991031447464102976),
pp. 94 and 104. The particular ten groups above are this deck's teaching
choices, not an experimentally established ranking from that source.

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
