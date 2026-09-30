# Music notation glyph sources

## Flashcards note fonts

The self-hosted regular and bold WOFF2 files in
[`apps/flashcards/src/lib/fonts/`](../../apps/flashcards/src/lib/fonts/) are
subsets of the following installed fonts. Each was generated with Debian's
`/usr/bin/pyftsubset` using `--flavor=woff2`, `--unicodes=U+0020-007E`,
and `--layout-features='*'` (ASCII letters, digits, and punctuation). Accidentals
are rendered separately as SVG glyphs.

| WOFF2 files | Installed originals | SHA-256 of originals (regular, bold) | License |
| --- | --- | --- | --- |
| `termes-{regular,bold}.woff2` | `/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyretermes-{regular,bold}.otf` | `cc3fe7c707b81428d23d54df3eadd9228a2bf6a4d43125d94df56f5f63134659`, `2fb3e952065fa153c7e4e64e04b98b9d79225739b6025aa3f0f0782d299ff61e` | GUST Font License |
| `heros-{regular,bold}.woff2` | `/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreheros-{regular,bold}.otf` | `6ae1a09d5a940367b7aaaa91ee8bd8a2c333bfe193e7096e23f931357d62081f`, `b170162835f4efc288886dd4231406dc47e19b614cf4416836635599d44a7d60` | GUST Font License |
| `roboto-{regular,bold}.woff2` | `/usr/share/fonts/truetype/roboto/unhinted/RobotoTTF/Roboto-{Regular,Bold}.ttf` | `797e35f7f5d6020a5c6ea13b42ecd668bcfb3bbc4baa0e74773527e5b6cb3174`, `36f3709dea3e3ce3c6aedc058079e55980825f898f1e901d091c73c40de8bab1` | Apache License 2.0 |

The TeX Gyre license and both upstream manifests are copied from
`/usr/share/texmf/doc/fonts/tex-gyre/` into
[`apps/flashcards/public/licenses/`](../../apps/flashcards/public/licenses/).
The manifests contain the Termes and Heros copyright notices. The Roboto
copyright notice (2015 Google Inc.) in
[`Roboto-NOTICE.txt`](../../apps/flashcards/public/licenses/Roboto-NOTICE.txt)
comes from `/usr/share/doc/fonts-roboto-unhinted/copyright`; its Apache 2.0
license text is copied from `/usr/share/common-licenses/Apache-2.0` into the
same public licenses directory.

The LaTeX Project Public License 1.3c referenced by the GUST license is
included verbatim as `LPPL-1.3c.tex`. The WOFF2 files are converted, subsetted
derivatives. The default note font is Termes; readers can choose Roboto or
Heros in the global Note font setting.

The shared `engraved` note-name accidentals are extracted from Finale Maestro
Text; staff accidentals and clefs are extracted from Finale Maestro. Both
fonts are distributed by MakeMusic, Inc. under the SIL Open Font License
(OFL) Version 1.1. The complete license and its copyright and Reserved Font
Name notices are included in [`OFL-Maestro.txt`](OFL-Maestro.txt), and a copy
is shipped with Music Flashcards at
[`apps/flashcards/public/licenses/Finale-Maestro.txt`](../../apps/flashcards/public/licenses/Finale-Maestro.txt).
MakeMusic lists Finale Maestro among the fonts covered by that license in its
[official font licensing information](https://makemusic.zendesk.com/hc/en-us/articles/1500013053461-MakeMusic-Fonts-and-Licensing-Information).

The glyph paths are extracted without contour edits from the unmodified fonts
at the eNote-GmbH [Maestro repository revision
`cc0e26e6ae93eadca8a903a961fb5f75a8173528`](https://github.com/eNote-GmbH/Maestro/tree/cc0e26e6ae93eadca8a903a961fb5f75a8173528).
Finale Maestro has 250 units per staff space. Shared accidental outlines use
codepoints U+E260–U+E264; staff clefs use U+E050, U+E05C, and U+E062. The
extracted SVG paths are scaled from the font's design units for rendering. For
note names, the Finale Maestro Text width, height, and baseline retain the
original outline bounds relative to the font's 1000-unit em; they are not
normalized to a common glyph height. Staff notation uses Finale Maestro and
remains scaled by its 250-unit staff space.
Extraction uses FontTools `pens.svgPathPen`; only the coordinate-system
flip and SVG color are applied, without editing the contours.
The Finale Maestro font's SHA-256 is
`cdc6db8f7549df8b78014c2657f228b3f0e90666c1b8282f205a1ee907c7d60b`;
the Finale Maestro Text Regular font's SHA-256 is
`b67d182a7583940322ebe8997875d2d8526bb8d0d082c11187a7d82e4bc32621`.

Wikipedia's [Key signature](https://en.wikipedia.org/wiki/Key_signature)
article and the [Special-T F-sharp major JPEG](https://commons.wikimedia.org/wiki/File:Key_Signature_F-sharp_major.jpg)
and [B-flat major JPEG](https://commons.wikimedia.org/wiki/File:Key_Signature_B-flat_major.jpg)
were consulted only as spacing references: the sharp spacing is 48 pixels and
the flat spacing is 42 pixels per 42.75-pixel staff space. No contours were
traced or retained from those images, and the rendered glyphs are not claimed
to match any Wikipedia raster image exactly. Their separate CC BY-SA 4.0
license therefore does not apply to these font-derived outlines.

The separate iReal-style `chart` paths and shared triangle are independent of
Finale Maestro and remain unchanged.
