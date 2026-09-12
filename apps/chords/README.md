# Chord Positions

An independent Svelte app / PWA for practicing guitar and bass chord tones with iReal Pro charts.

- The `List` view displays every chord in song
  order with its fretboard and tones in a vertical scrolling list. Song, key,
  fret count, bass strings, and sound controls also apply to the list. Switching
  back resumes the selected list position. List boards fit the screen width;
  the single-card arrangement is kept separately.
  The fixed ↑/↓ buttons (or keyboard arrows) move to the previous/next chord
  and play it, respecting the Sound switch. The current chord is highlighted;
  N.C. stays silent. Playing a chord in the list also selects it.
  `Unique chords` shows each chord symbol once, in first-appearance order.
  Chord qualities and slash bass notes remain distinct. Toggling it keeps
  the current chord selected; key changes also transpose this list.
  `By section` narrows that merge to one section, so a symbol used in two
  sections is listed in each of them but only once inside one. Mode controls sit
  side by side and wrap on narrow screens. Settings contains instrument and tuning,
  bass-string selection, fret count, reset and chart deletion. iReal editions
  take their sections from the chart's own markers.
  The last song, each song's chord position and key, list/unique/section modes, blank-board
  setting, tuning, bass strings and fret count are saved in localStorage
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
  The built-in songs are short practice examples. Import iReal Pro songs or
  playlists to practice your own charts; see [chord practice](../../docs/chord-practice.md).
  Source comments and section markers appear alongside the chords. Each chord
  shows its complete source row, with the selected chord highlighted.
  `Full chart and song information` opens the full score, credits and playback settings.
  Chords transpose with the key selector; source text and settings retain their
  original values. Original notation is available separately. Unique mode groups
  source occurrences under each chord, with later rows and annotations expandable.
  Full scores and later occurrences render only when opened.

## Instruments and tuning

The instrument button opens a dedicated tuning dialog with guitar (6–9 strings), bass (4–8 strings), Chapman Stick (10/12-string Classic), violin (4/5 strings), viola, cello, double bass, ukulele (high G, low G, baritone), mandolin, mandola, octave mandolin, and tenor banjo (CGDA / Irish GDAE) presets. Custom setups support 2–12 strings. Each string's
open pitch can be changed independently by note and octave, including reentrant
tunings. String 1 is the top string in the diagram; C4 is middle C. Presets are
starting points, not restrictions on how an instrument must be tuned.

Click the song title to open the song library with search, playlist/style filters, sorting, Import and Export. Selecting a song closes the dialog; Escape or the close button returns to practice. The title wraps above the key, instrument and view controls, with the favorite star beside it. Library rows show the title and artist on separate lines and mark the current song. Arrow keys browse candidates; Enter or Space selects. Filters combine, show the matching count, and can be cleared together. A current song outside the results remains selected until you choose another song. The practice header groups the chord name, position and playback. General settings remain in the ⋮ menu. Practice / List selects the view; the instrument button shows the family and string count. Fit shows the whole fretboard, while Zoom allows horizontal scrolling with fixed open-string pitch labels. An open full chart highlights the current chord and replaces the repeated context rows. Click or tap a chart chord to select its practice position; Enter and Space work when it has keyboard focus. Repeat signs cycle through their corresponding chords. Each chart has one Tab stop; arrow keys select adjacent chords or the nearest chord in the next/previous row. Home/End select the row’s first/last chord, and Ctrl+Home/End select the chart’s first/last chord. Selection works in Practice and List without playing audio.

The tuning applies to chord positions and individual fret playback in practice
and list views. Selecting a preset resets the bass-note string selection to its
three lowest-pitched strings, or the complete bass side for Stick presets. Custom pitches persist after reload; reset restores standard
6-string guitar tuning. The synthesized plucked-string sound is shared by all presets.

Fretless instruments use the same semitone grid as a pitch-position guide. Paired mandolin strings are drawn individually. Stick presets retain the melody/bass string order and the 34-inch Classic reference positions; the extended-scale X fret is not represented. Instrument-specific tone, bowing, and physical finger spacing are not simulated.

