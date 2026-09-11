# @web-music/chordwiki

Extract chords in written order, song information, annotations and source-preserving chart tokens from ChordWiki Markdown. Requires Node.js >=22.5.

Keep this package free of external dependencies. Other repositories install it directly using pnpm Git subdirectory dependencies; adding workspace dependencies would break those installs. No build or prepare step is required. The package is private to prevent accidental npm publication.

Use `workspace:*` within web-music. External consumers use:

```json
"@web-music/chordwiki": "github:wataash/web-music#chordwiki-v0.1.0&path:/packages/chordwiki"
```

```js
import { extractChordWiki } from "@web-music/chordwiki";
```

The result contains `{ format, title, artist, originalKey, chords, comments, annotations, score, unmappedSymbols }`. Repeats are not expanded. Chord qualities retain their source notation and are not normalized to iReal notation. Japanese subtitle credit syntax remains supported.

Generated labels and symbol descriptions are in English. Source text is preserved in its original language. Consumers updating a pinned revision should check any label-based lookups and IDs derived from the parsed output.

The two parser packages are independent. Each keeps its small tokenizer locally so it can be installed on its own. Format dispatch and the CLI live in `tools/ireal-analysis/`.

```sh
# Run from the repository root; works in fish and bash.
pnpm --filter @web-music/chordwiki test
```

Tests use original synthetic charts. Consumer projects verify real charts separately. Do not include third-party charts or private URLs in this package.
