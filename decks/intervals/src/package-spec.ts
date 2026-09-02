// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { PackageSpec } from "@web-music/anki-apkg/package";

import {
  BACK_TEMPLATE,
  CARD_CSS,
  FIELD_NAMES,
  FRONT_TEMPLATE,
  IDENTIFICATION_DECK_NAME,
  ROOT_DECK_NAME,
  WEB_BACK_TEMPLATE,
  WEB_FRONT_TEMPLATE,
} from "./template";

export const MODEL_ID = 1_788_600_000_000;
export const ROOT_DECK_ID = 1_788_600_000_001;
export const DECK_CONFIG_ID = 1_788_600_000_004;
export const IDENTIFICATION_DECK_ID = 1_788_600_000_005;
export const NOTE_ID_BASE = 1_788_600_100_000;
export const CARD_ID_BASE = 1_788_600_200_000;

export const PACKAGE_SPEC: PackageSpec = {
  namespace: "intervals",
  model: {
    id: MODEL_ID,
    name: "Intervals",
    css: CARD_CSS,
    fieldNames: FIELD_NAMES,
    templates: [
      {
        name: "Card 1",
        ord: 0,
        qfmt: FRONT_TEMPLATE,
        afmt: BACK_TEMPLATE,
      },
    ],
    requirements: [{ cardOrd: 0, kind: "all", fieldOrds: [4] }],
  },
  decks: [
    {
      id: ROOT_DECK_ID,
      name: ROOT_DECK_NAME,
      description: "Calculate spelled intervals above a root note.",
    },
    {
      id: IDENTIFICATION_DECK_ID,
      name: IDENTIFICATION_DECK_NAME,
      description: "Identify a spelled interval from two notes.",
    },
  ],
  deckConfig: {
    id: DECK_CONFIG_ID,
    name: "Intervals — Random New Cards",
  },
  noteIdBase: NOTE_ID_BASE,
  cardIdBase: CARD_ID_BASE,
  rootDeckNames: [ROOT_DECK_NAME, IDENTIFICATION_DECK_NAME],
};

// The browser draws its keyboard from note data at display time. Anki keeps
// the conventional static media templates in PACKAGE_SPEC.
export const WEB_PACKAGE_SPEC: PackageSpec = {
  ...PACKAGE_SPEC,
  model: {
    ...PACKAGE_SPEC.model,
    templates: [
      {
        name: "Card 1",
        ord: 0,
        qfmt: WEB_FRONT_TEMPLATE,
        afmt: WEB_BACK_TEMPLATE,
      },
    ],
  },
};
