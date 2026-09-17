// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
export {
  DEFAULT_TUNING, MIN_STRINGS, MAX_STRINGS, TUNING_PRESETS, PITCH_CLASSES, NOTE_NAMES,
  normalizeTuning, matchingPreset, type TuningPreset,
} from '@web-music/practice-ui/tuning';

export function defaultBassStrings(tuning: readonly number[]): number[] {
  return tuning.map((pitch, i) => ({ pitch, string: i + 1 })).sort((a, b) => a.pitch - b.pitch).slice(0, 3).map(s => s.string).sort((a, b) => a - b);
}
