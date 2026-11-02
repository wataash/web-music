# Music typography reference

## MuseScore comparison

Verified with MuseScore Studio 4.7.4, build `7688c00`. The reference score
[`typography/chords.musicxml`](typography/chords.musicxml) contains FΔ7, Dm7,
G7, Bø7, G♯°7 and A minor-major seventh. Its MusicXML names describe chord
semantics; MuseScore can normalize the visible suffix (for example to
`A−maj7`). Compare the rendered result, not just the original input string.

MuseScore's own exporter successfully produced PNGs from this score using
both its default style and its shipped `styles/MuseJazz.mss`. In that style,
`chordSymbolAFontFace` is `MuseJazz Text`, `chordStyle` is `jazz`, and the
chord description file is `chords_jazz.xml`. This is a chord rendering style,
not just a generic text font selection. Leland and similar staff music fonts
serve a different role from the chord-symbol text face.

The visible differences include the placement and size of ø/°, the shape of
accidentals, suffix positioning and the handwritten MuseJazz letter shapes.
The MusicXML fixture is a visual reference, not a golden image test tied to
one MuseScore version or user's installed fonts.

## Running a comparison

For automated comparisons, run the unpacked AppImage in a filesystem/network
sandbox and use its PNG exporter. On the tested Linux build, both
`MU_QT_QPA_PLATFORM=offscreen` and `QT_QPA_PLATFORM=offscreen` were needed;
the application otherwise selected xcb. `QT_QPA_PLATFORMTHEME=generic` and
`QT_STYLE_OVERRIDE=Fusion` avoid depending on a running desktop theme.
Use fresh XDG config/data/cache directories for the comparison. Export with
`-T 8 -o output.png input.musicxml`; add `-S path/to/MuseJazz.mss` for the jazz
comparison. The tested binary does not accept the older `-s` and `-m` flags
listed in some handbook versions. PNG filenames may include a page suffix.
The jazz style can retain page whitespace, so inspect its actual page output.

To inspect interactive settings rather than just exported notation, use a
private Xvfb display, or a headless Weston compositor for native Wayland,
inside the same sandbox. Capture that display to a PNG and inspect it. A
nested compositor provides a separate display; the filesystem sandbox still
defines which files the application can access. Do not connect this test to
the regular desktop's display/session sockets.

A VM is appropriate when testing kernels or OS integration. It is not needed
for comparing the exported notation here. A VM still needs a graphical
session and screenshot capture, so booting a console-only VM does not itself
solve GUI verification.

## Direction for this repository

Keep the learning content independent from how a chord symbol is drawn.
A shared renderer should distinguish root, root accidental, quality, extension,
alterations and slash bass, rather than relying on a plain concatenated string
and one font-size setting. Compare suffix scale, baseline, spacing and line
wrapping using the reference score before rolling out a style across apps.

Keep the existing shared note-font preference and licensed glyph system as
the integration points: `packages/music-notation/src/note-fonts.ts` owns text
faces, and `packages/music-notation/src/index.ts` owns music glyphs. Chord
symbols must retain a consistent minor `m`, major Δ, half-diminished ø and
fully diminished °. Roman analysis can use IΔ7, ii7, V7 and viiø7; it is distinct
from the letter-name chord symbol Dm7. Only the visual key-picker label uses
lowercase for minor keys (`a`, `d`, `g`, `c`, `f`); sounding note names and
saved key identifiers keep their existing representation.

This document records a comparison and proposed rendering direction. It does
not prescribe replacing all application fonts with the staff music font or
with MuseJazz.

