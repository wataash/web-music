// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

/** Anki-compatible heading: flipping replaces only the answer column. */
export function cardPrompt(back: boolean): string {
  return `<div class="prompt-line" data-card-part="text"><span class="question">{{Question}}</span><span class="answer-value${back ? ' answer' : ''}">${back ? '{{Answer}}' : '?'}</span></div>`;
}

/** Set --prompt-font-size on the card to retain each deck's typography. */
export const CARD_PROMPT_CSS = `
.prompt-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: baseline;
  width: 100%;
  gap: 0 calc(var(--prompt-font-size) * 0.4);
}
.prompt-line > span {
  font-size: var(--prompt-font-size);
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}
.prompt-line .question { justify-self: end; }
.prompt-line .answer-value { justify-self: start; color: #fcd34d; }
`.trim();
