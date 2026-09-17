# Chord Positions

An independent Svelte app / PWA for practicing guitar and bass chord tones with iReal Pro charts.

- The `List` view displays every chord in song
  order with its fretboard and tones in a vertical scrolling list. Song, key,
  fret count, bass strings, and sound controls also apply to the list. Switching
  back resumes the selected list position. List boards fit the screen width;
  the card's board size is kept separately.
  The fixed ↑/↓ buttons (or keyboard arrows) move to the previous/next chord
  and play it, respecting the Sound switch. The current chord is highlighted;
  N.C. stays silent. Playing a chord in the list also selects it.
  The list shows each chord symbol once, in first-appearance order; chord
  qualities and slash bass notes remain distinct, and every occurrence of a
  symbol is reachable from its card. Key changes also transpose this list.
  `By section`, the third view beside Card and List, narrows that merge
  to one section, so a symbol used in two sections is listed in each of them
  but only once inside one. Settings contains instrument and tuning,
  bass-string selection, fret count, reset and chart deletion. iReal editions
  take their sections from the chart's own markers.
  The last song, each song's chord position and key, the view,
  tuning, bass strings and fret count are saved in localStorage
  (`chord-practice-progress`). Details and scroll positions are remembered per
  song and display mode, including full scores, original notation and fretboards.
  Reopening restores the selection without playing audio. `Reset settings and position`
  restores the first song and default settings, clears saved views and positions,
  and resets chord-practice sound and layout settings.
  Fretboards are drawn as they approach the viewport to keep the mode switch
  responsive. Holding the left mouse button and moving across a chord
  fretboard plays each position reached, once until the pointer leaves it.
  Chords with five or more distinct pitches dim optional tones in the fretboard
  and tone badges: perfect fifth, root, then implied tensions, stopping at four
  pitches. Thirds, sevenths, explicit tensions, altered fifths and slash basses
  remain emphasized, even if that leaves more than four pitches.
  The built-in songs are short practice examples. Add iReal Pro songs or
  playlists to practice your own charts; see [chord practice](../../docs/chord-practice.md).
  Source comments and section markers appear alongside the chords. Each chord
  shows its complete source row, with the selected chord highlighted.
  `Full chart and song information` opens the full score, credits and playback settings.
  Chords transpose with the key selector; source text and settings retain their
  original values. Original notation is available separately. Unique mode groups
  source occurrences under each chord, with later rows and annotations expandable.
  Full scores and later occurrences render only when opened.

## Instruments and tuning

**Instrument and tuning** in the ⋮ settings menu, which names the current instrument, opens a dedicated tuning dialog with guitar (6–9 strings), bass (4–8 strings), Chapman Stick (10/12-string Classic), violin (4/5 strings), viola, cello, double bass, ukulele (high G, low G, baritone), mandolin, mandola, octave mandolin, and tenor banjo (CGDA / Irish GDAE) presets. Custom setups support 2–12 strings. Each string's
open pitch can be changed independently by note and octave, including reentrant
tunings. String 1 is the top string in the diagram; C4 is middle C. Presets are
starting points, not restrictions on how an instrument must be tuned.

Click the song title to open the song library with search, playlist/style filters, sorting and Add chart. Selecting a song closes the dialog; Escape or the close button returns to practice. The title wraps above the key and view controls, with the favorite star beside it. Library rows show the title and artist on separate lines and mark the current song. Arrow keys browse candidates; Enter or Space selects. Filters combine, show the matching count, and can be cleared together. A current song outside the results remains selected until you choose another song. The practice header groups the chord name, position and playback. General settings remain in the ⋮ menu. Card / List / By section selects the view: one chord at a time on a card, or every chord down the page. Fit shows the whole fretboard, while Zoom allows horizontal scrolling with fixed open-string pitch labels. An open full chart highlights the current chord and replaces the repeated context rows. Click or tap a chart chord to select its practice position; Enter and Space work when it has keyboard focus. Repeat signs cycle through their corresponding chords. Each chart has one Tab stop; arrow keys select adjacent chords or the nearest chord in the next/previous row. Home/End select the row’s first/last chord, and Ctrl+Home/End select the chart’s first/last chord. Selection works in Card and List without playing audio.

The tuning applies to chord positions and individual fret playback in practice
and list views. Selecting a preset resets the bass-note string selection to its
three lowest-pitched strings, or the complete bass side for Stick presets. Custom pitches persist after reload; reset restores standard
6-string guitar tuning. The synthesized plucked-string sound is shared by all presets.

Fretless instruments use the same semitone grid as a pitch-position guide. Paired mandolin strings are drawn individually. Stick presets retain the melody/bass string order and the 34-inch Classic reference positions; the extended-scale X fret is not represented. Instrument-specific tone, bowing, and physical finger spacing are not simulated.

