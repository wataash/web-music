// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
export function sameSelection<T>(selection: readonly T[], defaults: readonly T[]): boolean {
  const values = new Set(selection);
  return values.size === new Set(defaults).size && defaults.every(value => values.has(value));
}
