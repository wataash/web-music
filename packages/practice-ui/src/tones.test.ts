// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { playSemitones, semitoneHertz } from "./tones";

describe("the pitch of a semitone", () => {
  it("counts from concert A, as MIDI numbers it", () => {
    expect(semitoneHertz(69)).toBeCloseTo(440, 6);
    expect(semitoneHertz(81)).toBeCloseTo(880, 6);
    expect(semitoneHertz(60)).toBeCloseTo(261.6256, 3);
    // The bottom and the top of a piano.
    expect(semitoneHertz(21)).toBeCloseTo(27.5, 6);
    expect(semitoneHertz(108)).toBeCloseTo(4186.009, 3);
  });
});

describe("playing a note", () => {
  // Tests run without Web Audio, as does a browser that has turned it off: a
  // card is still a card without its sound.
  it("says nothing where there is nothing to say it with", () => {
    expect(() => playSemitones([60, 64], "piano")).not.toThrow();
    expect(() => playSemitones([45], "guitar")).not.toThrow();
  });
});
