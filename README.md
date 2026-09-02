# web-music

A pnpm workspace holding web apps for learning music theory, the flashcard
decks they ship with, and the tools that build them.

## Layout

- `apps/flashcards/`: Music Flashcards (a Svelte web app / PWA)
- `apps/circle-of-fifths-playground/`: interactive circle of fifths SVG playground
- `apps/fretboard/`: fretboard app showing scales and chord tones (Next.js)
- `decks/circle-of-fifths/`: circle of fifths flashcard deck
- `decks/guitar-fretboard/`: guitar fretboard flashcard deck
- `decks/guitar-intervals/`: guitar interval-shape flashcard deck
- `decks/intervals/`: interval and tension spelling flashcard deck
- `decks/music-staff/`: staff note-name flashcard deck (reading and writing)
- `packages/anki-apkg/`: shared APKG generation for Anki distribution
- `packages/circle-of-fifths-core/`: circle of fifths note data and geometry
- `packages/circle-of-fifths-svg/`: React-free circle of fifths SVG renderer
- `packages/music-staff-core/`: note names and their positions on a staff
- `tools/circle-of-fifths-cli/`: CLI that generates a self-contained SVG

## Development

Node.js 22.5 or later and pnpm are required.

```console
pnpm install
pnpm generate:decks
pnpm dev
```

`pnpm dev` starts Music Flashcards. The other apps have their own commands.

```console
pnpm dev:circle-of-fifths
pnpm dev:fretboard
```

- Music Flashcards: <http://localhost:17381>
- Circle of Fifths Playground: <http://localhost:17382>
- Fretboard app: <http://localhost:18427>

The Music Flashcards dev server watches the generated web decks and re-imports
any `.json` that changes.

## Deck ID policy

While the project is still taking shape, deck names, card IDs, GUIDs and media
filenames are changed freely whenever that makes the naming more consistent.
Losing the study history of an existing import is acceptable; mismatched IDs
kept only for stability are not.

## Building and checking

```console
pnpm test
pnpm typecheck
pnpm build
pnpm check
```

`pnpm build` generates the five decks and bundles them into Music Flashcards,
then builds all three web apps and the circle of fifths CLI. Build output is not
tracked in Git.

Browser end-to-end tests run separately, one suite per app.

```console
pnpm test:e2e
pnpm --dir apps/fretboard test:e2e
pnpm --dir apps/flashcards test:e2e
```

The Music Flashcards suite starts from empty browser storage, so it imports the
decks from the dev server: run `pnpm generate:decks` first, or its tests have
nothing to list.

### Seeing what the E2E tests saw, as PNGs

The end-to-end tests that change the screen a lot carry a screenshot
checkpoint at each meaningful state. A normal run saves the Chromium
checkpoints as PNGs.

```console
pnpm test:e2e
pnpm --dir apps/flashcards exec playwright test --grep 'part of a test name'
```

The PNGs land in `apps/<app>/screenshots/`, one directory per checkpoint,
holding that screen as it was on each run.

```text
screenshots/lists-the-decks-as-they-import-cheapest-first/
  001.first-deck-listed/
    20260820T102835Z.png
    20260820T102905Z.png
  002.all-decks-listed/
    20260820T102835Z.png
```

Open a checkpoint's directory in an image viewer and the ← → keys step through
that screen run by run, which is how a change in the interface shows itself.
Runs accumulate — they are outside `test-results/`, which Playwright empties
before every run — so delete the directory when the history stops being
interesting. Firefox and WebKit take no checkpoints; they only keep the final
screen of a failed test. To keep a Chromium trace at the same time:

```console
pnpm --dir apps/flashcards exec playwright test --project=chromium --grep 'part of a test name' --trace on
```

To add a checkpoint, take `shot` from the fixture (the mechanism that injects a
capability into a test) and call it right after an `expect()` has confirmed the
state on screen. Take the viewport (the part of the page currently visible), so
the images stay the same size and can be compared; pass
`await shot("edit-loaded", { fullPage: true })` only when the whole page is
needed. The PNGs are attached to the HTML report as well, which opens with
`pnpm --dir apps/<app> test:e2e:report`.

## Generating a single deck

```console
pnpm --dir decks/circle-of-fifths generate
pnpm --dir decks/guitar-fretboard generate
pnpm --dir decks/guitar-intervals generate
pnpm --dir decks/intervals generate
pnpm --dir decks/music-staff generate
pnpm generate:anki
pnpm generate:svg
```

- `decks/circle-of-fifths/dist/circle-of-fifths-intervals.json`
- `decks/guitar-fretboard/dist/guitar-fretboard-notes.json`
- `decks/guitar-intervals/dist/guitar-intervals.json`
- `decks/intervals/dist/intervals.json`
- `decks/music-staff/dist/music-staff.json`
- `pnpm generate:anki` optionally produces the `.apkg` files for Anki
- `dist/circle-of-fifths.svg`

## Deployment

```console
pnpm deploy:workers
```

This builds Music Flashcards and uploads `apps/flashcards/dist` to the
Cloudflare Worker named in `wrangler.toml`, which serves it at
<https://mf.wataash.com/> — static assets and no script, since the app talks to
nobody. The script is not called `deploy`, because pnpm has a built-in `deploy`
command — unrelated to hosting, it copies one workspace package into a
self-contained directory — and a script of that name would hide it.

`learnmusic.wataash.com`, where the app was served from before, is a Pages
project of its own and is deployed separately:

```console
pnpm deploy:old-domain
```

It serves `deploy/old-domain/`: a page that moves the reader on to the current
domain and carries their study progress over with them, since a browser keeps
each domain's storage to itself and hands none of it over. See the README
there.

## License

Apache-2.0
