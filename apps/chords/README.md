# Chord Positions

An independent Svelte app / PWA for practicing guitar chord tones with iReal Pro charts.

- The app has a `Chord list` toggle that displays every chord in song
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
  side by side and wrap on narrow screens. Each mode is drawn as a
  box enclosing the options it enables, so the frames nest as deep as the
  options do, and a toggle that is on is filled with the accent color;
  `Reset settings and position` stands outside those boxes. iReal editions
  take their sections from the chart's own markers.
  The last song, each song's chord position and key, list/unique/section modes, blank-board
  setting, bass strings and fret count are saved in localStorage
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

## Importing iReal Pro charts

Open “Import iReal Pro charts”. On a computer, right-click an iReal link and copy its address; on a phone or tablet, touch and hold the link to copy it. Paste the `irealb://` or `irealbook://` link into “Shared link / HTML”, then choose “Import”. You can also select a shared HTML file. Both individual songs and playlists are supported. Imported songs can be searched, transposed, displayed in a list and deleted. Importing the same chart again does not create a duplicate.

Charts and song information are stored in this browser's IndexedDB (`music-flashcards-chord-library`) and are never sent to a server. Keep the original HTML files: clearing site data deletes the library. Resetting practice settings does not delete imported charts.

Practice follows the written order, including alternate chords. Repeats and jumps are displayed without expanding playback. Unsupported chord symbols retain their original notation. Import errors are reported per song so valid songs can still be loaded.

### Standalone chords homepage

The root scripts `pnpm dev:chords` / `pnpm build:chords` use this app’s `src/main.ts` to open chord practice directly on any domain, without loading flashcard decks. Output goes to `apps/chords/dist/`. The page and PWA use English and the title “Chord Positions”.

Run `./node_modules/.bin/wrangler deploy --env chords` from the repository root to build and deploy the chord practice Worker. The site is published at https://chords.wataash.com/. The workers.dev address remains available; each origin has its own browser storage. After building, run `pnpm exec playwright test` from this app directory to test the standalone page.

### Chart layout

Charts follow iReal's 16-cell rows at every screen width. Chords, spaces and repeat symbols occupy cells; barlines, sections, meters and notes retain their positions. Alternate chords appear above the main chord. Dense chords shrink horizontally to fit. Layout is computed from saved tokens, so charts do not need to be imported again.

Parser-generated labels are translated only when displayed. Original titles, notes, stored chart data and song IDs remain unchanged.

### Favorites

Use “☆ Favorite” to toggle the selected song. “Favorites only” combines with title and artist search. Favorites work for both examples and imported charts. They are stored by song ID in localStorage (`chord-practice-favorites`) and survive “Reset settings and position”. Deleting and reimporting the same chart restores its favorite status.

## Shared code

Audio playback, card layout settings, the settings menu, theme and PWA update helpers come from `@web-music/practice-ui`. Neither app imports the other app’s source. Storage keys remain unchanged to preserve saved charts, favorites and settings on the existing domain.
