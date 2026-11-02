# Music Flashcards

A Svelte web flashcard app / PWA for learning intervals, the circle of fifths,
the guitar fretboard, and reading and writing staff notation. It loads the four
bundled web decks and schedules them with FSRS.

- Decks and progress are stored in IndexedDB
- Parent decks collapse behind an AnkiDroid-style chevron, and the open/closed
  state is kept on the device
- Every dialog and sheet is a history entry, so the browser's back button
  closes the one on screen instead of leaving the app. A sheet that opens
  another screen hands its entry over rather than stacking under it, so one
  press of back from there lands where the sheet was opened from
- Cards are rendered inside an iframe
- Works offline as a PWA
- The study day rolls over at 04:00
- The deck list is walked with the arrow keys: ↑ and ↓ move the selection, →
  opens the deck it is on and ← folds it, and Enter studies it — the row is a
  button, so the selection is where the focus is
- `CHOOSE DECKS` above the list turns decks off and on, at any depth: a deck
  turned off leaves the list, taking anything under it with it; turning one of
  those back on brings the branch it hangs from with it, but not its siblings,
  so a tree can be turned off and one deck in it studied. Nothing is deleted, and a deck that is still in the list
  still counts and asks everything its own settings allow. `RESET TO DEFAULT`
  goes back to the decks the packages ship on
- Experimental decks (Circle of Fifths, Movable Do, Intervals and Interval
  Identification) start hidden, as do `Music Staff (with Octave Numbers)` and
  the alto and tenor clefs. `CHOOSE DECKS` can enable them. The Experimental
  labels for Movable Do and the two interval decks are display-only; their
  stored names, progress and settings stay unchanged.
- For the circle of fifths `Note → Cell` and `Intervals` decks, the notes to
  study can be chosen as Basic / Advanced / Esoteric, or picked individually
- Intervals is one flat deck of every root and degree — m2 through M7, `d7` and
  `A5`, plus `♭9 9 ♯9 11 ♯11 ♭13 13` — and its settings are a grid of the 35
  roots against the 21 degrees, one cell per card. Rows and columns run from
  the pair jazz standards name most often to the one they name least, and each
  cell carries that count, taken from the iReal Pro Jazz 1460 analysis in
  [`tools/ireal-analysis`](../../tools/ireal-analysis/README.md). Tap a cell to
  turn it on or off, or a heading to turn a whole row or column; the slider
  above the grid turns on every pair named at least that many times. A cell
  reading `—` is a pair with no card, because its answer would need a triple
  accidental. The same selection applies to Interval Identification
- Interval Identification asks for the simple interval, answering `M3` to
  `C → E`
- Guitar Fretboard offers a `Keyboard` switch in the study menu, off by
  default and shared by both directions. Position → Note marks the key only
  after revealing the answer; Note → Positions marks the given note on both sides.
- Movable Do starts with its keyboard on; Circle of Fifths starts with it off.
  Both offer the same `Keyboard` switch. Tapping a piano key reveals the answer
  in any deck, even with sound disabled.
- Guitar Intervals draws a guitar neck around a root marked `1` and asks what
  degree another position plays above it, answering with every name for that
  distance — `m3 ♯9`, say. There are no fret numbers: the board is drawn around
  the root, so the same shape is one card wherever it is played. Answers mark
  nearby roots faintly beside m2, P4, P5 and M7: the tuning decides the string
  direction, and a guitar's major-third boundary makes the marker diagonal.
  Its settings
  include a ten-level learning-range slider, from basic chord forms to all
  shapes. The first level has 24 basic chord and reference shapes (49 positions); level 2 includes
  ninths across distant strings, including the high-string 9 in the six-string
  minor-ninth form. Representative voicings remain complete within their level.
  Each level includes the easier levels, and the selected shape count
  also reflects the fret window. The learning range stays at the top while scrolling.
  Six fretboards show labeled intervals and included positions for all root strings. Tap a cell to toggle every equivalent position and see its full answer.
  Individual choices are saved with APPLY and discarded with CANCEL. Moving
  the learning-range slider resets them to that level's selection. Positions
  outside the fret window remain excluded until the window is widened.
  APPLY saves the learning range on this device.
  Positions with the same string direction/distance, fret offset and tuning gap
  share one schedule: 118 shapes within the default ±3 frets, or 220 within ±6.
  Reviews cycle through their string positions after each answer. A shape uses
  its earliest member's learning level. Upgrading or restoring an old backup
  merges schedules using the latest review, preserves the earliest introduction
  day, and keeps every review event. Conflicting old inclusion settings prefer
  exclusion; tapping any member sets the whole group's choice. Reset, undo and
  extra study operate on the shared shape. The deck file retains all 462
  positions for rendering and Anki export; grouping happens in the web app.
  The fret controls set how far the board reaches either side of the root, which both crops the
  board and decides which positions are asked. Dragging either of them redraws
  the card on screen straight away, so what the window does is visible on the
  board itself; RESET goes back to three each way, and CANCEL puts the card
  back. The ⋮ sizes the board and the names on it, with the same
  screen-width option the keyboard has
