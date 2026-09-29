// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest';
import { cardPrompt } from './card-prompt';

test('flipping changes only the answer slot and revealed-answer marker', () => {
  const front = cardPrompt(false);
  const back = cardPrompt(true);
  expect(front).toContain('<span class="answer-value">?</span>');
  expect(back).toBe(front.replace('class="answer-value">?', 'class="answer-value answer">{{Answer}}'));
  expect(front).toContain('data-card-part="text"');
  expect(front).toContain('<span class="question">{{Question}}</span>');
});
