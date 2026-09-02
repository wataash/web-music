// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import {
  selectChangedDevDecks,
  type DevDeckManifestEntry,
} from "./dev-decks";

const MANIFEST: readonly DevDeckManifestEntry[] = [
  {
    id: "guitar-fretboard",
    filename: "guitar.json",
    url: "/__dev_deck/guitar-fretboard",
    version: "100:1",
  },
  {
    id: "circle-of-fifths",
    filename: "circle.json",
    url: "/__dev_deck/circle-of-fifths",
    version: "200:2",
  },
];

describe("development deck selection", () => {
  it("returns only decks whose version changed", () => {
    expect(
      selectChangedDevDecks(MANIFEST, { "guitar-fretboard": "100:1" }).map(
        ({ id }) => id,
      ),
    ).toEqual(["circle-of-fifths"]);
  });

  it("can limit an update notification to one deck", () => {
    expect(
      selectChangedDevDecks(MANIFEST, {}, ["circle-of-fifths"]).map(
        ({ id }) => id,
      ),
    ).toEqual(["circle-of-fifths"]);
  });

  it("forces all requested decks when IndexedDB is empty", () => {
    expect(
      selectChangedDevDecks(
        MANIFEST,
        { "guitar-fretboard": "100:1", "circle-of-fifths": "200:2" },
        undefined,
        true,
      ),
    ).toEqual(MANIFEST);
  });
});
