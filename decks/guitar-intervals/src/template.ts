// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { MAX_FRET_REACH } from "./cards";

export const ROOT_DECK_NAME = "Guitar Intervals";

export const FIELD_NAMES = [
  "Id",
  "Axis",
  "RootString",
  "TargetString",
  "FretOffset",
  "Answer",
  "Board",
  "AnswerBoard",
] as const;

export const FRONT_TEMPLATE = `
<main class="guitar-interval-card">
  <div class="diagram board">{{Board}}</div>
</main>
`.trim();

export const BACK_TEMPLATE = `
<main class="guitar-interval-card">
  <div class="diagram board">{{AnswerBoard}}</div>
</main>
`.trim();

export const CARD_CSS = `
.card {
  box-sizing: border-box;
  margin: 0;
  padding: 1rem;
  background: #111827;
  color: #f3f4f6;
  color-scheme: dark;
  font-family: "Noto Sans", "DejaVu Sans", "Noto Music",
    "Noto Sans Symbols2", sans-serif;
  text-align: center;
}

.guitar-interval-card {
  display: grid;
  justify-items: center;
  align-content: start;
  padding-block-start: 2rem;
}

/* The negative margin cancels the padding around the card, so the board can
   reach the edges of the screen. */
/* The negative margin cancels the padding around the card, so the board can
   reach the edges of the screen — and scroll past them, since a reader may
   ask for one larger than the screen. */
.board {
  width: 100vw;
  margin-inline: -1rem;
  overflow-x: auto;
}

/* The drawing always holds ${MAX_FRET_REACH} frets either side of the root.
   --fret-left and --fret-right are the reader's, set from the app: the window
   crops the board to them and slides it so the root's fret stays where the
   reader put it. Anki, which sets neither, gets the default three each way. */
.fret-window {
  --left: var(--fret-left, 3);
  --right: var(--fret-right, 3);
  --columns: calc(var(--left) + var(--right) + 1);
  position: relative;
  display: block;
  /* --board-scale and --board-width are the reader's, set from the app: a
     width, when one is asked for, rather than a multiple of the width the
     deck would have chosen. */
  width: var(--board-width, calc(100% * var(--board-scale, 1)));
  margin-inline: auto;
  overflow: hidden;
  container-type: inline-size;
  line-height: 0;
}

.fret-window-board {
  position: relative;
  display: block;
  width: calc(100% * ${MAX_FRET_REACH * 2 + 1} / var(--columns));
  margin-inline-start: calc(
    -100% * (${MAX_FRET_REACH} - var(--left)) / var(--columns)
  );
}

.fret-window-board img,
.fret-window-board svg {
  display: block;
  width: 100%;
  height: auto;
}

/* The names are written over the board rather than drawn into it, so a cell
   can carry three of them without the drawing having to make room. They are
   sized against the string spacing — which the window's width and its fret
   count decide together — so a wider window writes smaller names, as a real
   neck does. */
.fret-name {
  position: absolute;
  left: var(--fret-x);
  top: var(--fret-y);
  translate: -50% -50%;
  padding: 0.14em 0.34em;
  border-radius: 0.25em;
  white-space: nowrap;
  font-weight: 700;
  font-size: calc(21cqw / var(--columns) * var(--answer-scale, 1));
  line-height: 1;
}

.fret-name.root {
  background: #bfdbfe;
  color: #111827;
}

.fret-name.cue {
  background: rgb(255 255 255 / 0.72);
  color: #111827;
}

.fret-name.answer {
  background: #fcd34d;
  color: #111827;
}
`.trim();
