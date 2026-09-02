// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  deckNamesWithChildren,
  filterCollapsedDecks,
  parseCollapsedDeckNames,
} from "./deck-collapse";

const decks = [
  { name: "Parent" },
  { name: "Parent::Child" },
  { name: "Parent::Child::Grandchild" },
  { name: "Parent::Sibling" },
  { name: "Solo" },
] as const;

describe("deck collapse", () => {
  it("finds only decks with direct children", () => {
    expect([...deckNamesWithChildren(decks)]).toEqual([
      "Parent",
      "Parent::Child",
    ]);
  });

  it("hides descendants but keeps the collapsed deck itself", () => {
    expect(filterCollapsedDecks(decks, ["Parent::Child"]).map(deckName)).toEqual([
      "Parent",
      "Parent::Child",
      "Parent::Sibling",
      "Solo",
    ]);
    expect(filterCollapsedDecks(decks, ["Parent"]).map(deckName)).toEqual([
      "Parent",
      "Solo",
    ]);
  });

  it("normalizes persisted deck names", () => {
    expect(parseCollapsedDeckNames(null)).toEqual([]);
    expect(parseCollapsedDeckNames(["Parent", 1, "", "Parent"])).toEqual([
      "Parent",
    ]);
  });
});

function deckName(deck: Readonly<{ name: string }>): string {
  return deck.name;
}
