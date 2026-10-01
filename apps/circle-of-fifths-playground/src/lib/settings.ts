// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { BASIC_NOTES, POSITIONS } from "@circle-of-fifths/core";
import {
  DEFAULT_TITLE,
  type DiagramRing,
  type HighlightedCell,
  type RenderCircleOfFifthsOptions,
} from "@circle-of-fifths/svg";
import {
  NOTE_FONT_LETTER_ADVANCES,
  NOTE_FONTS,
  noteFontFaces,
} from "@web-music/music-notation/note-fonts";

export type Theme = "light" | "dark";
// The Flashcards note fonts, embedded in the SVG.
export const FONTS = NOTE_FONTS;
export type Font = typeof FONTS[number]["id"];
// Which spelling of a cell sits nearest the rim; the others follow along the radius.
export type Outside = "sharps" | "flats";
export type NoteMode = "basic" | "single" | "all" | "custom";

export type PlaygroundSettings = Readonly<{
  theme: Theme;
  font: Font;
  noteMode: NoteMode;
  customNotes: readonly string[];
  labelSize: number;
  outside: Outside;
  spiral: number;
  ringWidth: number;
  highlightedCells: readonly HighlightedCell[];
  showKeySignatures: boolean;
  signatureSize: number;
}>;

type NumberSetting = "labelSize" | "ringWidth" | "spiral" | "signatureSize";

/** The sliders: their URL parameter and integer range. */
export const RANGES: Readonly<Record<NumberSetting, Readonly<{ param: string; min: number; max: number }>>> = {
  // Large sizes may spill over a crowded cell; the reader judges the balance.
  labelSize: { param: "size", min: 20, max: 64 },
  // Percent of the most each ring can take, at 100 closing the hole in the middle.
  ringWidth: { param: "ring", min: 10, max: 100 },
  // Percent of a spiral of fifths; past 100 it exaggerates the drift so that a
  // few spellings still read as one line.
  spiral: { param: "spiral", min: 0, max: 200 },
  // Percent, 100 being half again the renderer's own. Past 140 neighbouring
  // staves would meet, and the renderer moves them all out instead, so the
  // circle only shrinks.
  signatureSize: { param: "signature-size", min: 50, max: 140 },
};
const SIGNATURE_SCALE = 1.5;

// The rim stays put and both rings are as wide as each other.
export const OUTER_RADIUS = 460;

export function radiiFor({ ringWidth }: PlaygroundSettings) {
  const width = (OUTER_RADIUS / 2) * (ringWidth / 100);
  return { outer: OUTER_RADIUS, divider: OUTER_RADIUS - width, inner: OUTER_RADIUS - 2 * width };
}

// Every spelling, in the order the cells hold them.
export const ALL_NOTES: readonly string[] = POSITIONS.flatMap(({ major, minor }) => [...major, ...minor]);

// The common spellings, with both names of the keys of seven sharps or flats.
export const BASIC_NOTE_LIST = ALL_NOTES.filter((note) =>
  (BASIC_NOTES.major as readonly string[]).includes(note) ||
  (BASIC_NOTES.minor as readonly string[]).includes(note) ||
  ["C#", "Cb", "a#", "ab"].includes(note));

// Every spelling with at most one sharp or flat.
export const SINGLE_ACCIDENTAL_NOTES = ALL_NOTES.filter((note) => note.length <= 2);

export const DEFAULT_SETTINGS: PlaygroundSettings = {
  theme: "light",
  font: "termes",
  noteMode: "basic",
  customNotes: [],
  labelSize: 48,
  outside: "sharps",
  spiral: 100,
  ringWidth: 80,
  highlightedCells: [],
  showKeySignatures: false,
  signatureSize: 100,
};

export function renderOptionsFor(
  settings: PlaygroundSettings,
): RenderCircleOfFifthsOptions {
  return {
    title: DEFAULT_TITLE,
    description: describeDiagram(settings),
    visibleNotes: visibleNotesFor(settings),
    labelSize: settings.labelSize,
    labelStacking: `${settings.outside}-outside`,
    labelSpiral: settings.spiral / 100,
    markBasicNotes: false,
    radii: radiiFor(settings),
    highlightedCells: settings.highlightedCells,
    showKeySignatures: settings.showKeySignatures,
    keySignatureScale: (SIGNATURE_SCALE * settings.signatureSize) / 100,
    labelFont: {
      family: `"Circle Notes", ${settings.font === "termes" ? "serif" : "sans-serif"}`,
      faces: noteFontFaces(settings.font, "Circle Notes"),
      letterAdvances: NOTE_FONT_LETTER_ADVANCES[settings.font],
    },
  };
}

const NOTE_DESCRIPTIONS: Readonly<Record<NoteMode, string>> = {
  basic: "the common spellings",
  single: "every spelling with at most one sharp or flat",
  all: "every spelling of each key",
  custom: "",
};

