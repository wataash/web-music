// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { WEB_INTERVAL_KEYBOARD_SCRIPT } from "./web-keyboard";

export const ROOT_DECK_NAME = "Intervals";
export const IDENTIFICATION_DECK_NAME = "Interval Identification";

export const FIELD_NAMES = [
  "Id",
  "Axis",
  "Root",
  "Interval",
  "Question",
  "Answer",
  "Difficulty",
  "Keyboard",
  "AnswerKeyboard",
] as const;

// The root is marked on the fixed keyboard. The answer is still absent: a
// question mark holds the place it will take.
export const FRONT_TEMPLATE = `
<main class="interval-card">
  <div class="prompt-line" data-card-part="text">
    <span class="question">{{Question}}</span><span class="answer-value">?</span>
  </div>
  <div class="diagram keyboard" data-card-part="keyboard">{{Keyboard}}</div>
</main>
`.trim();

// The answer takes the question mark's place, and the answer keyboard the
// front keyboard's: nothing on the card moves as it is turned over.
export const BACK_TEMPLATE = `
<main class="interval-card">
  <div class="prompt-line" data-card-part="text">
    <span class="question">{{Question}}</span><span class="answer-value">{{Answer}}</span>
  </div>
  <div class="diagram keyboard" data-card-part="keyboard">{{AnswerKeyboard}}</div>
</main>
`.trim();

// The web package carries one drawing function in its model instead of seven
// front and seven back SVG references in every note. AnswerKeyboard contains
// only the answer note name in that package; the front never expands it.
export const WEB_FRONT_TEMPLATE = `
<main class="interval-card">
  <div class="prompt-line" data-card-part="text">
    <span class="question">{{Question}}</span><span class="answer-value">?</span>
  </div>
  <div class="diagram keyboard" data-card-part="keyboard" data-interval-keyboard data-root="{{Root}}"></div>
</main>
${WEB_INTERVAL_KEYBOARD_SCRIPT}
`.trim();

export const WEB_BACK_TEMPLATE = `
<main class="interval-card">
  <div class="prompt-line" data-card-part="text">
    <span class="question">{{Question}}</span><span class="answer-value">{{Answer}}</span>
  </div>
  <div class="diagram keyboard" data-card-part="keyboard" data-interval-keyboard data-root="{{Root}}" data-answer="{{AnswerKeyboard}}"></div>
</main>
${WEB_INTERVAL_KEYBOARD_SCRIPT}
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

/* The question starts at a fixed depth into the card. In rem rather than vh:
   the app's answer buttons are taller than its SHOW ANSWER bar, so the card
   itself is a little shorter once the answer is out, and a share of that would
   move both the question and keyboard. */
.interval-card {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 1.25rem;
  padding-block-start: 8rem;
}

.question,
.answer-value {
  font-size: calc(clamp(2.4rem, 10vw, 4rem) * var(--text-scale, 1));
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

/* Equal columns keep the question left of center and the answer right of
   center, so neither moves the other when the card is turned over. */
.prompt-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: baseline;
  gap: 0 calc(clamp(2.4rem, 10vw, 4rem) * var(--text-scale, 1) * 0.4);
  width: 100%;
}

.question {
  justify-self: end;
}

.answer-value {
  justify-self: start;
  color: #fcd34d;
}

/* Cancel the card padding so drawings reach its edges. Keep enlarged keys
   visible outside this row when the keyboard is repositioned. */
.keyboard {
  width: 100vw;
  margin-inline: -1rem;
}

/* The names are written over the keyboard rather than drawn into it, so they
   can be sized on their own. cqw ties their size to the keyboard's width, so
   the two keep their proportions however large the keyboard is drawn. */
.keyboard-frame {
  position: relative;
  display: block;
  /* Centred even when it is wider than the card, so the middle of a keyboard
     stays in the middle of the card and both edges are cut off alike. Auto
     margins give a block wider than its container nothing, which would leave
     it against one side. */
  left: 50%;
  translate: -50%;
  /* A container sized by its own contents measures zero to the units inside
     it, so the frame is given a width and the image fills it. */
  container-type: inline-size;
  line-height: 0;
}

/* The fixed-centre interval keyboard uses the card width. --keyboard-scale and
   --keyboard-width are the reader's, set from the app. */
.keyboard-frame.keyboard-interval {
  width: var(
    --keyboard-width,
    calc(100% * var(--keyboard-scale, 1))
  );
}

.keyboard-frame img,
.keyboard-frame svg {
  display: block;
  width: 100%;
  height: auto;
}

/* A name lies over the key it names, and a tap on it is a tap on that key:
   the app plays what is under the finger. */
.key-name {
  pointer-events: none;
  position: absolute;
  left: var(--key-x);
  top: var(--key-y);
  translate: -50% -50%;
  padding: 0.12em 0.3em;
  border-radius: 0.25em;
  /* A name lies across white keys and black ones alike, so it carries a little
     of the white key with it. In em, so it grows with the name. */
  background: rgb(255 255 255 / 0.72);
  color: #111827;
  font-weight: 700;
  font-size: calc(var(--key-size, 4cqw) * var(--answer-scale, 1));
  line-height: 1;
}
`.trim();
