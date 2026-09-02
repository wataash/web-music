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

New cards are introduced in one stable shuffle over the whole deck. Ordering
them by how far they are from the root put the first thirty in the root's own
fret, one string away and straight above it — and a shape that never changes
is a shape the answer can be guessed from.

## Generate

```console
pnpm generate
pnpm generate:anki
```

The output is `dist/guitar-intervals.json` and `dist/guitar-intervals.apkg`.