Tuning references: [Stick Enterprises](https://stick.com/tunings-and-tech/stick-tunings/), [Yamaha violin](https://data.yamaha.com/files/download/other_assets/2/793262/yev104_yev105_en_om_c0.pdf), [Yamaha viola/cello](https://usa.yamaha.com/files/download/other_assets/9/2298929/viola_cello_10multi_om_a1_print.pdf), [Fender ukulele](https://www.fender.com/articles/setup/how-to-tune-a-ukulele), [Eastman mandolin family](https://www.eastmanguitars.com/mandolin_educational), and [Deering banjo](https://www.deeringbanjos.com/en-ca/pages/how-to-tune-a-banjo).

## Adding iReal Pro, ChordWiki and chord-list charts

Choose the song title → **Add chart** and choose the notation — iReal Pro, ChordWiki or a chord list typed on the spot; the choice is remembered. For iReal Pro, right-click an iReal link on a computer, or touch and hold it on a phone or tablet, and copy its address; paste the `irealb://` or `irealbook://` link into “Shared link / HTML”, then choose “Add”. You can also select a shared HTML file. Both individual songs and playlists are supported. Imported songs can be searched, transposed, displayed in a list and deleted. Importing the same chart again does not create a duplicate.

A chart in ChordWiki notation — `{title:…}`, `{key:…}` and other directives, with chords in brackets such as `[Am7]` before the lyric they fall on — is pasted into “ChordWiki text” under the ChordWiki choice, or selected as a `.wiki` or text file, one song at a time. A paste in another notation is pointed at its own choice rather than parsed as nothing. Whatever is typed is drawn under the field as it is typed — the first song's chart, with its title, key and chord count, and for a playlist how many songs come with it — so a chart can be checked before it is added. A ChordWiki chart or a chord list, once added, opens on its own full chart, and **Edit current chart** in the ⋮ settings menu opens its text in the same dialog again, keeping the song's id and so its favorite and its place, and **Copy current chart** opens the same text as a new chart, titled as a copy, to be added beside the original. The chart goes into the “ChordWiki” playlist. `{key:Am}` sets the original key to its tonic; without a key directive the first chord's root stands in, and the key selector transposes from there. `{c:…}` lines before the first chord become the song's comments and `{ci:…}` lines annotate the chord that follows them; a blank line ends a section for “By section”. Chords are respelled the way the chart editor respells its input (`AbM7` → `Ab^7`, `Bm7` → `B-7`), and tensions in parentheses are kept and voiced: `7(9,13)`, `m7(11)`, `M7(#11)`, `7(b9,b13)`, `6(9)`, `(omit3)`, `7-5(b9)`. A chord the app cannot voice is shown as written. On the card and in the list, the words a chord is sung on — the text after it up to the next chord, carried over a line break — are shown under the chord's name, above the neck. The chart view prints every line as ChordWiki does, chords above their lyrics with the rhythm and bar marks in between; the source text is kept exactly, and Export writes it back out as a text file. Practice follows the written order; ChordWiki has no repeat signs to expand.

Charts and song information are stored in this browser's IndexedDB (`music-flashcards-chord-library`) and are never sent to a server. Use **Export current chart** in the ⋮ settings menu to save the current imported song or its complete playlist as an HTML file for another device or a backup. Exports preserve the stored original key, notation, comments and song settings, regardless of the display key or library filters. Clearing site data deletes the library. Resetting practice settings does not delete imported charts.

Practice follows the written order, including alternate chords, and resolves previous-chord and one-/two-bar repeat signs. Repeated bars use the main chords, with each practice occurrence highlighting its repeat sign. Repeat barlines, numbered endings and navigation jumps do not trigger playback loops. Unsupported chord symbols retain their original notation. Import errors are reported per song so valid songs can still be loaded.

### Standalone chords homepage

The root scripts `pnpm dev:chords` / `pnpm build:chords` use this app’s `src/main.ts` to open chord practice directly on any domain, without loading flashcard decks. Output goes to `apps/chords/dist/`. The page and PWA use English and the title “Chord Positions”.

Run `./node_modules/.bin/wrangler deploy --env chords` from the repository root to build and deploy the chord practice Worker. The site is published at https://chords.wataash.com/. The workers.dev address remains available; each origin has its own browser storage. After building, run `pnpm exec playwright test` from this app directory to test the standalone page.

### Chart layout

Charts follow iReal's 16-cell rows at every screen width. Chords, spaces and repeat symbols occupy cells; barlines, sections, meters and notes retain their positions. Alternate chords appear above the main chord. Dense chords shrink horizontally to fit. Layout and practice occurrences are computed from saved tokens, so charts do not need to be imported again. Variable-width measure boundaries determine repeat placement; leading blank cells have no implicit barline, invisible roots stay hidden, and compressed comment spacing is decoded. Existing saved positions migrate to the expanded practice sequence.

Chart size in Full chart offers Fit, 125%, 150% and 200%. The saved size applies to full charts and context rows in Card and List; the original line breaks and fretboard size stay unchanged. Enlarged charts scroll horizontally. **Write minor chords as Cm7** in the ⋮ settings menu switches the charts and the card and list headings from C−7 to Cm7, and **Chord names** chooses whether a chord is called by its name (Dm7), by its degree in the key being practised (IIm7 — Dm7 in C, Db7 as ♭II7, G/B as V/VII), or by its name with the degree in small under it in the charts and beside it in the headings; the numeral counts letters up from the key and its accidental says how the root leaves the major scale; Highlight annotations colours an iReal chart's comments, endings and navigation symbols so they stand out from the chords. Song information and notation guide, with the iReal fields the drawing has no room for and the meaning of its symbols, and Original key and notation, the raw iReal text, are offered for iReal charts only: a ChordWiki chart draws its own fields and is its own text, and a chart with an editor shows its text there. These chart settings persist across Card/List and reloads; source data and exports retain their original notation.

Slash bass notes sit below the main chord. Coda, segno and fermata use SVG symbols, and ending brackets continue across rows. Synthetic notation fixtures in `e2e/score-notation.spec.ts` check the layout geometry.

Parser-generated labels are translated only when displayed. Original titles, notes, stored chart data and song IDs remain unchanged.

### Favorites

Use “☆ Favorite” to toggle the selected song. “Favorites only” combines with title and artist search. Favorites work for both examples and imported charts. They are stored by song ID in localStorage (`chord-practice-favorites`) and survive “Reset settings and position”. Deleting and reimporting the same chart restores its favorite status.

## Shared code

Audio playback, card size settings, the settings menu, theme and PWA update helpers come from `@web-music/practice-ui`. Neither app imports the other app’s source. Storage keys remain unchanged to preserve saved charts, favorites and settings on the existing domain.

Use Ctrl+P (Cmd+P on macOS) or the browser’s Print menu to print the current key and notation on a white background, without practice controls or selection highlights. All entry points use the full chart, even when it is collapsed or List is selected. Save as PDF through the browser’s print dialog.

The library sorts by title, artist, or import order. Import order is recorded for new imports; older charts without this information appear first, sorted by title. Reimporting a chart preserves its recorded position. **Export current chart → Copy song link** copies the original iReal chart directly; HTML export remains available if clipboard access fails.

### Chord lists

Under the **Chord list** notation, enter an optional title and original key,
then type a chord progression. Spaces separate bars and line breaks preserve
chart rows. If a line contains `|`, those separators define its bars, allowing
multiple chords in a bar (`Dm7 G7 | Cmaj7`). Leading/trailing barlines, full-width
spaces, blank lines, `maj7` spelling and Unicode accidentals are accepted. Each
line supports up to 16 chords; invalid symbols show their line and bar number.
The chart is drawn as it is typed; Add opens the full chart to practice it with
transposition, fretboards and List. Charts are stored locally in the same browser
library. **Edit current chart** in the ⋮ settings menu restores the source text and updates the same song,
preserving favorites and its library order; saving starts at the first chord in
the original key. **Export current chart** downloads the original progression as a text file;
paste it under Chord list and set its original key to recreate it. Chord lists do
not export as iReal links or join iReal playlist exports.

Custom input accepts qualities such as `A^7`, `Amaj13#11`,
`Amin13`, `Amaj7b5`, `Amaj7#9`, `Amin7b6` and `Amin9b6`. Major spellings
(`maj`, `M`, `^`, `△`, `Δ`) and minor spellings (`min`, `m`, `-`) resolve to a
supported quality when available. Common aliases include `A△7`, `Aø7` (or
`Aø`), `Adim`, `Aaug` and `A7sus4`. Slash bass notes work with these aliases;
editing and text export retain exactly what you entered. Unknown qualities
still produce an input error.

Chord input follows the [iReal Pro editor's shorthand conversions](https://www.irealpro.com/learn/chord-symbols/).
For example, `A^` becomes `A^7`, `Ah` becomes `Ah7`, `A11` becomes `A9sus`,
`A7b5` becomes `A7#11`, and `A7b13` becomes `A7#5`. These conversions determine
both the displayed chord and its tones. Other accepted shorthands include
`A-^`, `A^#11`, `Ao^`, `Aadd6`, `A+7`, `Aalt`, `Asus2`, `Amadd9` and
`A7susb9`. `n` is an alias for `N.C.`. Saved custom charts are reinterpreted
from their original input on load while retaining song IDs, favorites and import
order. This is chord-input compatibility; the space/newline entry format does
not interpret iReal chart control tokens, rhythmic spacing or navigation signs.

**Chord notation help** below the input expands to explain bar separators,
line breaks, common aliases, accidentals, slash bass notes and N.C. A nested
**All supported chord spellings** list groups examples generated from the same
quality definitions and alias rules used by the input parser. **Check chord
notation** beside an input error opens and focuses the help without changing
your text. The help is available when creating and editing charts.
