# MuseScore typography atlas

Generate a browsable reference of actual MuseScore rendering, rather than
simulating its fonts in a browser. The atlas includes 104 sheets across 24
profiles: eight notation-font profiles, eight chord typography/settings
profiles, and eight text-font requests. The specimen list is defined in
`specimens.mjs`; `gallery.html` is the searchable, dependency-free viewer.
The generator embeds `packages/practice-ui/src/theme.css`, matching the
Flashcards palette, fonts and system light/dark preference. The stylesheet
is read at generation time, not imported from the study app in the browser.

Categories include chord basics, aliases, extensions/alterations, slash bass
and enharmonic spellings (including B-flat, B-double-flat and C-double-sharp
minor variants); note values/heads/dots, rests, clefs, meters,
accidentals/microtones/key signatures, dynamics, articulations/ornaments; and
Latin letters, numbers, Roman numerals, Greek and music Unicode, regular,
bold and italic text. Note/rest MusicXML specimens currently cover whole
through 64th notes. This is an expandable reference set, not every glyph or
every possible setting in MuseScore.

The viewer starts with search, clickable tags and score previews. PNG, SVG
and PDF links remain visible; editable scores, source XML, MSS settings, JSON
and input examples are folded into each sheet’s details. The font/profile
selector and version information are also collapsed. Tags are defined on
categories in `specimens.mjs` and included in the manifest and sheet metadata. Design-review references: [Visily](https://www.visily.ai/blog/how-to-make-ai-designs-less-generic)
and [Better Design](https://better-design.com/blog/stop-ai-generated-apps-looking-generic).

## Generate

Requires Node.js, an unpacked MuseScore Studio AppImage, and system Poppler
(`pdfinfo`, `pdffonts`) plus `unzip`. No npm packages are needed. Run project
code and MuseScore in a filesystem sandbox. The generator creates fresh
per-profile XDG config/data/cache directories in temporary storage; it does
not use the desktop's display sockets or settings. The local AppImage
location and exact sandbox launch are recorded in the repository's local
instructions.

From the repository root (fish and bash):

```sh
# Print flags; sources-only generation does not require MuseScore.
node tools/musescore-atlas/generate.mjs --help
node tools/musescore-atlas/generate.mjs --sources-only --output /tmp/atlas-inputs/
# The AppRun path is an example unpacked AppImage, not an installed dependency.
node tools/musescore-atlas/generate.mjs --musescore /tmp/musescore-reference/squashfs-root/AppRun --output apps/flashcards/public/music-notation-examples/
```

`--profile chord-1` restricts a run to one profile; `--limit N` limits sheet
count for a smoke test. Use a separate output directory for partial runs.
`--viewer-only` updates only the viewer HTML and needs no MuseScore binary.
Use it after changing the template or shared theme, keeping the existing
images and score exports. In a sandbox, expose both `tools/musescore-atlas/`
and `packages/practice-ui/src/theme.css` read-only.

```sh
node tools/musescore-atlas/generate.mjs --viewer-only --output apps/flashcards/public/music-notation-examples/
```

The default run renders all profiles serially. Each profile uses a MuseScore
conversion job to export PNG, SVG, PDF and MSCZ together. The generator
checks that every expected output exists, all page pairs match, every PDF
can be read, and every MSCZ contains its native score and applied style.
Failure stops generation, so an incomplete run is not ready to publish.

The renderer was verified with Studio 4.7.4, build `7688c00`. It sets both
`MU_QT_QPA_PLATFORM=offscreen` and `QT_QPA_PLATFORM=offscreen`, plus a generic
platform theme and Fusion style, avoiding a connection to the host desktop.
Export flags are `-r 144 -T 12 -S profile.mss -j job.json`. Older `-s`/`-m`
flags are not accepted by this binary.

## Outputs and interpretation

- `index.html`: filterable viewer; serve over HTTP, because it loads JSON.
- `manifest.json`: profile settings, input examples, relative file paths,
  MuseScore version, actual PDF embedded font names, and internal harmony
  names extracted from the saved native scores.
- Per sheet: PNG, SVG, PDF, MSCZ, uncompressed MSCX and JSON metadata.
- Per profile: requested MSS, actual complete `actual-style.mss`, and logs.
- `sources/`: MusicXML/MSCX input, MSS settings and portable conversion jobs.

The native harmony name is internal data, not a textual transcription of the
final rendered symbol. For aliases such as `Am(maj7)`, `AmMaj7`, `AmΔ7` and
`A-maj7`, inspect the image itself: MuseScore may preserve, normalize, or
render an unknown alias literally. A successful export alone does not prove
that a spelling was recognized as the intended harmony. The recorded labels
are the input requests, not claims of semantic equivalence for every alias.

Text requests can fall back to another face for missing characters; inspect
PDF font names in the viewer. Font names in a style file are requests, not
proof of font availability. Notation glyphs and chord text are separate
font roles. Raw font binaries are not redistributed; the atlas contains
rendered references and editable scores.

The generated `apps/flashcards/public/music-notation-examples/` directory is not tracked.
A normal Flashcards build copies it to `dist/music-notation-examples/` and deployment
serves `/music-notation-examples/`. It is excluded from the service worker precache, so
opening the flashcard app does not download the reference atlas. Generate
the atlas before building/deploying it. Ordinary app builds need not
regenerate the atlas, and do not require MuseScore.

## Verify

`verify.mjs` validates the generated manifest and files, re-renders every PDF
page with Poppler into a separate proof directory and creates contact sheets
for visual QA. The standalone gallery can then be checked with a browser
against the Flashcards dev server at `/music-notation-examples/`: filters, image zoom,
multiformat links and narrow-screen layout should all work.

See [`docs/music-typography.md`](../../docs/music-typography.md) for typography
findings and the shared implementation points in this repository.

To re-render PDF proofs (fish and bash):

```sh
node tools/musescore-atlas/verify.mjs apps/flashcards/public/music-notation-examples/ /tmp/musescore-atlas-proof/
```

As with generation, execute the verifier in a sandbox with only the atlas
input, Poppler binaries and proof output exposed. These are project research
scripts; they are not installed into the shell's global PATH.
