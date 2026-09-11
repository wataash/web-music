# @web-music/ireal

Extract chords in written order, song information, annotations and source-preserving chart tokens from single-song or playlist iReal HTML and sharing links. Works in Node.js >=22.5 and browsers.

Keep this package free of external dependencies. Other repositories install it directly using pnpm Git subdirectory dependencies; adding workspace dependencies would break those installs. No build or prepare step is required. The package is private to prevent accidental npm publication.

Use `workspace:*` within web-music. External consumers use:

```json
"@web-music/ireal": "github:wataash/web-music#ireal-v0.1.0&path:/packages/ireal"
```

```js
import { extractIreal, extractIrealPlaylist, scramble } from "@web-music/ireal";
import { DEGREES, QUALITY_INTERVALS } from "@web-music/ireal/intervals";
```

The result contains `{ format, title, artist, originalKey, chords, comments, annotations, score, unmappedSymbols }`. Repeats are not expanded. Unknown chord qualities are preserved and recorded in unmappedSymbols. scramble(text) applies a reversible 50-character permutation for encoding and decoding; it is not encryption.

Generated labels and symbol descriptions are in English. Source text is preserved in its original language. Consumers updating a pinned revision should check any label-based lookups and IDs derived from the parsed output.

The two parser packages are independent. Each keeps its small tokenizer locally so it can be installed on its own. Format dispatch and the CLI live in `tools/ireal-analysis/`.

`extractIrealPlaylist(text)` reads `irealb://` and legacy `irealbook://` links and returns `{ name, songs, errors }`. Songs use the single-song result format; invalid songs are recorded as `{ title, message }` errors. HTML is treated as text. Alternate chords retain their parentheses and appear in the chord list. Custom `*...*` qualities are preserved without interpretation.

`./intervals` shares chord-quality and chord-tone definitions between the CLI and browser. Unknown qualities have no inferred tones. `extractIreal(text)` continues to return one song.

```sh
# Run from the repository root; works in fish and bash.
pnpm --filter @web-music/ireal test
```

Tests use original synthetic charts. Consumer projects verify real charts separately. Do not include third-party charts or private URLs in this package.
