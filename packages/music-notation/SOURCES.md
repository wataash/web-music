# Music notation glyph sources

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
