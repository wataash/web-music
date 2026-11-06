# Flashcard settings and previews

## Keys and harmony

II–V–I and Diatonic Chords show the major circle above the minor circle in
**What to ask**, with independent Select all / Clear actions. Diatonic chord
choices follow the two circles in a minor-only section. All seven major chords
and all seven natural-minor chords are always included for selected keys;
only additional minor variants can be toggled. Optional minor rows use a left-edge line and a reset icon when they differ
from their defaults; natural-minor rows are checked and disabled.
Saved ranges are normalized to enforce these rules. Movable
Do currently studies major scales only, so it has one major circle.

II–V–I defaults to eleven keys per mode: signatures range from five flats
through five sharps for both major and minor. Saved selections,
including an empty range, are preserved.
Diatonic Chords defaults to C, F and B♭ major (fifths 0, -1, -2) and
A and D minor (fifths 0, -1). Saved key choices, including empty selections,
are preserved. Movable Do retains all fifteen major keys by default.
Every key circle shows a change line and reset icon when its selected keys differ
from that deck's defaults. Reset affects that circle only and edits the dialog draft;
APPLY saves it and CANCEL discards it.

## Appearance

**Appearance** opens from both the deck-list context menu and the study-screen
menu. Its fixed card preview has Front / Back buttons; settings scroll below it.
The study screen previews the current card, and the deck list loads a sample
without touching the study queue or progress. Preview changes do not add browser
history entries. Apply saves the draft; Cancel, Escape and browser Back discard it.

Note fonts are global and shown for decks whose note labels use them. Harmony
cards keep their dedicated music typeface and offer notation instead. The UI
states which settings apply to all decks and which apply only to this deck.
Existing storage keys and defaults are retained.

Notation settings live in **Appearance**, with all controls shown directly.
The five spelling controls show every option as a rendered, selectable tile.
Each group allows one selection, marked with a border and background tint.
Notation groups and optional minor chords use `SettingChange.svelte` to show a
left-edge line and an individual reset icon only while differing from the default.
Markers remain after saving and reloading; returning to the default removes them.
Reset edits the dialog draft, so APPLY saves it and CANCEL discards it.
Key-and-degree decks also show a relative-major hint checkbox below the notation
choices, with a live minor-key example. The card preview updates too when the
current card is minor.
The examples update while editing; APPLY saves the draft and CANCEL discards it.
Chord spellings are shared across harmony decks; the relative-major hint is
saved independently for each deck direction and for II–V–I. The independent Chord Tones decks have no key/degree context. Four-note cards show the four chord spelling controls; triads show only the minor-chord spelling choices, without a seventh.
II–V–I defaults to showing its hint, including for previously saved key ranges.

The harmony card can preview its answer during arrangement. This does not
reveal or rate the study card; leaving arrangement restores its original side.

## Other settings that benefit from a live preview

| Setting | Current location | Recommendation |
| --- | --- | --- |
| Note font | Appearance | Preview the font before saving. Chord fonts are independent. |
| Answer size | Deck actions, for staff/interval cards | Put beside the answer in Arrange card; an answer preview is needed to judge the size. |
| Optional keyboard on/off | Deck actions | Put beside keyboard range in Arrange card. |
| Front: root note / answer note | Deck actions, Intervals | Offer in Arrange card with an explicit front preview. |
| Minimize app bar | Deck actions | Offer in Arrange card because it changes available space. |
| Relative-major degree hint | Appearance, Diatonic Chords and II–V–I | Rendered minor-key example updates as the checkbox changes; saved per deck. |
| Keyboard key counts, fret count, board height, rotation, scale and position | Arrange card | Already edited beside the live card. |
| Staff note range and guitar tuning | What to ask, with reference diagrams | Keep with study content; use the existing diagrams to preview the range or tuning. |
| Keys, chord qualities and intervals to study | What to ask | Keep separate from visual arrangement; these determine which cards are eligible. |
| Sound | Deck actions | Auditory feedback is appropriate; no visual preview is needed. |

The recommendations in this table are an inventory, not additional settings
migrations. Avoid expanding an arrangement toolbar into a full settings sheet:
keep fonts, notation and relative-major hints with their previews in Appearance.

## UI text sizes

Flashcards defines its UI size scale in `src/typography.css`: labels use
`--ui-font-size-label` (1rem), secondary text uses `--ui-font-size-secondary`
(0.9375rem), and dense tables and captions use `--ui-font-size-caption`
(0.875rem).
Use these tokens for small UI text rather than introducing smaller fixed sizes.
Rem units follow the browser's preferred base font size. Card iframe typography
and music glyph geometry are controlled separately by their deck renderers.

The shared practice-ui menu and tuning editor accept the label/secondary tokens;
consumers that do not set them retain the components' existing fallback sizes.
Verify `e2e/ui-typography.spec.ts` and the affected settings/arrangement flows.

## Factory-default indicators

Flashcards uses a blue line and an individual reset icon only when a setting differs from its factory default. Study ranges compare selections as sets; staff ranges reset the current clef and key, and circle ranges reset the current ring. Guitar shape overrides compare against the current learning range and fret window. Resetting a draft still requires Apply; Cancel discards it.

Arrange card offers individual resets for rotation, counts, fretboard height, answer-button position and the selected part's scale/position. Keyboard part resets affect only the current key count. The existing whole-layout Reset remains available. Sound, app-bar visibility, optional keyboard, front-note switches, answer size, note font use the same indicator. In Choose decks, each row that differs from its shipped visibility has a blue line; toggles have no reset button. Instrument/tuning, temporary previews, navigation and study-history deletion do not use it.

Settings dialogs use the footer Cancel action and browser Back to dismiss without applying changes. They have no duplicate header close button. The reviewer retains its Back action for standalone PWA navigation.

## Deck list

Deck names wrap rather than truncate. Count columns use the maximum digit count among shown decks (including collapsed children), with a two-digit minimum. The colored New / Learning / Due legend is independent of column widths. No gear occupies row space; long press, right click, or Shift+F10 on a focused deck opens its actions, including What to ask. Study-screen settings remain in the ⋮ menu. Collapse compensation measures the rendered descendant heights so wrapped names do not shift the scroll position.

## Chord-tone cards and reading size

Diatonic Chords is a single, initially visible Key + Degree → Chord deck. II–V–I Progressions is also initially visible. Chord Tones (Triads) and Chord Tones (Four-note Chords) are separate experimental, initially hidden roots. Their ranges are independent of diatonic keys; they study the written basic chord forms present in Jazz 1460, most frequent first. Seventh/sixth/add-note core forms retain their spelling; tensions and slash basses are aggregated into the core form. Ambiguous power/altered chords without a specified third/fifth are excluded.

All five harmony decks use the same 150% base reading size. Key names use 65% and relative-degree/source text 55% of the main diatonic symbol size; II–V–I also enlarges its key and relative-major line. Diatonic variants outside natural minor show Harmonic minor, Melodic minor, or both on front and back. Front/back keep the same question and reserved answer region. Diagram-label geometry in staff/keyboard/fretboard decks is separate from this harmony text scale.

Frequency data: decks/music-staff/src/chord-tone-frequency.ts, generated by tools/ireal-analysis/src/chord-tones.js from the same expanded Jazz 1460 JSON used by the interval analysis. Existing chord-to-notes GUIDs and card IDs are reused for matching four-note chords, preserving their review state.

Chord-only fields opt into `chordSymbolsHtml(text, true)` to engrave bare roots and triads. Relative-key prose keeps the strict numbered-chord mode so ordinary key names are not parsed as chord symbols.
