# Music Staff Anki

An Anki package for memorising the note names on a staff, in both the reading
and the writing direction. Also used as a bundled deck in the web app.

## Decks

```text
Music Staff
└── Staff → Note
    ├── Treble Clef (33 cards)
    ├── Bass Clef   (33 cards)
    ├── Alto Clef   (33 cards)
    └── Tenor Clef  (33 cards)
Music Staff (with Octave Numbers) [Advanced]
├── Staff → Note
│   ├── Treble Clef (33 cards)
│   ├── Bass Clef   (33 cards)
│   ├── Alto Clef   (33 cards)
│   └── Tenor Clef  (33 cards)
└── Note → Staff
    ├── Treble Clef (33 cards)
    ├── Bass Clef   (33 cards)
    ├── Alto Clef   (33 cards)
    └── Tenor Clef  (33 cards)
```

The plain deck holds 132 `Staff → Note` cards and the one with octave numbers
264 cards in both directions, 396 in total.
`Music Staff (with Octave Numbers)` is marked `hiddenByDefault`, and so are
the alto and tenor clefs of the plain deck — the clefs violists, cellists and
trombonists read — so the web app's deck list starts without them until
`CHOOSE DECKS` turns them on.

- `Staff → Note`: read the note drawn on the staff and name it
- `Note → Staff`: given a note name with an octave number, say where it sits on
  the staff. A bare `C` cannot pick between C4, C5 and C6, so this direction is
  not in the plain deck

The plain deck omits the octave number and shows `C`; the deck with octave
numbers uses scientific pitch notation and shows `C4`. Middle C is C4. Each
deck holds the 33 notes reachable within six ledger lines above and below the
staff. The ranges differ per clef, but the distances from the staff are the
same, so the spread of difficulty is identical in every deck.

- Treble Clef: G2–D7
- Bass Clef: B0–F5
- Alto Clef: A1–E6
- Tenor Clef: F1–C6

The reference position of each clef is below. Alto and Tenor use the same
C-clef, but their reference lines differ, which shifts where middle C lands.

| Clef   | Reference line     | Note |
| ------ | ------------------ | ---- |
| Treble | 2nd line from the bottom | G4 |
| Bass   | 4th line from the bottom | F3 |
| Alto   | 3rd line from the bottom | C4 |
| Tenor  | 4th line from the bottom | C4 |

The front of a `Staff → Note` card shows only the clef, the staff and a single
whole note; the back shows the same staff with the keyboard below it. The
`Note → Staff` direction of the deck with octave numbers shows the note name
and an empty staff on the front, and draws the whole note on that same staff on
the back. Key signatures, accidentals, time signatures and stems are never
drawn, and notes outside the staff get as many ledger lines as they need. Cards
always render in dark colours and do not follow Anki's own theme.

Below the staff, both directions show a piano keyboard with the answer's key
highlighted and named. Nothing writes the answer out in words: the keyboard
carries it. Every note these decks ask about is a natural, so the highlighted
key is always a white one; the black keys are drawn because their 2-3 grouping
is what tells one white key from another.

The plain deck draws a single octave, which says which white key it is, and
names it inside the key.

The deck with octave numbers has to say where in a piano the note falls, which
no stretch of a few octaves can do: each clef spans 4.7 of them. It draws the
whole 88-key piano instead, edge to edge across the screen. One key of 52 is
far too narrow to hold a name, so the answer is written across the keys around
the highlighted one, about three keys wide, and pulled back inside the board
when the key it names is near an end.

The name is written by the card, not drawn into the image: the note carries a
span whose custom properties say where on the keyboard it belongs and how large
it is in `cqw`, so it keeps its place and its proportions however large the
keyboard is drawn — and the app can size it on its own. `--staff-scale`,
`--keyboard-scale` and `--answer-scale` are the reader's, set from the app; the
deck only says what full size means — for the staff, most of the screen's
width, since a smaller one is a handful of lines with one note to find on
them. `data-piano-keys` on the document crops the 88-key strip to the keys the
reader asked for, around the middle of an 88-key piano — the boundary between
E4 and F4 — rather than around the answer, which the blank keyboard on the
front would then name. `--keyboard-width` replaces the width
outright, for a reader who asks for the width of the screen rather than a
multiple of the deck's own choice, and a keyboard wider than the card scrolls
where it stands.

A white key is about 145 mm long and 23.5 mm wide, and the drawing keeps that
proportion, so the 88-key board is shallow rather than a bed of nails. A single
octave would be taller than the staff at that aspect, so it stops at the height
of the staff instead. A keyboard does not depend on the clef, so the four clefs
share one.

Both keyboards are diagrams, so tapping one reveals the answer the way tapping
the staff does.

A `Staff → Note` question already shows the keyboard, bare: the same frame at
the same size with no key marked, so revealing the answer fills in the keyboard
that is already on screen rather than moving the card around. `Note → Staff`
shows the marked keyboard on both sides, since there the note is what the card
gives you. Only the frame decides how a bare keyboard looks, so every note
sharing a frame shares the image — twelve of them cover the deck.