// What a screen reader announces for the SVG, so it follows the drawing.
export function describeDiagram(settings: PlaygroundSettings): string {
  const notes = settings.noteMode === "custom"
    ? `the notes ${settings.customNotes.join(", ")}`
    : NOTE_DESCRIPTIONS[settings.noteMode];
  const cells = settings.highlightedCells.length;
  return [
    `A ${settings.theme} circle of fifths with major keys on the outer ring and minor keys on the inner ring, showing ${notes}.`,
    cells > 0 ? `${cells} ${cells === 1 ? "cell is" : "cells are"} highlighted.` : "",
    settings.showKeySignatures ? "Treble and bass key signatures sit outside the circle." : "",
  ].filter(Boolean).join(" ");
}

export function visibleNotesFor(
  settings: PlaygroundSettings,
): readonly string[] | undefined {
  switch (settings.noteMode) {
    case "all":
      return undefined;
    case "basic":
      return BASIC_NOTE_LIST;
    case "single":
      return SINGLE_ACCIDENTAL_NOTES;
    case "custom":
      return settings.customNotes;
  }
}

/** Shows or hides one spelling, leaving the preset for the notes picked by hand. */
export function toggleNote(settings: PlaygroundSettings, note: string): PlaygroundSettings {
  const shown = new Set(visibleNotesFor(settings) ?? ALL_NOTES);
  if (!shown.delete(note)) shown.add(note);
  return { ...settings, noteMode: "custom", customNotes: ALL_NOTES.filter((name) => shown.has(name)) };
}

export function toggleCell(settings: PlaygroundSettings, { ring, hour }: HighlightedCell): PlaygroundSettings {
  const others = settings.highlightedCells.filter((cell) => cell.ring !== ring || cell.hour !== hour);
  return {
    ...settings,
    highlightedCells: others.length < settings.highlightedCells.length ? others : [...others, { ring, hour }],
  };
}

/** The cell under a point of the 1000-wide diagram, or null off the rings. */
export function cellAt(settings: PlaygroundSettings, x: number, y: number): HighlightedCell | null {
  const radius = Math.hypot(x - 500, y - 500);
  const { divider, inner } = radiiFor(settings);
  const ring = radius > divider && radius <= OUTER_RADIUS ? "outer"
    : radius > inner && radius <= divider ? "inner"
    : null;
  if (ring === null) return null;
  // Twelve o'clock is straight up and the hours run clockwise.
  const degrees = (Math.atan2(x - 500, 500 - y) * 180) / Math.PI;
  const hour = ((Math.round(degrees / 30) % 12) + 12) % 12;
  return { ring, hour: hour === 0 ? 12 : hour };
}

export function settingsFromSearch(search: string): PlaygroundSettings {
  const params = new URLSearchParams(search);
  const notes = params.get("notes") ?? "basic";
  const preset = (["basic", "single", "all"] as const).find((mode) => mode === notes);
  const number = (key: NumberSetting) => {
    const { param, min, max } = RANGES[key];
    const value = Number(params.get(param) ?? Number.NaN);
    return Number.isInteger(value) && value >= min && value <= max ? value : DEFAULT_SETTINGS[key];
  };

  return {
    theme: params.get("theme") === "dark" ? "dark" : "light",
    font: FONTS.find(({ id }) => id === params.get("font"))?.id ?? DEFAULT_SETTINGS.font,
    noteMode: preset ?? "custom",
    customNotes: preset === undefined ? ALL_NOTES.filter((note) => notes.split(",").includes(note)) : [],
    labelSize: number("labelSize"),
    outside: params.get("outside") === "flats" ? "flats" : "sharps",
    spiral: number("spiral"),
    ringWidth: number("ringWidth"),
    highlightedCells: params
      .getAll("highlight")
      .map(parseHighlight)
      .filter((cell): cell is HighlightedCell => cell !== null),
    showKeySignatures: params.get("signatures") === "1",
    signatureSize: number("signatureSize"),
  };
}

export function searchFromSettings(settings: PlaygroundSettings): string {
  const params = new URLSearchParams();
  if (settings.theme !== DEFAULT_SETTINGS.theme) params.set("theme", settings.theme);
  if (settings.font !== DEFAULT_SETTINGS.font) params.set("font", settings.font);
  if (settings.outside !== DEFAULT_SETTINGS.outside) params.set("outside", settings.outside);
  for (const [key, { param }] of Object.entries(RANGES) as [NumberSetting, (typeof RANGES)[NumberSetting]][]) {
    if (settings[key] !== DEFAULT_SETTINGS[key]) params.set(param, String(settings[key]));
  }
  if (settings.noteMode !== DEFAULT_SETTINGS.noteMode) {
    params.set("notes", settings.noteMode === "custom" ? settings.customNotes.join(",") : settings.noteMode);
  }
  if (settings.showKeySignatures) params.set("signatures", "1");
  for (const { ring, hour } of settings.highlightedCells) {
    params.append("highlight", `${ring}:${hour}`);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function parseHighlight(value: string): HighlightedCell | null {
  const match = /^(outer|inner):(12|[1-9]|1[01])$/.exec(value);
  if (!match) return null;
  return {
    ring: match[1] as DiagramRing,
    hour: Number(match[2]),
  };
}
