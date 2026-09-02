# Guitar Fretboard Anki

An Anki package for memorising the note names on a guitar fretboard. Also used
as a bundled deck in the web app.

## AI prompt

Create an Anki package for memorising the notes on a guitar fretboard.

For readability, use ♭ and ♯ rather than b and # on the cards themselves.
Everywhere else b and # are fine, since they are easier to type.

Let n be the string number (1-6) and F the fret number (0-24).

Subdeck 1-0: Naturals deck: Notes: A B C D E F G
front: only the natural positions, showing n-F and a pale yellow dot with no
symbol
back: the note name written on the dot

Subdeck 1-1: Naturals + flats deck: Notes: Ab A Bb B C Db D Eb E F Gb G
front: n-F (newline) a pale yellow dot at position n-F on the fretboard with b
written on it
back: the note name instead of b on the dot
25 frets (open string (0F) - 24F) x 6 strings = 150 cards

Subdeck 1-2: Naturals + sharps deck: Notes: A A# B C C# D D# E F F# G G#
front/back: as the flats deck, but # instead of b

    Flats deck example:
    front:
    3-5
    (a pale yellow dot at string 3 fret 5 with b written in it)
    back:
    3-5
    (a pale yellow dot at string 3 fret 5 with C written in it)

Subdeck 2-0: Naturals deck: Notes: A B C D E F G
front/back: as 2-1, but asking only about the naturals

Subdeck 2-1: Naturals + flats deck: Notes: Ab A Bb B C Db D Eb E F Gb G
front: one of the Notes (newline) the fretboard with a single string
highlighted
back: one of the Notes n-F_low n-F_high (newline) pale yellow dots at n-F_low
and n-F_high on the fretboard with the note name written on them. When the note
is the same as the open string, n-F_0 is shown first as well and a dot is
placed on 0F.
  Here F_0 = 0, 0 < F_low <= 12, 12 < F_high <= 24. In standard tuning only
  E A D G B have a 0F. Square brackets mean optional and are not shown on the
  card.

Subdeck 2-2: Naturals + sharps deck: Notes: A A# B C C# D D# E F F# G G#
front/back: as the flats deck, but # instead of b

## Decks

```text
Guitar Fretboard
├── Position → Note
│   ├── Naturals           (90 cards)
│   ├── Naturals + Flats  (150 cards)
│   └── Naturals + Sharps (150 cards)
└── Note → Positions
    ├── Naturals           (42 cards)
    ├── Naturals + Flats   (72 cards)
    └── Naturals + Sharps  (72 cards)
```

The Naturals deck under `Position → Note` holds only the natural positions,
15 per string for 90 cards. Naturals + Flats and Naturals + Sharps hold one
card for each of the 25 positions from the open string (0F) to 24F on all six
strings of a guitar in standard tuning, 150 cards each. Under
`Note → Positions`, Naturals has 7 notes × 6 strings = 42 cards and each
extended deck 12 notes × 6 strings = 72 cards. The package holds 576 cards.

- Naturals: `A B C D E F G`
- Naturals + Flats: `A♭ A B♭ B C D♭ D E♭ E F G♭ G`
- Naturals + Sharps: `A A♯ B C C♯ D D♯ E F F♯ G G♯`

The fretboard runs from string 1 (high E) at the top to string 6 (low E) at the
bottom. The front marks the position in question with a pale yellow dot. The
dot carries no symbol in Naturals, `♭` in Naturals + Flats and `♯` in
Naturals + Sharps. The back shows the note name inside the same dot. Both sides
print `string-fret` (e.g. `3-5`) above the fretboard, so mixing the spellings
from the parent deck still makes the position and the spelling system clear.
Every fret from 0F to 24F is drawn the same width.

The front of a `Note → Positions` card shows the note name and draws a pale
yellow bar behind the string in question. The back shows where that note falls
in the lower (1F–12F) and upper (13F–24F) half, with the note name on each dot,
and adds 0F only when the note matches the open string. The E on string 1, for
example, reads `E 1-0 1-12 1-24`. Square brackets are not shown.

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

By default this generates the flats card for string 3 fret 5 into
`dist/preview/flats-string-3-fret-5-{front,back}.svg`. The string, fret,
spelling system and output path can all be changed.

```console
pnpm preview --string 2 --fret 4 --system sharps --output /tmp/fretboard
```

Naturals are inspected with `--system naturals`.

Cards that ask for the positions of a note are inspected with `--kind note` and
`--note`. The CLI accepts both `b` / `#` and `♭` / `♯`.

```console
pnpm preview --kind note --string 3 --note Ab --system flats --output /tmp/fretboard
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

The generation tests inspect the decks, the 576 cards, the fields and the SVG
media inside a temporary collection. Existing `Position → Note` cards keep
their IDs and GUIDs.

The implementation is split along these responsibilities, with an eye on
factoring it into a shared library later.

- `src/fretboard.ts`: the 0F–24F fretboard SVG
- `src/cards.ts`: the card data for 3 spellings and 2 directions
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