Sources: [Chord symbols](https://handbook.musescore.org/text/chord-symbols),
[Music fonts](https://handbook.musescore.org/appendix/music-fonts),
[Command line usage](https://handbook.musescore.org/appendix).

## Browsable atlas

The [MuseScore typography atlas](https://mf.wataash.com/music-notation-examples/) contains
104 reference sheets and 1,816 input specimens. It compares eight notation
fonts, eight chord typography/settings profiles, and eight text-font
requests. Search for a spelling such as `Am(maj7)`, or filter by category
and profile. Click a preview to open its vector rendering.

Each sheet offers PNG, SVG, PDF, native MSCZ/MSCX, its input XML, actual
applied MSS style and JSON metadata. The metadata records the PDF's actual
embedded font names, because a requested font may be substituted for some
characters. Internal harmony names and input spellings are not guaranteed
to be literal transcriptions of the final image.

The reproducible generator, specimen definitions and PDF verification tool
are documented in [`tools/musescore-atlas/README.md`](../tools/musescore-atlas/README.md).
Generated references are kept out of Git and out of the app's service worker
precache; ordinary app builds do not need to run MuseScore.

## Common chord spellings and Roman analysis

Chord symbols have never been fully standardized. These are common families,
not a claim that every publisher or software package accepts every spelling.
The triad quality and seventh quality must be kept separate.

| Quality | Typical chord-symbol spellings on C |
| --- | --- |
| Major triad | C, Cmaj, CM |
| Minor triad | Cm, Cmin, Cmi, C− |
| Augmented triad | Caug, C+ |
| Diminished triad | Cdim, C° |
| Major seventh | Cmaj7, CM7, CΔ7, C△7, CMaj7, CMa7 |
| Dominant seventh | C7 |
| Minor seventh | Cm7, Cmin7, Cmi7, C−7 |
| Minor-major seventh | Cm(maj7), CmMaj7, CmΔ7, C−Δ7 |
| Half-diminished seventh | Cø7, Cø, Cm7♭5, Cm7(♭5), C−7♭5 |
| Diminished seventh | Cdim7, C°7 |
| Augmented-major seventh | Cmaj7(♯5), CΔ7(♯5), C+maj7 |
| Augmented dominant seventh | C7(♯5), Caug7, C+7 |
| Suspended | Csus4 (often Csus), Csus2, C7sus4 |
| Added sixth / sixth-ninth | C6, Cm6, C6/9, Cm6/9 |
| Added ninth | Cadd9, Cm(add9) |
| Extensions | C9, C11, C13; Cmaj9 / CΔ9; Cm9 / C−9 |
| Alterations | C7(♭9), C7(♯9), C7(♯11), C7(♭13), C7alt |
| Alternate bass | C/E, Cm/G, C7/B♭ |

Parentheses, superscript placement and dash glyphs vary. An input shortcut
such as `^7` in notation software is not itself a universal printed convention.
C7 differs from Cmaj7, Cdim differs from Cdim7, and Caug7 differs from
Cmaj7(♯5). Cadd9 has no implied seventh; C9 has a minor seventh. Cø often
implies the seventh, while C° without 7 can depend on the chart's convention.

In case-sensitive Roman analysis, i7 is an established way to write a minor
seventh on the tonic: lowercase i identifies the minor triad and 7 the minor
seventh. Examples elsewhere include ii7 and vi7. Major sevenths can be
identified explicitly as IM7 / Imaj7 / IΔ7; some classical systems instead use
I7 with the quality inferred from the key. Do not read that I7 automatically
as the lead-sheet symbol C7.

A different family of conventions keeps Roman numerals uppercase and appends
chord qualities, such as IIm7 / II−7. Combining lowercase numerals with an
explicit minor marker (iim7 / ii−7) is also readable but is not required by
case-sensitive Roman analysis. Flashcards offers i7, i-7, im7, Im7 and I-7 as
user preferences, defaulting to im7. Degree case and suffix changes do not
change the root-letter spelling of the answer (Am7 remains Am7).

References:

- [Berklee: Why Lead Sheets?](https://www.berklee.edu/berklee-today/summer-2018/lead-sheet), adapted from *Berklee Contemporary Music Notation*, covers suffix variants, sevenths, tensions and bass notes.
- [Open Music Theory: Chord Symbols](https://viva.pressbooks.pub/openmusictheory/chapter/chord-symbols/) covers triads, seventh qualities and extensions. An accessible [University of Nebraska edition](https://pressbooks.nebraska.edu/openmusictheory/chapter/chord-symbols/) contains the same explanatory text.
- [Open Music Theory: Triads and seventh chords](https://openmusictheory.github.io/triads.html#roman-numerals-1) explicitly labels i7 as a minor seventh.
- [University of Puget Sound §8.3](https://musictheory.pugetsound.edu/mt21c/RomanNumeralsOfDiatonicSeventhChords.html) explains lowercase triad quality plus a seventh, with vi7 as an example.
- [Harmonia: Typing Roman Numerals](https://support.harmonia.illiacsoftware.com/for-teachers/teachers-the-harmonia-app/typing-roman-numerals) lists i7, ii7, iv7 and vi7 as supported theory notation.

## Flashcard chord typesetting

Diatonic Chords and II–V–I cards keep their stored chord strings and selected
spellings. At display time, `packages/music-notation/src/chord-symbols.ts`
separates complete chord tokens into roots, accidentals, qualities, extensions
and alterations. The card glyph enhancer applies this within `.diatonic-card`
to chord names, Roman degrees and relative-key hints; key names and component
note lists retain their existing typography. Reviewer and Preview use the same
card-document script.

Chord tokens use Edwin Roman at regular weight, following the atlas's
Standard / Edwin profile. Root accidentals, triangles, extensions and
alteration groups use the text size and baseline of that font; 7 is not
superscripted. Quality circles remain raised. Leland Text supplies chord
accidentals, triangles and quality circles, as in MuseScore's Standard style,
without replacing them with Maestro outlines.
Front and back receive identical formatting.

The Vite-only `@web-music/music-notation/chord-font` entry embeds the unmodified
Edwin and Leland Text fonts. Flashcards includes them only for Diatonic and II–V–I documents,
independently of the note-font preference. Other note names, keyboards and
staff glyphs retain that preference and their existing glyph renderer.

The formatter preserves text for accessibility and does not change card IDs,
answers or notation preferences. Unit tests cover the supported spellings;
`chord-typography.spec.ts` and `progression.spec.ts` check actual card rendering
and fixed question positions across the flip.
