# Guitar Fretboard Anki

An Anki package for memorising the note names on a guitar fretboard. Also used
as a bundled deck in the web app.

## AI prompt

Create an Anki package for memorising the notes on a guitar fretboard.

For readability, use ♭ and ♯ rather than b and # on the cards themselves.
Everywhere else b and # are fine, since they are easier to type.

Let n be the string number (1-6) and F the fret number (0-24).

Deck 1: one deck, no subdecks
front: n-F (newline) a pale yellow dot at position n-F on the fretboard with ?
written on it
back: n-F followed by the note name, and the note name instead of ? on the dot,
written under both of its names where the pitch has two
25 frets (open string (0F) - 24F) x 6 strings = 150 cards

    Example:
    front:
    3-5
    (a pale yellow dot at string 3 fret 5 with ? written in it)
    back:
    3-5 C
    (a pale yellow dot at string 3 fret 5 with C written in it)
    front:
    3-1
    (a pale yellow dot at string 3 fret 1 with ? written in it)
    back:
    3-1 G#Ab
    (a pale yellow dot at string 3 fret 1 with G#Ab written in it)

Deck 2: one deck, no subdecks: Notes: A A# Bb A#Bb B C C# Db C#Db D D# Eb D#Eb
E F F# Gb F#Gb G G# Ab G#Ab
front: one of the Notes (newline) the fretboard with a single string
highlighted
back: one of the Notes n-F_low n-F_high (newline) pale yellow dots at n-F_low
and n-F_high on the fretboard with the note name written on them. When the note
is the same as the open string, n-F_0 is shown first as well and a dot is
placed on 0F.
  Here F_0 = 0, 0 < F_low <= 12, 12 < F_high <= 24. In standard tuning only
  E A D G B have a 0F. Square brackets mean optional and are not shown on the
  card.

A pitch with two names is asked three ways: under its sharp name, under its
flat name, and under both at once, where one dot carries the two spellings one
over the other. The web app asks only the naturals until the rest are turned on
from the deck's own settings.

## Decks

```text
Guitar Fretboard
├── Position → Note  (150 cards)
└── Note → Positions (132 cards)
```

Neither direction is split by spelling any more, since a card carries its own.
`Position → Note` holds one card for each of the 25 positions from the open
string (0F) to 24F on all six strings of a guitar in standard tuning, 150
cards. `Note → Positions` asks 22 notes × 6 strings = 132 cards. The package
holds 282 cards.

- The answer to a position: `A A♯B♭ B C C♯D♭ D D♯E♭ E F F♯G♭ G G♯A♭`
- Note → Positions: the seven naturals, the five sharps, the five flats, and
  the five pitches written under both names — `A♯B♭ C♯D♭ D♯E♭ F♯G♭ G♯A♭`

The fretboard runs from string 1 (high E) at the top to string 6 (low E) at the
bottom. The front marks the position in question with a pale yellow dot
carrying `?` — the same mark at every position, since one deck asks about all
of them and the dot must not hint at the answer's spelling. The back shows the
note name inside the same dot, under both of its names where the pitch has two,
one over the other on a slightly wider dot. Both sides print `string-fret`
(e.g. `3-5`) above the fretboard, followed by the note name on the back
(e.g. `3-5 C` or `3-1 G♯A♭`). The position is right-aligned to the left of
the center, and the answer is left-aligned to its right, keeping the question
in the same place on both sides. Every fret from 0F to 24F is drawn the same
width.

The front of a `Note → Positions` card shows the note name and draws a pale
yellow bar behind the string in question. The back shows where that note falls
in the lower (1F–12F) and upper (13F–24F) half, with the note name on each dot,
and adds 0F only when the note matches the open string. The E on string 1, for
example, reads `E 1-0 1-12 1-24`. The note name stays right-aligned to the left
of the center on both sides; the answer positions are left-aligned to its right.
Square brackets are not shown. A card asked
under both names writes them the same way `Position → Note` answers with them.

Only the naturals are asked until the reader turns the rest on: the web app's
gear on `Note → Positions` picks the notes, and ships on `Naturals`.

## Generate

Node.js 22.5 or later and pnpm are required.

```console
pnpm install
pnpm generate
```

The output is `dist/guitar-fretboard-notes.json` for the web app. Its card
template draws an inline SVG from the string, fret and note fields, so the JSON
does not carry SVG media. The Anki package is optional and keeps static SVGs.

```console
pnpm generate:anki
```

The APKG uses the Anki 2.1.50+ format (a zstd-compressed schema V18
`collection.anki21b`; see `src/anki21b.ts`) plus a dummy `collection.anki2`
that tells older clients to upgrade. Only `collection.anki21b` carries real
data. The output path can be changed.

```console
pnpm generate:anki --output /tmp/guitar.apkg
```

## Preview

To inspect a fretboard without starting Anki, write both sides of a card out as
SVG.

```console
pnpm preview
```

By default this generates the card for string 3 fret 5 into
`dist/preview/position-to-note-string-3-fret-5-{front,back}.svg`. The string,
fret and output path can all be changed.

```console
pnpm preview --string 2 --fret 4 --output /tmp/fretboard
```

Cards that ask for the positions of a note are inspected with `--kind note` and
`--note`. The CLI accepts both `b` / `#` and `♭` / `♯`.

```console
pnpm preview --kind note --string 3 --note Ab --output /tmp/fretboard
pnpm preview --kind note --string 3 --note "G#Ab" --output /tmp/fretboard
```

New cards are stored in a reproducible shuffle, and the dedicated
`Guitar Fretboard — Random New Cards` preset sets a random gather and sort
order as well. If an update import over an existing deck leaves the earlier
settings in place, select this preset in the parent deck's options and save it
to all subdecks.

## Development

```console
pnpm test
pnpm typecheck
```

The generation tests inspect the decks, the 282 cards, the fields and the SVG
media inside a temporary collection. Both directions were renamed when their
spelling subdecks became one deck each, so study progress starts again.

The implementation is split along these responsibilities, with an eye on
factoring it into a shared library later.

- `src/fretboard.ts`: the 0F–24F fretboard SVG
- `src/cards.ts`: the card data for both directions and their spellings
- `src/generate.ts`: card fields and Anki SVG media
- `src/apkg.ts`: the SQLite collection and the `.apkg`
- `src/template.ts`: the Anki templates and CSS

Each SVG media filename embeds the SHA-256 hash of its content. Changing how a
card is drawn changes the filename, so an update import into Anki picks up the
new image. Cards and SVGs always render in dark colours and do not follow
Anki's own theme.

## References

The fretboard app lives in `../../apps/fretboard/`, and the shared Anki package
generation in `../../packages/anki-apkg/`.