An SVG with a note on it is the question of a `Staff → Note` card and at the
same time the answer of a `Note → Staff` one, so the SVG's `<title>` and
`<desc>` never name the note. Only the card template shows it, through
`{{Prompt}}` and `{{DisplayPitch}}`.

There is a single Anki notetype; whether the `Prompt` field is filled decides
the direction. `Note → Staff` puts the display note name in `Prompt`, while
`Staff → Note` leaves it empty and the back's `{{^Prompt}}` section shows
`DisplayPitch` as the answer. `Pitch` carries the full pitch used for selection
and drawing in either deck.

The Anki media is 132 staves with a note, one empty staff per clef, a keyboard per
pitch in each of its two layouts, a bare keyboard per octave, and one bare
piano: 235 files,
shared by both directions.

The web app asks only the Basic set by default (up to 2 ledger lines, 19 notes
per clef). Three or more ledger lines are already in the deck and are added
from the settings.

Every staff is framed for the whole range its clef can carry — six ledger lines
either way — whether or not the note drawn needs the room, so the staff sits in
the same place on every card instead of sliding up and down as the answer
changes. That frame is more sky and cellar than a reader studying two ledger
lines ever needs, so the card crops it: the app sets `--staff-crop` to the
aspect ratio of the part its note settings can actually ask about and
`--staff-focus` to where in the image that part sits, and the stylesheet shows
that part with `object-fit: cover`. Without those properties the whole frame is
shown.

## Generate

Node.js 22.5 or later and pnpm are required.

```console
pnpm install
pnpm generate
```

The output is `dist/music-staff.json` for the web app. Its card template draws
notes, ledger lines and marked keys from compact descriptors, so the JSON has
no SVG media. The Anki package is optional and keeps static SVGs.

```console
pnpm generate:anki
```

It is written to `dist/music-staff.apkg`, and the path can be changed.

```console
pnpm generate:anki --output /tmp/staff.apkg
```

The APKG uses the Anki 2.1.50+ format (a zstd-compressed schema V18
`collection.anki21b`) plus a dummy `collection.anki2` that tells older clients
to upgrade. Only `collection.anki21b` carries real data.

New cards are stored in a reproducible shuffle, and the dedicated
`Music Staff — Random New Cards` preset sets a random gather and sort order as
well. If an update import over an existing deck leaves the earlier settings in
place, select this preset in the parent deck's options and save it to all
subdecks.

## Preview

To inspect a staff without starting Anki, write both sides of a card out as
SVG.

```console
pnpm preview
```

By default this generates the `Staff → Note` Treble Clef C4 into
`dist/preview/staff-to-note-treble-c4-{front,back}.svg`. The direction, clef,
pitch and output path can all be changed.

```console
pnpm preview --clef alto --pitch C4
pnpm preview --direction note-to-staff --clef tenor --pitch C4
pnpm preview --clef bass --pitch C3 --output /tmp/staff
```

The preview draws what a card looks like as a single SVG rather than the deck
media itself. The note name that the template shows on a real card is drawn
below the staff in the preview.

Asking for an unsupported direction or clef, or for a pitch outside that clef's
range, is an error.

## Development

```console
pnpm test
pnpm typecheck
```

The generation tests inspect the 17 decks in a temporary collection, the 396
notes and cards, the 33 cards per deck, the fields, the 235 Anki SVG media files,
GUID uniqueness and the new card order.

The implementation is split along these responsibilities.

- `src/staff.ts`: the staff SVG
- `src/cards.ts`: the card data for 4 clefs × 2 directions
- `src/generate.ts`: card fields and Anki SVG media
- `src/apkg.ts`: the SQLite collection and the `.apkg`
- `src/template.ts`: the Anki templates and CSS
- `src/preview.ts`: writing both sides out as SVG

Each SVG media filename embeds the SHA-256 hash of its content. Changing how a
card is drawn changes the filename, so an update import into Anki picks up the
new image.

Clefs are drawn with the Unicode musical symbols (`𝄞` `𝄢` `𝄡`) in a
Noto Music-family font. Noto Music designs those glyphs on a 1000-unit em equal
to the height of the staff (4 spaces) and puts the baseline on the bottom staff
line, so each clef only needs to know how many spaces above the baseline its
reference shape sits. The staves with a note are shared by both directions;
only the question side of `Note → Staff` uses the per-clef empty staff.

## References

Note names, their positions on a staff and the staff SVG rendering live in
`../../packages/music-staff-core/`. The web app uses the same calculations to
select which notes to ask and the same renderer for the small staves in its
settings screen, so this deck holds only the dimensions its cards need. The
shared Anki package generation lives in `../../packages/anki-apkg/`. The circle
of fifths SVG in `../../packages/circle-of-fifths-svg/` is for key signatures
only, so its staff rendering is not shared with this one.
