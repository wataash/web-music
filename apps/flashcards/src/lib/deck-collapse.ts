// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

type NamedDeck = Readonly<{ name: string }>;

export function parseCollapsedDeckNames(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (name): name is string => typeof name === "string" && name.length > 0,
      ),
    ),
  ];
}

export function deckNamesWithChildren(
  decks: readonly NamedDeck[],
): ReadonlySet<string> {
  const names = new Set(decks.map(({ name }) => name));
  const parents = new Set<string>();
  for (const { name } of decks) {
    const parent = parentDeckName(name);
    if (parent !== null && names.has(parent)) parents.add(parent);
  }
  return parents;
}

export function filterCollapsedDecks<T extends NamedDeck>(
  decks: readonly T[],
  collapsedDeckNames: readonly string[],
): readonly T[] {
  const collapsed = new Set(collapsedDeckNames);
  return decks.filter(({ name }) => {
    let parent = parentDeckName(name);
    while (parent !== null) {
      if (collapsed.has(parent)) return false;
      parent = parentDeckName(parent);
    }
    return true;
  });
}

function parentDeckName(name: string): string | null {
  const separator = name.lastIndexOf("::");
  return separator < 0 ? null : name.slice(0, separator);
}
