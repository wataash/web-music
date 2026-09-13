# Intervals Anki

A deck that asks for the note a given interval or tension lands on above a root.
Also used as a bundled deck in the web app.

## Decks

```text
Intervals
Interval Identification
```

`Intervals` is one flat deck of every root and degree: 21 degrees over 35 root
spellings, 646 cards. There are no subdecks, because which pairs to study is a
setting rather than a place — the web app picks them out of a grid ordered by
how often jazz standards name each one (see the app's README). The question
reads `C m3` and the answer `E♭`. Tensions are spelled as the compound
intervals they are: `C ♯9` is `D♯`, while `C m3` is `E♭`. Combinations whose
answer would need a triple accidental are not generated.

`Interval Identification` asks `C → E` and answers `M3`. Without octave
numbers, `C → D♭` cannot be told apart as `m2` or `♭9`, so this deck holds only
the simple intervals, `m2` through `M7` — `d7` and `A5` among them, since their
spelling is what tells them from `M6` and `m6`. Answers put matching tension
names first: `♭9 m2`, `9 M2`, `11 P4`, `♯11 A4`, `♭13 m6`, and `13 M6`.
Enharmonic spellings stay distinct: `C → F♯` answers `♯11 A4`, while
`C → G♭` answers `d5`.

## The keyboard

By default every card draws the same 37-key piano keyboard, spanning B2 through
B5. The boundary between E4 and F4 is fixed at the exact centre, matching the
centre of an 88-key piano. On the front, the root is marked in blue and named
on its key; the keyboard never moves to centre that note.

On the back, the root stays where it was and the answer pitch class is added in
yellow at its nearest occurrence on either side. For `G M3`, for example, B is
shown below and above the middle-octave G. The fixed range is large enough to
put both occurrences around every root, including roots near either end of an
octave.

The web app's card actions can select the board in odd steps from 25 to 41
keys. Every size is a crop around the same E4/F4 axis, independent of both the
root and the hidden answer. A short crop can omit an answer occurrence outside
its range; occurrences that remain visible are still marked.
The web card builds an inline SVG when it is shown, so the deck JSON carries a
compact drawing function instead of separate front and back images for each size per note.
Anki uses a static SVG at the 37-key default.

The spelling stays on the card as text, because the keys cannot distinguish
`A♯` from `B♭`. Names are layered over the SVG rather than drawn into it, so
enharmonic cards such as `C → E♭` and `B♯ → D♯` use the same keys while
displaying their own spellings.

As in the staff deck, `--keyboard-scale`, `--keyboard-width` and
`--answer-scale` are the reader's, set from the app. A name on a black key sits
higher than one on a white key so that names on neighbouring keys stay clear of
each other.

## Generate

```console
pnpm generate
pnpm generate:anki
```

The output is `dist/intervals.json` and `dist/intervals.apkg`.

## Notation references

- Interval names follow the table in
  [Open Music Theory: Intervals](https://openmusictheory.github.io/intervals.html):
  quality as `A` (augmented) / `M` (major) / `P` (perfect) / `m` (minor) /
  `d` (diminished), size as a number, e.g. `m2`, `A4`, `d5`.
- Following
  [Open Music Theory: Chord Symbols](https://viva.pressbooks.pub/openmusictheory/chapter/chord-symbols/),
  9, 11 and 13 are compound intervals, and ♭ / ♯ lower or raise the default
  interval.
- The tension set `9, b9, #9, 11, #11, b13, 13` is the one shown in
  [Berklee: Tension Use](https://college.berklee.edu/berklee-today-55). For
  readability `b` / `#` are displayed as `♭` / `♯`.

## Learning order

New cards follow `INTERVAL_LEARNING_ORDER` in `src/cards.ts`. Chord tones
come first, followed by tensions before their simple-interval equivalents.
11 and P4 have adjacent positions because both names are useful.

```text
P5  M3  m3  m7  M7     chord tones
9   13  11  P4         natural tensions and the perfect fourth
♭9  ♯9  ♯11 ♭13        altered tensions
M2  m2  M6  m6  d7     simple intervals and the diminished seventh
d5  A4  A5             altered fourths and fifths
```

The priority is passed to `@web-music/anki-apkg` as `orderGroup`; roots
within each degree keep their stable shuffle. The `INTERVALS` storage order
is fixed independently so numeric card IDs and existing study history remain
stable. Identification uses the same priority for its simple-interval cards.
The web selection grid keeps Jazz 1460 frequency as its primary sort and
uses this learning order to break ties.
