// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, it } from "vitest";
import { chordSemitones } from "./chord-audio";
import { describeChord } from "./chords";

it("voices each chord tone once above its slash bass", () => {
  expect(chordSemitones(describeChord("C#/B", "F#", "F#"))).toEqual([47, 49, 53, 56]);
  expect(chordSemitones(describeChord("C#sus4", "F#", "F#"))).toEqual([49, 54, 56]);
  expect(chordSemitones(describeChord("C#sus4", "F#", "G"))).toEqual([50, 55, 57]);
  expect(chordSemitones(describeChord("N.C.", "C", "C"))).toEqual([]);
});
