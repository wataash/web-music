// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The keyboard has the E4/F4 boundary fixed at its centre, matching an 88-key
// piano. Smaller web keyboards crop the same fixed axis rather than following
// the root. The front and back therefore never move between sides or notes.

import {
  drawIntervalKeyboard,
  type WebIntervalKeyboard,
  type WebIntervalKeyboardLabel,
} from "./web-keyboard";

export type IntervalKeyboardLabel = WebIntervalKeyboardLabel;
export type IntervalKeyboard = WebIntervalKeyboard;

export type IntervalKeyboards = Readonly<{
  front: IntervalKeyboard;
  back: IntervalKeyboard;
}>;

export type IntervalKeyboardInput = Readonly<{
  root: string;
  answer: string;
  keyCount?: IntervalKeyCount;
}>;

export const INTERVAL_KEY_COUNTS = [25, 27, 29, 31, 33, 35, 37] as const;
export type IntervalKeyCount = (typeof INTERVAL_KEY_COUNTS)[number];

export function intervalKeyboards({
  root,
  answer,
  keyCount = 37,
}: IntervalKeyboardInput): IntervalKeyboards {
  return {
    front: drawIntervalKeyboard(root, null, keyCount),
    back: drawIntervalKeyboard(root, answer, keyCount),
  };
}
