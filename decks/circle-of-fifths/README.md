An Anki package for memorising music theory, using the geometry of the circle
of fifths as the memory hook.

## deck: Outer (Major) Cell → Notes

Example

- front: an empty circle of fifths with the 4 o'clock cell highlighted
- back: the circle with `D𝄪 E F♭` written in the outer 4 o'clock cell

12 cards in total.

## deck: Inner (Minor) Cell → Notes

The inner counterpart of `Outer (Major) Cell → Notes`. 12 cards in total.

## deck 1-1: Note → Outer (Major) Cell

Example

- front:
  - E
  - an empty circle of fifths
- back: the circle with E written in the outer 4 o'clock cell

All 35 notes. In the web app the note settings widen the selection step by
step, starting from the default Basic set of 13 notes.

## deck 1-2: Note → Inner (Minor) Cell

The inner counterpart of deck 1-1. All 35 notes. In the web app the selection
widens step by step from the default Basic set of 13 notes.

## deck 2-1: ♭3

Example

- front:
  - E ♭3
  - an empty circle of fifths
- back:
  - G
  - the circle with the inner e and the outer G written in

Specification

- front
  - an inner note name + `♭3`
  - an empty circle of fifths
- back
  - the answer note + the circle holding both notes
- 20 cards
  - a♭→C♭
  - a→C
  - a♯→C♯
  - b♭→D♭
  - b→D
  - b♯→D♯
  - c♭→E𝄫
  - c→E♭
  - c♯→E
  - d♭→F♭
  - d→F
  - d♯→F♯
  - e♭→G♭
  - e→G
  - e♯→G♯
  - (no f♭→A𝄫)
  - f→A♭
  - f♯→A
  - g♭→B𝄫
  - g→B♭
  - g♯→B

Notes

- ♭3: a minor 3rd above an inner note = the outer note of the same sector
  (e at 1 o'clock → G at 1 o'clock)

## deck 2-2: Δ3

Example

- front:
  - E Δ3
  - an empty circle of fifths
- back:
  - G♯
  - the circle with the outer E and the inner g♯ written in

Specification

- front
  - an outer note name + `Δ3`
  - an empty circle of fifths
- back
  - the answer note + the circle holding both notes
- 21 cards
  - A♭→c
  - A→c♯
  - A♯→c𝄪
  - B♭→D
  - B→D♯
  - B♯→D𝄪
  - C♭→E♭
  - C→E
  - C♯→E♯
  - D♭→F
  - D→F♯
  - D♯→F𝄪
  - E♭→G
  - E→G♯
  - E♯→G𝄪
  - F♭→A♭
  - F→A
  - F♯→A♯
  - G♭→B♭
  - G→B
  - G♯→B♯

Notes

- Δ3: a major 3rd above an outer note = the inner note one hour clockwise
  (E at 4 o'clock → g♯ at 5 o'clock)

## Generate

Node.js 22.5 or later is required.

```console
pnpm generate
```

This writes `dist/circle-of-fifths-intervals.json` for the web app. Its card
template starts from one circle SVG and uses compact drawing descriptors to
show the requested notes or highlighted cell, so the JSON has no SVG media.
The Anki package is optional and keeps static SVGs.

```console
pnpm generate:anki
```

This writes `dist/circle-of-fifths-intervals.apkg`.

The decks form the tree below. Every one of them is marked `hiddenByDefault`,
so the web app's deck list starts without the whole tree; `CHOOSE DECKS`
turns it on.
Cards live only in the leaf decks, so nothing is duplicated and a parent shares
its children's study history.

```text
(Experimental) Circle of Fifths
├── Note → Cell
│   ├── Note → Outer (Major) Cell (35 cards)
│   └── Note → Inner (Minor) Cell (35 cards)
├── Cell → All Notes
    ├── Outer (Major) Cell → Notes (12 cards)
    └── Inner (Minor) Cell → Notes (12 cards)
└── (Experimental) Intervals
    ├── ♭3 (20 cards)
    └── Δ3 (21 cards)
```

In the web app's `Note → Cell`, the notes to study are chosen from the gear on
the Outer / Inner subdeck, either in the deck list or in the reviewer. The
Major subdeck sets only Major Notes and the Minor subdeck only Minor Notes.
Individual selection uses a table that also shows each note's distance in
fifths from the reference and its difficulty. `Intervals` has the same
per-subdeck setting: `♭3` selects over the Minor Notes on the question side and
`Δ3` over the Major Notes, stored independently of `Note → Cell`. Its Note
column lists only the cards that exist, as a chord name paired with the
question and answer, e.g. `Am (a → C)`, `C (C → e)`. The circle of fifths
parent and children are only listed, and only studied, once
the deck is turned on. The default `Basic`, `Up to Advanced` and
`All (Includes Esoteric)` presets select difficulties cumulatively, and any
individual change is stored as `Custom`. The same spelling can have a different
difficulty on the outer and inner ring, so the two selections are kept
separately. `Note → Cell` asks only about the selected notes.