- Both guitar decks are drawn for one instrument, chosen at the top of either
  deck's settings: the same presets the Chords app offers — guitar with 6 to 9
  strings, bass with 4 to 8, Chapman Stick, violin family, ukulele, mandolin
  family and tenor banjo — or any 2–12 strings tuned by hand. The packages
  ship for a six-string guitar in standard tuning; for any other instrument
  the app generates both decks itself, from the same code the packages are
  built with, and imports them in the bundled ones' place, so the question
  map, the cards, and what a tap on the neck sounds all follow the strings
  chosen. In Guitar Fretboard, when the first and last strings have the same
  note name, their corresponding positions share progress and reviews alternate
  between the two strings; equal inner strings remain separate. Each instrument
  otherwise keeps its own progress: switching to a bass starts its
  decks new, and switching back finds the guitar's schedule as it was. The
  shapes turned off by hand are kept per instrument too; the learning range,
  the fret window and the note selection are shared. The chord-form stages of
  the learning range apply where the first six strings are a standard
  guitar's, such as a seven-string; other instruments are staged by musical
  role and distance alone
- Music Staff chooses the notes to ask per clef: Basic (up to 2 ledger lines,
  the default), Advanced (up to 4), Esoteric (up to 6), or an individual
  selection. Each row shows the actual staff so the position is visible.
  Advanced's 3–4 ledger lines are practical on some instruments; Esoteric's
  5–6 exist for completeness on instruments with extreme ranges, and are not a
  general learning target. The selection applies both to the plain
  `Staff → Note` deck and to both directions of the deck with octave numbers.
  The major-key `Music Staff (Movable Do)` deck keeps independent ranges for
  each key and clef. What to ask separates the keys to study from the key whose
  range is being edited; changing the latter does not toggle any study keys.
  The range editor lists only selected study keys and is disabled when none
  are selected. Deselecting a key preserves its saved range for later use.
  APPLY saves all edited ranges and CANCEL discards the draft. Each key starts
  with a one-time copy of the previous shared selection on upgrade, preserving
  the existing study range without linking subsequent changes. New installations
  start on Basic. Solfege cards use their own key's range for both filtering
  and staff cropping, and ask for ド–シ from the key signature and written note. Their answer also
  shows the sounding pitch; minor keys and chromatic alterations are excluded.
  Its notation font is bundled for consistent, offline PWA rendering.
  Solfege's optional keyboard keeps a bright central tonic octave (F–F for
  F major, including the final tonic). In Arrange card, Keyboard range adjusts
  13–49 keys in steps of two, extending equally on both sides with darker
  context keys. The default is 25 keys; other optional reference keyboards
  default to 13 keys around C. The count is saved per deck family.
  For the ranges see the [ABRSM Music Theory syllabus][abrsm-theory]; for
  avoiding many ledger lines with 8va, [Dorico's guide][dorico-octave-line]
- The staff a card draws is framed for everything its clef can carry, so it
  never moves as the note changes, and the card crops that frame to the notes
  the settings can actually ask about
- Music Staff answers show a piano keyboard under the staff with the key
  highlighted and named, instead of writing the answer out: one octave in the
  plain deck, and in the deck with octave numbers the whole 88-key piano across
  the screen, marking where the note falls. The question shows the same keyboard with nothing on it, so the answer fills it
  in rather than moving the card around
- Music Staff shows `C` in the plain deck and `C5` in the
  `Music Staff (with Octave Numbers)` deck. The plain deck holds only
  `Staff → Note`; the one with octave numbers holds both directions
- On cards whose answer is unambiguous, tapping or clicking any diagram on the
  card — a staff, a fretboard, a keyboard — reveals the answer, just like SHOW
  ANSWER, however many fingers land on it
- A finger held on a keyboard or a fretboard and drawn along it plays each key
  or position it reaches, once each, so a run can be heard by sweeping it
- Whether a card sounds at all is a switch in the ⋮, kept per card layout. The staff
  decks start silent: a staff card asks which note is written and answers with
  its name, and sounding that every time is practice at naming pitches by ear —
  a different skill, and one a reader is better off not chasing by accident
- Every place a finger lands sounds, and the answer sounds with it as the card
  is turned over: two fingers on two keys play both notes and the answer
  against them. Once the answer is out, tapping keeps playing what is under the
  finger and leaves the answer alone. A piano for the keyboards, a plucked
  string for the fretboards, both synthesised in the browser rather than
  recorded, so the app carries no audio to play offline. `Guitar Intervals`
  draws the neck around the root rather than at a fret number, and puts the
  root at the seventh fret to sound it, which leaves the whole board on the
  neck
- The 88-key strip is cropped to 49, 61, 76 or 88 keys — the sizes a keyboard
  is built in — around the middle of an 88-key piano, the boundary between E4
  and F4. Fixed there rather than around the answer: the front of a card shows
  that keyboard blank, and a window that moved with the answer would name it,
  so a short crop can leave an extreme note off the board
- "Arrange card" in the ⋮ hands the whole screen to the card and outlines each
  part of it — the text, the staff, the keyboard, the fretboard — to be set out
  by hand: **drag** a part to move it, up to a card's width either way;
  **pinch** it to size it, from half to double; **twist** to turn the whole
  card a quarter at a time. A mouse has no pinch, so the **wheel** over a part
  sizes it, and the bar carries a turn button either way. The **answer
  buttons** are dragged too, and land on whichever of their eleven places is
  nearest — the only way they are placed, since dragging them says everything a
  list of the eleven could. One part at a time: the rest stays where it was, so a question can
  come down to the thumb without the keyboard following it off the bottom
- Key counts are adjusted in Arrange card alongside the live drawing:
  Piano keys selects 49/61/76/88 keys on octave-number staff cards, Keyboard
  keys selects 25–41 on interval cards, and Keyboard range controls optional
  reference keyboards. These controls replace the key-count rows in the ⋮ menu.
- Arrangement is saved for the actual card's deck family, model, direction and
  template, including when studying a parent deck. Pitch, key and clef share
  that layout; front and back use the same positions. Keyboard zoom and position
  are remembered separately for each key count. Diagram/text/answer sizes,
  rotation, answer-button position and piano key count belong to the layout.
  Only Minimize app bar remains global. Reset clears the current layout's sizes,
  positions and keyboard-count variants, leaving other layouts and learning
  switches (sound, optional keyboard and front-note visibility) unchanged.
  Existing deck-specific preferences provide initial values; the old global
  zoom is not copied. `src/lib/card-layout.ts` owns this storage, under
  `music-flashcards:card-layouts`, which is included in settings backups.
- Move up / Move down relocates the Arrange card toolbar to the other edge
  when it covers a diagram. Moving the toolbar keeps the card viewport and
  diagram positions unchanged. Help text and unused toolbar space let drags
  through; buttons, sliders and other controls still receive their own taps.
- The answer buttons keep their place while the mode is open, so a part is set
  out on the card as it will be studied, and a part is moved in the card's own
  directions — a card turned sideways is set out along its own edges. What is
  outlined is the drawing rather than the full-width row holding it, and a part
  moved off the card is cut off at its edge rather than making the card wide
  enough to hold it. The bar says what was last taken hold of, how large it now
  is and how far it has moved, and offers a keyboard or a board the width of
  the screen — a width rather than a multiple of one, so no pinch can reach it
  — beside Reset and DONE. A pinched size keeps the grain the fingers gave it;
  a stepped one is a round number already
- The ⋮ still steps the answer's name, which is written over a key rather than
  being a part of its own — a question side has none at all to take hold of —
  and how many keys a keyboard draws. A drawing larger than the card is cut off
  at its edges, centred on the card: a row that scrolls puts a scrollbar over
  the card, fights with the finger drawn along the keys, and is scrolled back
  by the next card — where a part is put is remembered
- Turning the card sideways — clockwise, anticlockwise, upright — gives a wide
  diagram the long side of a phone held upright. Only the card turns; the app
  bar and the answer buttons stay put. A turned card is only as tall as the
  screen is wide, so the staff is bound by that as well as by the width:
  turning a card to gain length does not push its keyboard off the end of it,
  and while it is being arranged the card scrolls to anything that does fall
  past its edge
- A long press on a deck row — or the ⋮ in the reviewer — opens that deck's
  actions. Resetting its study progress puts every card in the deck and its
  subdecks back to new, in its original order, and cannot be undone

## Card layout

Diatonic Chords shares notation preferences across its three decks. In the
deck actions menu, Chord notation expands controls for major sevenths, minor
chord symbols, half-diminished and minor-major sevenths. These are independent
of Minor degree notation and of card arrangement. Changes apply to study
cards, relative-major hints, range labels and previews. They are saved under
`music-flashcards:chord-notation` and included in settings backups.

All decks follow the shared [flashcard layout policy](../../README.md#flashcard-layout-policy)
for keeping front/back content aligned.

## Development

Run from the repository root.

```console
pnpm generate:decks
pnpm dev
```

The dev server watches these build outputs and re-imports them automatically,
including while a card is on screen — the app bar says "Updating…" and the card
is redrawn from the deck that has just landed, so a change shows without
leaving the deck.

- `decks/circle-of-fifths/dist/circle-of-fifths-intervals.json`
- `decks/guitar-fretboard/dist/guitar-fretboard-notes.json`
- `decks/guitar-intervals/dist/guitar-intervals.json`
- `decks/intervals/dist/intervals.json`
- `decks/music-staff/dist/music-staff.json`
- `decks/music-staff/dist/diatonic-chords.json`
- `decks/music-staff/dist/ii-v-i.json`

A production build bundles the generated decks into the web app. The `.apkg` files
for Anki are generated separately with `pnpm generate:anki` at the root.

## Not implemented

- Undo
- Deck options
- Statistics
- Cloze, audio, LaTeX, `{{type:}}`

Anki is a trademark of Ankitects Pty Ltd. Music Flashcards is independent and
is not affiliated with or endorsed by Ankitects.

[abrsm-theory]: https://www.abrsm.org/sites/default/files/2024-01/music-theory-syllabus-outline-grades-1-5-from-2020.pdf
[dorico-octave-line]: https://www.steinberg.help/r/dorico/doricofirststeps/6.1/en/dorico_first_steps/topics/first_steps_writing/first_steps_octave_line_adding_t.html

Interval calculation, identification, and guitar-interval queues avoid
similarity to the last three answered cards. Within the existing queue
priority, up to twelve leading candidates are compared by answer, interval,
root, and guitar shape; equally suitable candidates are chosen randomly.
New cards stay in the earliest remaining teaching group. Due cards take
precedence over future cards, and filters and daily limits still apply.
History comes from the review log, so undoing an answer also removes its
influence. Small candidate sets can still repeat a degree or shape.
The staff-reading queues do the same: a card is kept from following the note
one line or space away on the same clef, and from following its mirror in
the ledger lines — the ±1.5, ±3 and ±3.5, ±4, ±4.5 and ±5 ledger positions
each form one group, counted in lines above or below the staff with the space
past a line as a half, the same for every clef.

## Diatonic Chords

The list labels this family `(Experimental) Diatonic Chords` and hides it by
default. Enable it in CHOOSE DECKS. It appears after Music Staff (Movable Do)
and before Intervals. Existing explicit visibility choices are preserved;
stored deck names and study identities do not include the display-only label.

Three text-only decks separate Key + Degree → Chord, Chord → Notes and the
combined question. Each has its own What to ask settings: select major/minor
keys on the circle of fifths, then individual chord variants. Defaults are
C major and A minor, with natural-minor chords plus V7 and vii°7; other minor
variants are optional. Relative-major degrees are an optional hint on minor
degree questions. Chord → Notes does not show key or degree context.
The theory, field format and generator are documented in
[`decks/music-staff/README.md`](../../decks/music-staff/README.md#diatonic-seventh-chords-web).

## II–V–I Progressions

Enable `(Experimental) II–V–I Progressions` in CHOOSE DECKS. Each card asks
for the three chord names in one key: C major answers Dm7 → G7 → CΔ7;
A minor answers Bø7 → E7 → Am7. Minor uses a half-diminished ii, dominant V,
and minor-seventh i. There are 15 major and 15 minor key spellings, including
enharmonic keys. What to ask uses the shared circle of fifths, with independent
major/minor selections, initially C major and A minor. Chord spelling options
are shared with Diatonic Chords. Minor cards show their relative-major degree
reference on the front and back: A minor includes (viiø7 → III7 → vim7 in C
major). Chord qualities are retained, so III7 identifies the dominant E7 rather
than Em7. These cards have no chord tones or keyboard. Question placement is
fixed on reveal.

## Typography reference atlas

A separate [MuseScore typography atlas](https://mf.wataash.com/music-notation-examples/)
provides searchable reference sheets and vector previews. It does not add
content to study cards. Its sources and regeneration instructions are in
[`tools/musescore-atlas/`](../../tools/musescore-atlas/README.md). The generated
`public/music-notation-examples/` is copied into a build if present, and excluded from the
service worker precache so the flashcard app does not fetch the atlas at
startup. During Vite development, use `/music-notation-examples/index.html` explicitly.