Tuning references: [Stick Enterprises](https://stick.com/tunings-and-tech/stick-tunings/), [Yamaha violin](https://data.yamaha.com/files/download/other_assets/2/793262/yev104_yev105_en_om_c0.pdf), [Yamaha viola/cello](https://usa.yamaha.com/files/download/other_assets/9/2298929/viola_cello_10multi_om_a1_print.pdf), [Fender ukulele](https://www.fender.com/articles/setup/how-to-tune-a-ukulele), [Eastman mandolin family](https://www.eastmanguitars.com/mandolin_educational), and [Deering banjo](https://www.deeringbanjos.com/en-ca/pages/how-to-tune-a-banjo).

## Importing iReal Pro charts

Open “Import iReal Pro charts”. On a computer, right-click an iReal link and copy its address; on a phone or tablet, touch and hold the link to copy it. Paste the `irealb://` or `irealbook://` link into “Shared link / HTML”, then choose “Import”. You can also select a shared HTML file. Both individual songs and playlists are supported. Imported songs can be searched, transposed, displayed in a list and deleted. Importing the same chart again does not create a duplicate.

Charts and song information are stored in this browser's IndexedDB (`music-flashcards-chord-library`) and are never sent to a server. Use Export to save the selected imported song or its complete playlist as an HTML file for another device or a backup. Exports preserve the stored original key, notation, comments and song settings, regardless of the display key or library filters. Clearing site data deletes the library. Resetting practice settings does not delete imported charts.

Practice follows the written order, including alternate chords, and resolves previous-chord and one-/two-bar repeat signs. Repeated bars use the main chords, with each practice occurrence highlighting its repeat sign. Repeat barlines, numbered endings and navigation jumps do not trigger playback loops. Unsupported chord symbols retain their original notation. Import errors are reported per song so valid songs can still be loaded.

### Standalone chords homepage

The root scripts `pnpm dev:chords` / `pnpm build:chords` use this app’s `src/main.ts` to open chord practice directly on any domain, without loading flashcard decks. Output goes to `apps/chords/dist/`. The page and PWA use English and the title “Chord Positions”.

Run `./node_modules/.bin/wrangler deploy --env chords` from the repository root to build and deploy the chord practice Worker. The site is published at https://chords.wataash.com/. The workers.dev address remains available; each origin has its own browser storage. After building, run `pnpm exec playwright test` from this app directory to test the standalone page.

### Chart layout

Charts follow iReal's 16-cell rows at every screen width. Chords, spaces and repeat symbols occupy cells; barlines, sections, meters and notes retain their positions. Alternate chords appear above the main chord. Dense chords shrink horizontally to fit. Layout and practice occurrences are computed from saved tokens, so charts do not need to be imported again. Variable-width measure boundaries determine repeat placement; leading blank cells have no implicit barline, invisible roots stay hidden, and compressed comment spacing is decoded. Existing saved positions migrate to the expanded practice sequence.

Chart size in Full chart offers Fit, 125%, 150% and 200%. The saved size applies to full charts and context rows in Practice and List; the original line breaks and fretboard size stay unchanged. Enlarged charts scroll horizontally. Minor chords selects C−7 or Cm7 notation, and Highlight annotations emphasizes comments, endings and navigation symbols. These chart settings persist across Practice/List and reloads; source data and exports retain their original notation.

Slash bass notes sit below the main chord. Coda, segno and fermata use SVG symbols, and ending brackets continue across rows. Synthetic notation fixtures have Linux Chromium image baselines in `e2e/score-notation.spec.ts-snapshots/`; geometry checks also cover other browsers. Review rendered images before updating these baselines.

Parser-generated labels are translated only when displayed. Original titles, notes, stored chart data and song IDs remain unchanged.

### Favorites

Use “☆ Favorite” to toggle the selected song. “Favorites only” combines with title and artist search. Favorites work for both examples and imported charts. They are stored by song ID in localStorage (`chord-practice-favorites`) and survive “Reset settings and position”. Deleting and reimporting the same chart restores its favorite status.

## Shared code

Audio playback, card layout settings, the settings menu, theme and PWA update helpers come from `@web-music/practice-ui`. Neither app imports the other app’s source. Storage keys remain unchanged to preserve saved charts, favorites and settings on the existing domain.

Use **Print / PDF**, Ctrl+P (Cmd+P on macOS), or the browser’s Print menu to print the current key and notation on a white background, without practice controls or selection highlights. All entry points use the full chart, even when it is collapsed or List is selected. Save as PDF through the browser’s print dialog.

The library sorts by title, artist, or import order. Import order is recorded for new imports; older charts without this information appear first, sorted by title. Reimporting a chart preserves its recorded position. **Export → Copy song link** copies the original iReal chart directly; HTML export remains available if clipboard access fails.