`Cell → All Notes` has no note setting: every one of the two or three notes in
the cell must be answered. This is the same in the web app and in the Anki
package. The Anki version of `Note → Cell` holds all 35 notes.

New cards are laid out in a reproducible shuffle derived from the card ID. On
top of that, the dedicated deck preset sets both "new card gather order" and
"new card sort order" to random, so starting from the parent deck mixes the
subdecks together. This applies only to new cards, not to the order of
learning or review cards.

Importing an update over an existing deck can leave Anki's earlier preset
assignment in place. If that happens, open the deck options of
`(Experimental) Circle of Fifths`, choose the
`(Experimental) Circle of Fifths — Random New Cards` preset and run
`Save to All Subdecks`. Without the dedicated preset, Anki's default `Deck`
gather order can spend the whole daily limit on the first subdeck.

## Implementation

- `src/cards.ts`: the card data — 24 cell→notes, 70 note→cell and 41 interval
  cards, 135 in total
- `src/template.ts`: the Anki card templates and CSS
- `src/generate.ts`: card fields and Anki SVG media generation
- `src/apkg.ts`: building and inspecting the SQLite collection and the `.apkg`
- `src/web-cli.ts`: the `generate` command for the web deck
- `src/cli.ts`: the `generate:anki` command for the APKG

Note names are held internally in ASCII, as in `Ab` or `c##`, and converted to
`A♭` or `c𝄪` when a card is rendered. The display spelling is kept separately
from the upper/lower case that marks the outer and inner ring.

The fronts of the note→cell and interval cards share a single empty circle
generated with `visibleNotes: []`. The front of a cell→notes card highlights
one cell. On the back, a note→cell card shows one note, a cell→notes card every
note in the cell, and an interval card the outer and inner note. Backs with a
single note in a single cell use `labelLayout: "single-note"`, which sizes the
note name to the cell.

Every SVG ships inside the `.apkg` as Anki media. Anki does not overwrite
existing media of the same name on re-import, so each media filename embeds the
first 12 hex digits of the SHA-256 of the SVG content. Changing how a card
looks changes the filename, which guarantees the updated SVG is picked up.

The `.apkg` is built with Node.js's built-in SQLite API and JSZip. The format
is the Anki 2.1.50+ layout (a `meta` file, a zstd-compressed schema V18
`collection.anki21b`, individually zstd-compressed media and a protobuf media
index; see `src/anki21b.ts`), plus a dummy schema-11 `collection.anki2` that
tells older clients to upgrade. Only `collection.anki21b` carries real data.
Deck IDs, model IDs, field IDs and template IDs are fixed, and note GUIDs are
derived stably from the card ID. The note fields are `Id`, `Interval`,
`Question`, `Answer`, `FrontImage` and `BackImage`. Each note carries one tag
out of `cell-to-notes::{outer,inner}`, `note-to-cell::{outer,inner}` and
`interval::{flat3,major3}`. Cards and SVGs always render in dark colours and do
not follow Anki's own theme.

## Relationship to official support

Anki offers no standalone SDK for assembling an `.apkg` from arbitrary card
data, no official Node.js or TypeScript library, and no stable published
specification of the ZIP and SQLite internals. The officially supported routes
are exporting an `.apkg` from Anki's GUI, importing CSV or TSV, and driving a
collection from Python's `anki` module inside an Anki add-on.

This implementation does not use an official SDK; it produces, from Node.js,
the conventional SQLite, ZIP and media structure that Anki can read. Because
of that, compatibility is re-checked against the current official Anki backend
by actually importing the output, so future Anki changes do not go unnoticed.

## Checks

```console
pnpm --dir anki test
pnpm --dir anki typecheck
```

The tests check the card count and uniqueness, agreement with the note list,
the empty and 1–3 note SVGs, the 9 parent and child decks inside the SQLite
collection, 135 notes and 135 cards, 160 media files, stable GUIDs, the new
card shuffle order and the dedicated deck preset. Before distribution, load the
package into Anki Desktop and check the deck tree, both sides of the cards and
the rendering of ♭, 𝄫, ♯ and 𝄪 by eye.

Compatibility with Anki 26.05 was checked by calling the official backend's
`Collection.import_anki_package()` from the Python that ships with the
installed Anki, importing into a temporary collection, rendering both sides and
re-importing. Python is used only for that check; it is not needed to generate
the decks or to run the normal tests, and no Python code or dependency lives in
this repository.

## References

The layout follows Anki's own packaged decks and their update behaviour.

- [Packaged Decks](https://docs.ankiweb.net/importing/packaged-decks.html)
- [Deck Options](https://docs.ankiweb.net/deck-options.html#display-order)
- [Exporting](https://docs.ankiweb.net/exporting.html)
- [Text Files](https://docs.ankiweb.net/importing/text-files.html)
- [The `anki` Module](https://addon-docs.ankiweb.net/the-anki-module.html)

## draft: difficulties

If the apkg is ever distributed, opening with C𝄪 and friends is too advanced,
so should it ship as two packages?
- a Basic apkg with the plain notes only
- an Advanced apkg that includes C𝄪 and the rest
