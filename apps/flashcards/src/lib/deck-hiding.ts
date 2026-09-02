// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Which decks the reader has turned off. Turning one off takes the decks
// under it with it, and turning one back on brings the decks over it back —
// so a tree can be turned off and one deck in it turned on again, and that
// deck is still shown where it belongs rather than alone at its own indent.
// It hides rows only — a deck still in the list is still counted and still
// asks everything its own settings allow.

type NamedDeck = Readonly<{ name: string }>;
type ShippedDeck = Readonly<{ name: string; hiddenByDefault: boolean }>;

export function parseHiddenDeckNames(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (name): name is string => typeof name === "string" && name.length > 0,
      ),
    ),
  ];
}

// Until the reader has chosen, the decks their packages ship turned off are
// the ones that are off — the circle of fifths, staff reading with octave
// numbers, the alto and tenor clefs. Choosing anything at all replaces that
// with an explicit list.
//
// A parent goes with them when everything under it is off, which is how a deck
// that is only a name over its children — a package need not give one a deck
// of its own — ships off with the tree it heads.
export function effectiveHiddenDeckNames(
  chosen: readonly string[] | null,
  decks: readonly ShippedDeck[],
): readonly string[] {
  if (chosen !== null) return chosen;
  const hidden = new Set(
    decks
      .filter(({ hiddenByDefault }) => hiddenByDefault)
      .map(({ name }) => name),
  );
  // Deepest first, so a parent sees the children a pass has already added.
  for (const { name } of [...decks].sort(
    (left, right) => depthOf(right.name) - depthOf(left.name),
  )) {
    const children = childrenOf(name, decks);
    if (
      children.length > 0 &&
      children.every((child) => hidden.has(child))
    ) {
      hidden.add(name);
    }
  }
  return decks.filter(({ name }) => hidden.has(name)).map(({ name }) => name);
}

export function filterHiddenDecks<T extends NamedDeck>(
  decks: readonly T[],
  hiddenDeckNames: readonly string[],
): readonly T[] {
  if (hiddenDeckNames.length === 0) return decks;
  const hidden = new Set(hiddenDeckNames);
  return decks.filter(({ name }) => !hidden.has(name));
}

// Turning a deck on carries the decks under it, since that is what the reader
// is pointing at, and the decks over it, which are the branch it hangs from.
// Its siblings are left where they are.
export function showDeck(
  name: string,
  hiddenDeckNames: readonly string[],
  decks: readonly NamedDeck[],
): readonly string[] {
  const shown = new Set([
    name,
    ...childrenOf(name, decks),
    ...ancestorsOf(name),
  ]);
  return hiddenDeckNames.filter((hidden) => !shown.has(hidden));
}

export function hideDeck(
  name: string,
  hiddenDeckNames: readonly string[],
  decks: readonly NamedDeck[],
): readonly string[] {
  const hidden = new Set(hiddenDeckNames);
  for (const hiddenName of [name, ...childrenOf(name, decks)]) {
    hidden.add(hiddenName);
  }
  return decks.filter(({ name: other }) => hidden.has(other)).map(
    ({ name: other }) => other,
  );
}

function ancestorsOf(name: string): readonly string[] {
  const parts = name.split("::");
  return parts
    .slice(0, -1)
    .map((_, index) => parts.slice(0, index + 1).join("::"));
}

function childrenOf(
  name: string,
  decks: readonly NamedDeck[],
): readonly string[] {
  return decks
    .map(({ name: other }) => other)
    .filter((other) => other.startsWith(`${name}::`));
}

function depthOf(name: string): number {
  return name.split("::").length;
}
