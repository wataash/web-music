// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export const DEGREES: Map<string, { size: number; semitones: number }>;
export const QUALITY_INTERVALS: Map<string, string[]>;
export function intervalsForQuality(quality: string): string[];
