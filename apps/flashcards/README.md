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
- A package can ship a deck turned off — `(Experimental) Circle of Fifths`,
  `Music Staff (with Octave Numbers)`, and the alto and tenor clefs are — and
  those are what the list starts without. They are ordinary decks otherwise: `CHOOSE DECKS` turns them on,
  and turning the head of the branch on brings the branch with it
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
- Guitar Intervals draws a guitar neck around a root marked `1` and asks what
  degree another position plays above it, answering with every name for that
  distance — `m3 ♯9`, say. There are no fret numbers: the board is drawn around
  the root, so the same shape is one card wherever it is played. Its settings
  are how far the board reaches either side of the root, which both crops the
  board and decides which positions are asked. Dragging either of them redraws
  the card on screen straight away, so what the window does is visible on the
  board itself; RESET goes back to three each way, and CANCEL puts the card
  back. The ⋮ sizes the board and the names on it, with the same
  screen-width option the keyboard has
- Music Staff chooses the notes to ask per clef: Basic (up to 2 ledger lines,
  the default), Advanced (up to 4), Esoteric (up to 6), or an individual
  selection. Each row shows the actual staff so the position is visible.
  Advanced's 3–4 ledger lines are practical on some instruments; Esoteric's
  5–6 exist for completeness on instruments with extreme ranges, and are not a
  general learning target. The selection applies both to the plain
  `Staff → Note` deck and to both directions of the deck with octave numbers.
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
- Whether a card sounds at all is a switch in the ⋮, kept per deck. The staff
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
- `decks/intervals/dist/intervals.json`
- `decks/music-staff/dist/music-staff.json`

A production build bundles those four decks into the web app. The `.apkg` files
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
