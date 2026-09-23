# Jazz 1460: chart features of all 1460 songs

All 1460 songs of the playlist, analyzed in the playlist's own order.

- [JSON](jazz-1460-chart-features.json)
- [CSV](jazz-1460-chart-features.csv)
- [Hand-written remarks](jazz-1460-chart-remarks.json)

## Regenerating

Run from the repository root with Node.js 22.18 or newer. The source HTML is not tracked by Git.

```sh
node tools/ireal-analysis/src/chart-features-cli.js --remarks tools/ireal-analysis/jazz-1460-chart-remarks.json --output-prefix tools/ireal-analysis/jazz-1460-chart-features tools/ireal-analysis/data/jazz-1460.html
```

Add `--limit N` to analyze only the first N songs of the playlist. Use a different `--output-prefix` for partial exports to avoid overwriting the full-playlist files, or omit `--output-prefix` to write the JSON to standard output instead of a pair of files.

This is a machine analysis of the chart data; it includes no visual check against a screenshot. Remarks are merged in from the hand-written file.

## Entering remarks

In `jazz-1460-chart-remarks.json`, use the `id` from the output JSON as the key and the text of the remark as the value. It starts out as an empty object, `{}`. Add an entry only for a song that is an exception; every other song keeps an empty remark. Write down the notation, layout or counting caveats that the existing columns cannot express.

Do not type into the generated JSON or CSV: edit the remarks file and regenerate with the command above. The CLI only reads the remarks file, and never changes it. Without `--remarks`, every remark is an empty string. A line break inside a remark is written as `\n` in the JSON string.

A song ID is the SHA-256, over UTF-8, of the title, composer/artist and original key as a JSON array in that order, prefixed with `song-`. It does not change when the playlist order, the chords or the layout change. If a title, composer or original key does change, move the key in the remarks file to the new ID. When several songs carry the same identifying fields, the run stops rather than merge a remark into the wrong song.

A remark whose value is not a string, and an ID that no song of the input playlist has, are errors as well. IDs are validated against every song of the playlist, so a remark for a song left out by `--limit` is kept as it is.

## Where the data comes from

- Extraction: `extractIrealPlaylist` in `packages/ireal/src/extract.js`. A song that cannot be extracted stops the run with an error rather than dropping a row.
- Row layout: `layoutIreal` in `apps/chords/src/lib/ireal-layout.ts`. The rows are what the app's current 16-cell layout produces, not a comparison against the iReal Pro screen.
- Every column counts what the stored chart data notates, not performance convention or another edition of the chart. The chord progression itself is never written to the output.

## Column definitions

Each CSV heading maps one-to-one to a JSON key. Numbers are counts, booleans are `true`/`false`, arrays are space separated, and an absent value is an empty cell (`null` or `[]` in the JSON).

| CSV heading | JSON key | Definition |
|---|---|---|
| Order | `order` | The 1-based position in the playlist. The songs are never reordered by feature. |
| Song ID | `id` | The identifier a remark is matched by, independent of the playlist position. |
| Title | `title` | The title field of the source data. |
| Composer | `composer` | The composer/artist field of the source data. |
| Key | `key` | The original key field of the source data. Minor keys use notation such as `E-`. |
| Time signature | `timeSignature` | The first time signature written. Empty (`null`) when the chart states none; never filled in as 4/4. |
| Measures | `measures` | Spans between barlines that hold a chord or a repeat symbol. Repeats and jumps are not expanded. A measure that wraps onto the next row is counted once. The second half of a two-bar repeat counts as a measure even though its cells are blank. A span of layout blanks alone is not counted. |
| Rows | `rows` | The number of rows `layoutIreal` returns. |
| Sections | `sections` | The section letters in written order, not in playback order. |
| Main chords | `mainChords` | Every chord written, excluding parenthesised alternate chords. Repeat symbols are not included. |
| Max main chords per measure | `maxMainChordsPerMeasure` | The largest number of main chords written in one measure. |
| Slash chords | `slashChords` | Chords that name a bass note (written with `/`), alternate chords included. |
| Alternate chords | `alternateChords` | Chords written inside parentheses. |
| Narrow chords | `narrowChords` | Chords under a narrow chord spacing (`s`) setting, alternate chords included. |
| End repeats | `endRepeats` | End-repeat double barlines. |
| Ending numbers | `endingNumbers` | The numbers of the 1st/2nd ending brackets, in the order they begin. `0` is an unnumbered bracket. |
| Ending spans rows | `endingSpansRows` | `true` when one ending bracket runs across rows. |
| Repeat previous measure | `repeatPreviousMeasure` | Repeat-previous-measure symbols (％). |
| Repeat previous two measures | `repeatPreviousTwoMeasures` | Repeat-previous-two-measures symbols (𝄎). |
| Repeat previous chord | `repeatPreviousChord` | Repeat-previous-chord symbols (/). |
| Segno | `segno` | Segno symbols (𝄋). |
| Coda | `coda` | Coda symbols (𝄌). |
| Fermata | `fermata` | Fermata symbols (𝄐). |
| Playback end | `playbackEnd` | Playback end symbols (END). |
| Notes | `notes` | Notes whose text is not empty. Whether a height is set makes no difference. |
| Time signature changes | `timeSignatureChanges` | Time signatures after the first that differ from the one then in force. A repeat of the same signature is not counted. |
| Row gaps | `rowGaps` | Row spacing (`Y`) settings. Consecutive settings count as one. |
| Last row measures | `lastRowMeasures` | Measures that reach into the cells of the last row. A measure that wraps is counted on the last row as well. |
| Remarks | `remarks` | Free text for the exceptions the other fields cannot describe. Empty when none is entered. |

The JSON begins with `source` (the input path), `playlist` (the playlist name), `songCount` (how many songs the playlist holds) and `limit` (the limit given, or `null` for every song).

## Taking the screenshots

A screenshot target is chosen by filtering the CSV on the columns above: a rare feature such as a time signature change, a segno, a fermata or a two-bar repeat appears in only a few songs. Keep the window width, zoom, transposition, chord spelling, note emphasis setting and selected chord the same before and after the fix. Check as well that the bottom of a long chart, and any scrolled region, are not cut off.
