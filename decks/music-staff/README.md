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

The Flashcards web app also bundles `Music Staff (Movable Do)` as a separate
major-key reading deck. It asks for ド–シ from a clef, key signature and one
written note, across fifteen major-key signatures and all four clefs (1,980 cards).
The answer gives the pitch name and solfege. Its ledger-line ranges are
independent for each key and clef, and independent of the fixed-do decks.
Accidentals outside the key signature and minor keys are not included.
This deck is currently web-only; `generate:anki` still exports the two
fixed-do deck trees described above.
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

The Movable Do web cards use a separate optional reference keyboard. The
container's `data-keyboard-tonic` supplies the spelled major tonic; the
document's `data-reference-keyboard-keys` selects 13–49 keys in steps of two.
The tonic octave, including its final tonic, remains bright in the centre;
additional context keys extend equally on both sides and use darker fills.
Without an explicit count, tonic-based keyboards use 25 keys and other optional
keyboards use 13. Answer notes fold into the bright octave. Front and back supply the same tonic
and count, while only the back supplies the answer note. The app exposes the
count in Arrange card and saves it per deck family.

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
them. The staff and the single-octave keyboards in Music Staff, Circle of
Fifths, and Guitar Fretboard share `STAFF_BASE_WIDTH` from
`@web-music/music-staff-core`; each keyboard still has its own scale and can
use `--keyboard-width` as an override. `data-piano-keys` on the document crops
the 88-key strip to the keys the reader asked for, around the middle of an
88-key piano — the boundary between E4 and F4 — rather than around the answer,
which the blank keyboard on the front would then name. `--keyboard-width`
replaces the width outright, for a reader who asks for the width of the screen
rather than a multiple of the deck's own choice, and a keyboard wider than the
card scrolls where it stands.

A white key is about 145 mm long and 23.5 mm wide, and the drawing keeps that
proportion, so the 88-key board is shallow rather than a bed of nails. A single
octave would be taller than the staff at that aspect, so it stops at the height
of the staff instead. A keyboard does not depend on the clef, so the four clefs
share one.

Both keyboards are diagrams, so tapping one reveals the answer the way tapping
the staff does. A key sounds as it is tapped, and the answer sounds with it:
naming a note is easier for having heard it.

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
of fifths SVG in `../../packages/circle-of-fifths-svg/` keeps its own staff
renderer, but its key-signature placements and glyph metrics are shared with
the movable-do cards through the core package.

## Diatonic seventh chords (web)

`pnpm generate` also runs `src/harmony-cli.ts` to write the separate
`dist/diatonic-chords.json` bundle. `src/diatonic.ts` owns the scales,
chord spelling, variants and selection defaults; `src/diatonic-deck.ts` owns
card generation. The Flashcards app imports the same browser-safe theory
module for its range settings.

`Diatonic Chords` is a single deck, visible by default:

| Deck | Front | Answer |
| --- | --- | --- |
| Diatonic Chords | F major / IΔ7 | FΔ7 |

No keyboard or staff is shown. Front/back retain identical layout, with only
the answer revealed.
The note fields are `Id`, `Direction`, `Key`, `Degree`, `Chord`, `Notes`,
`RelativeDegree`, `Contexts`, `Source`; `Contexts` is a JSON array of `{fifths, variant}`.
Only notes tagged `diatonic-chords` use this selection policy. Source identifies
harmonic/melodic minor only for variants absent from natural minor.

The web app shows Diatonic Chords as a single deck by default.
Card GUIDs and IDs remain unchanged when importing the flattened hierarchy.

What to ask offers separate major/minor circle-of-fifths selectors for each
deck. The initial keys are C, F and B♭ major, and A and D minor.
Saved key choices remain unchanged. Each circle offers an individual reset icon
when its selection differs from those defaults. All seven major diatonic
seventh chords and all seven natural-minor chords are required for selected
keys. Minor defaults additionally include V7 and vii°7, which remain optional.
Optional minor rows show a left-edge line and reset icon when changed from their default; natural-minor rows
are checked and disabled. Saved filters restore required chords while
preserving selected keys and optional variants. Identical chords from multiple scales form a single variant.
Melodic minor means the ascending/jazz form. Degrees are referenced to the
parallel major scale (e.g. ♭IIIΔ7 and ♭VII7 in natural minor).
Degrees use Roman numerals (IΔ7, iim7, V7, viiø7). In the Flashcards deck
What to ask, Minor degree notation selects `i7`, `i-7`, `im7` (default), `Im7` or
`I-7`. This display preference is shared across the two diatonic decks and II–V–I,
their relative-major hints, range labels and previews. It does not change
chord symbols such as Am7, chord tones, selected variants or study identities.
Minor-major sevenths use the same case and minor marker (e.g. imΔ7).
Rendered notation tiles independently select major
sevenths (Δ7 / maj7 / M7), note-name minor sevenths (m7 / -7 / min7 / mi7),
half-diminished sevenths (ø7 / m7(♭5) / m7♭5), and minor-major sevenths
(mΔ7 / m(maj7) / mM7). Defaults are Δ7, m7, ø7 and mΔ7. Minor degree notation
still owns the case and minor marker of Roman degrees; changing Am7 to A-7
does not change im7. Major-seventh choices also apply to augmented major
sevenths, retaining the explicit (♯5). The independent Chord Tones decks use the selected chord style too; study identity uses canonical qualities.
Prose uses the shared Note font preference (Termes by default); chord symbols use Edwin and Leland Text through the shared engraving formatter. Note IDs and
selection keys depend on the underlying chord variant, not its display label.

