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
spelling is what tells them from `M6` and `m6`.

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

The web app's card actions can reduce the board in odd steps from 37 to 25
keys. Every size is a crop around the same E4/F4 axis, independent of both the
root and the hidden answer. A short crop can omit an answer occurrence outside
its range; occurrences that remain visible are still marked.
The web card builds an inline SVG when it is shown, so the deck JSON carries a
compact drawing function instead of seven front and seven back images per note.
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

The degrees are ordered by **learning priority**, not by size. That order is
the array order of `INTERVALS` in `src/cards.ts`, and it is the order new cards
are introduced in: the array index is passed to `@web-music/anki-apkg` as
`orderGroup`, and within one degree the roots keep the usual stable shuffle.

```text
P5  M3  m3  P4          enough to build triads
M2  m2                  the steps of a scale
m7  M7  M6  m6  d7      seventh chords complete
d5  A4  A5              the altered fifths, the tritone's two spellings first
9   13  11              a simple interval plus an octave
♭9  ♯9  ♯11 ♭13         the four alterations of a dominant chord
```

Rationale:

- [Lesson 2 - The Intervals From Order to Chaos](http://philromo.com/blog/2020/4/10/the-correct-order-of-intervals)
  orders intervals by the simplicity of their frequency ratio (consonance):
  P5 → P4 → M3 → m3 → M2 → m2 → tritone → ♭9. The order above matches it
  except for where P4 sits.
- Per the
  [Humdrum Toolkit Guide, Ch.11: Melodic Intervals](https://www.humdrum.org/guide/ch11/)
  and [Chiu & Temperley (2024)](https://journals.sagepub.com/doi/full/10.1177/20592043231225731),
  M2 and m3 are the most frequent melodic intervals, so a deck aimed at playing
  melodies by ear would put M2/m2 first. This deck asks for spellings above a
  root, which is harmonic rather than melodic, so it follows the harmonic
  priority.
- The beginner curricula in
  [The Ultimate Guide to Interval Ear Training](https://www.musical-u.com/learn/ultimate-guide-to-interval-ear-training/)
  and [Playing By Ear: The Intervals That Make Ear Training Possible](https://lessonsinyourhome.net/blog/playing-ear-intervals-make-ear-training-possible/)
  start from 2nds, 3rds, 4ths and 5ths, which matches the break after the first
  ten degrees, the point where triads and seventh chords can be built.
- The perfect consonance / imperfect consonance / dissonance grouping follows
  [Puget Sound: How to Identify Intervals](https://musictheory.pugetsound.edu/mt21c/HowToIdentifyIntervals.html)
  (P1, P8, P5, P4 → M3/m3, M6/m6 → 2nds, 7ths, tritone).
- For tensions,
  [PianoGroove: Chord Extensions 9ths, 11ths & 13ths](https://www.pianogroove.com/jazz-piano-lessons/chord-extensions-9ths-11ths-13ths/)
  and [The Jazz Piano Site: Extensions & Alterations](https://www.thejazzpianosite.com/jazz-piano-lessons/jazz-chords/extensions-alterations/)
  put 9 and 13 first. 11 comes last of the three because it is avoided over a
  dominant chord, where it clashes with the major 3rd a semitone away — it
  could reasonably move ahead of 13 for someone who cares most about the sound
  of minor 7th chords. That the alterations are exactly ♭9, ♯9, ♯11 and
  ♭13 (= ♯5) is the same set listed in
  [LearnJazzPiano: Altered Dominant Voicings](https://www.learnjazzpiano.com/post/2004/10/18/altered-dominant-voicings-which-to-learn-first/).
