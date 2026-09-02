// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { BASIC_NOTES, POSITIONS } from "@circle-of-fifths/core";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  type DiagramRing,
  type HighlightedCell,
  type LabelLayout,
  type RenderCircleOfFifthsOptions,
} from "@circle-of-fifths/svg";

export type Theme = "light" | "dark";
export type NoteMode =
  | "all"
  | "basic"
  | "one-per-cell"
  | "none"
  | "custom";

export type PlaygroundSettings = Readonly<{
  theme: Theme;
  noteMode: NoteMode;
  customNotes: string;
  labelLayout: LabelLayout;
  highlightedCells: readonly HighlightedCell[];
  showKeySignatures: boolean;
  title: string;
  description: string;
}>;

export const BASIC_NOTE_LIST = [
  ...BASIC_NOTES.major,
  ...BASIC_NOTES.minor,
] as const;

const basicNotes = {
  major: new Set<string>(BASIC_NOTES.major),
  minor: new Set<string>(BASIC_NOTES.minor),
};

export const ONE_NOTE_PER_CELL = POSITIONS.flatMap((position) => [
  position.major.find((note) => basicNotes.major.has(note)) ?? position.major[0],
  position.minor.find((note) => basicNotes.minor.has(note)) ?? position.minor[0],
]);

export const DEFAULT_SETTINGS: PlaygroundSettings = {
  theme: "light",
  noteMode: "all",
  customNotes: ONE_NOTE_PER_CELL.join(" "),
  labelLayout: "standard",
  highlightedCells: [],
  showKeySignatures: false,
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
};

export function renderOptionsFor(
  settings: PlaygroundSettings,
): RenderCircleOfFifthsOptions {
  return {
    title: settings.title,
    description: settings.description,
    visibleNotes: visibleNotesFor(settings),
    labelLayout: settings.labelLayout,
    highlightedCells: settings.highlightedCells,
    showKeySignatures: settings.showKeySignatures,
  };
}

export function visibleNotesFor(
  settings: PlaygroundSettings,
): readonly string[] | undefined {
  switch (settings.noteMode) {
    case "all":
      return undefined;
    case "basic":
      return BASIC_NOTE_LIST;
    case "one-per-cell":
      return ONE_NOTE_PER_CELL;
    case "none":
      return [];
    case "custom":
      return splitNotes(settings.customNotes);
  }
}

export function splitNotes(value: string): readonly string[] {
  return [...new Set(value.split(/[\s,]+/).filter(Boolean))];
}

export function settingsFromSearch(search: string): PlaygroundSettings {
  const params = new URLSearchParams(search);
  const theme = params.get("theme");
  const layout = params.get("layout");
  const notes = params.get("notes");

  const labelLayout =
    layout === "single-note" ? "single-note" : "standard";
  const parsedNoteMode = noteModeFrom(notes);

  return {
    theme: theme === "dark" ? "dark" : "light",
    noteMode:
      labelLayout === "single-note" &&
      (parsedNoteMode === "all" || parsedNoteMode === "basic")
        ? "one-per-cell"
        : parsedNoteMode,
    customNotes:
      notes && !["all", "basic", "one-per-cell", "none"].includes(notes)
        ? notes.split(",").join(" ")
        : DEFAULT_SETTINGS.customNotes,
    labelLayout,
    highlightedCells: params
      .getAll("highlight")
      .map(parseHighlight)
      .filter((cell): cell is HighlightedCell => cell !== null),
    showKeySignatures: params.get("signatures") === "1",
    title: params.get("title") ?? DEFAULT_TITLE,
    description: params.get("description") ?? DEFAULT_DESCRIPTION,
  };
}

export function searchFromSettings(settings: PlaygroundSettings): string {
  const params = new URLSearchParams();
  if (settings.theme !== DEFAULT_SETTINGS.theme) {
    params.set("theme", settings.theme);
  }
  if (settings.labelLayout !== DEFAULT_SETTINGS.labelLayout) {
    params.set("layout", settings.labelLayout);
  }
  if (settings.noteMode !== DEFAULT_SETTINGS.noteMode) {
    params.set(
      "notes",
      settings.noteMode === "custom"
        ? splitNotes(settings.customNotes).join(",")
        : settings.noteMode,
    );
  }
  if (settings.showKeySignatures) params.set("signatures", "1");
  for (const { ring, hour } of settings.highlightedCells) {
    params.append("highlight", `${ring}:${hour}`);
  }
  if (settings.title !== DEFAULT_TITLE) params.set("title", settings.title);
  if (settings.description !== DEFAULT_DESCRIPTION) {
    params.set("description", settings.description);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function noteModeFrom(value: string | null): NoteMode {
  if (value === null || value === "all") return "all";
  if (value === "basic" || value === "one-per-cell" || value === "none") {
    return value;
  }
  return "custom";
}

function parseHighlight(value: string): HighlightedCell | null {
  const match = /^(outer|inner):(12|[1-9]|1[01])$/.exec(value);
  if (!match) return null;
  return {
    ring: match[1] as DiagramRing,
    hour: Number(match[2]),
  };
}