| Degree | Natural minor | Harmonic minor | Melodic minor |
| --- | --- | --- | --- |
| 1 | m7 | mΔ7 | mΔ7 |
| 2 | ø7 | ø7 | m7 |
| ♭3 | Δ7 | Δ7(♯5) | Δ7(♯5) |
| 4 | m7 | m7 | 7 |
| 5 | m7 | 7 | 7 |
| 6 | ♭6Δ7 | ♭6Δ7 | 6ø7 |
| 7 | ♭VII7 | 7°7 | 7ø7 |

An optional relative-major degree appears on minor degree questions, off by
default: G minor / V7 can also show `(III7 in B♭ major)`. This maps degree numbers
and preserves the chord quality; it does not assert that the altered chord
belongs to the relative major scale. The independent Chord Tones decks have no key/degree reference.
In Flashcards, the Minor keys section in What to ask
controls it separately for the two key-and-degree decks. The card reads
`--diatonic-relative-display` (`block` / `none`) without changing study content.

See [Minor Scales](https://musictheory.pugetsound.edu/mt21c/MinorScales.html)
and [Roman Numerals of Diatonic Seventh Chords](https://musictheory.pugetsound.edu/mt21c/RomanNumeralsOfDiatonicSeventhChords.html).
Tests: `src/diatonic.test.ts`, app `diatonic-selection.test.ts`, and
`e2e/diatonic.spec.ts` cover spelling, minor variants, deduplication, independent
ranges, saved preferences and front/back alignment.

## II–V–I progression deck

`progression.ts` selects the ii, V and I variants from the same diatonic theory.
Major uses m7 / 7 / Δ7; minor uses ø7 / 7 / m7. The minor V has a raised leading
note, while the ending i is the requested minor seventh, not minor-major.
In A minor this is Bø7 (B–D–F–A), E7 (E–G♯–B–D), Am7 (A–C–E–G).
The [minor seventh-chord reference](https://musictheory.pugetsound.edu/mt21c/RomanNumeralsOfDiatonicSeventhChords.html)
shows iiø7 and V7 in minor. This deck combines them with a minor-seventh tonic.

`progression-deck.ts` produces 30 cards (15 written major keys and their
relative minor keys). GUIDs depend on mode and fifths; display spelling does
not change study identity. `harmony-cli.ts`, included in `generate`, writes
`dist/ii-v-i.json`. The app's build stages this into public/decks and includes
it in the bundled-deck manifest. It is visible by default.

Fields: Id, Mode, Fifths, Key, Degree, Chords, RelativeDegree. Degree and Chords contain three
escaped labels separated by arrows. The app rebuilds those two display fields
from Mode/Fifths and the shared notation preferences. Minor cards also show
RelativeDegree on both sides, e.g. (viiø7 → III7 → vim7 in C major) for A minor.
The reference uses the same formatter as Diatonic Chords and preserves the
dominant quality of III7; it does not assert that E7 is diatonic to C major.
Major cards leave this field empty. The front reserves the
answer's space with visibility:hidden, so revealing the answer keeps the
question fixed. There is no chord-tone display.
The app stores independent major/minor key lists and a `relativeMajor` boolean
in `music-flashcards:ii-v-i-keys`. The hint defaults to on, including when an
existing saved range has no boolean. What to ask → Notation switches it live using
`--progression-relative-display` (`block` / `none`, default `block`). This
preference is independent of the Diatonic decks and is not a study filter.

## Chord-tone cards and reading size

Diatonic Chords is a single, initially visible Key + Degree → Chord deck. II–V–I Progressions is also initially visible. Chord Tones (Triads) and Chord Tones (Four-note Chords) are separate experimental, initially hidden roots. Their ranges are independent of diatonic keys; they study the written basic chord forms present in Jazz 1460, most frequent first. Seventh/sixth/add-note core forms retain their spelling; tensions and slash basses are aggregated into the core form. Ambiguous power/altered chords without a specified third/fifth are excluded.

All five harmony decks use the same 150% base reading size. Key names use 65% and relative-degree/source text 55% of the main diatonic symbol size; II–V–I also enlarges its key and relative-major line. Diatonic variants outside natural minor show Harmonic minor, Melodic minor, or both on front and back. Front/back keep the same question and reserved answer region. Diagram-label geometry in staff/keyboard/fretboard decks is separate from this harmony text scale.

Frequency data: decks/music-staff/src/chord-tone-frequency.ts, generated by tools/ireal-analysis/src/chord-tones.js from the same expanded Jazz 1460 JSON used by the interval analysis. Existing chord-to-notes GUIDs and card IDs are reused for matching four-note chords, preserving their review state.
