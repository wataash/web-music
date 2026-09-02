// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { PackageSpec } from "@web-music/anki-apkg/package";

import {
  BACK_TEMPLATE,
  CARD_CSS,
  FIELD_NAMES,
  FRONT_TEMPLATE,
  ROOT_DECK_NAME,
} from "./template";

export const MODEL_ID = 1_788_700_000_000;
export const ROOT_DECK_ID = 1_788_700_000_001;
export const DECK_CONFIG_ID = 1_788_700_000_002;
export const NOTE_ID_BASE = 1_788_700_100_000;
export const CARD_ID_BASE = 1_788_700_200_000;

export const PACKAGE_SPEC: PackageSpec = {
  namespace: "guitar-intervals",
  model: {
    id: MODEL_ID,
    name: "Guitar Intervals",
    css: CARD_CSS,
    fieldNames: FIELD_NAMES,
    templates: [
      { name: "Card 1", ord: 0, qfmt: FRONT_TEMPLATE, afmt: BACK_TEMPLATE },
    ],
    requirements: [{ cardOrd: 0, kind: "all", fieldOrds: [0] }],
  },
  decks: [
    {
      id: ROOT_DECK_ID,
      name: ROOT_DECK_NAME,
      description: "Name the degree a fretboard position plays above the root.",
    },
  ],
  deckConfig: {
    id: DECK_CONFIG_ID,
    name: "Guitar Intervals — Random New Cards",
  },
  noteIdBase: NOTE_ID_BASE,
  cardIdBase: CARD_ID_BASE,
  rootDeckNames: [ROOT_DECK_NAME],
};
