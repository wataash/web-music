# Chord practice

The independent app lives in `apps/chords/`; shared UI and audio modules live in `packages/practice-ui/`. See [the app README](../apps/chords/README.md) for development and testing.

Built-in songs are short original practice examples. Import individual songs or playlists using iReal Pro sharing links or shared HTML, or paste a chart in ChordWiki notation; a ChordWiki chart is shown line by line, chords over lyrics, and exports as text.

Imported songs and charts are stored in the browser's IndexedDB and are never sent to a server. Favorites and practice positions are stored in localStorage. External charts, lyrics and analysis playlists are not bundled.

Charts follow the original 16-cell rows. Each chord shows its complete source row with the selected chord highlighted. Chords transpose to the selected key; notes and song information retain their original values. Repeats and jumps are displayed, while practice follows the written order.

The interface, accessibility labels and PWA metadata are in English. Parser-generated labels are translated at display time, preserving stored data and song IDs.

Build the standalone homepage with `pnpm build:chords`. Deploy to the chord practice environment with `./node_modules/.bin/wrangler deploy --env chords`.
