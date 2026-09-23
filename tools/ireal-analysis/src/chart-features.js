// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { extractIrealPlaylist } from "@web-music/ireal";
import { songIdentity, validateRemarks } from "./chart-remarks.js";

// The app itself owns the row layout, so the counts here follow whatever the
// chart screen draws rather than a second implementation of the 16-cell grid.
import { layoutIreal } from "../../../apps/chords/src/lib/ireal-layout.ts";

// iReal's notation grid is sixteen cells wide (see ireal-layout.ts).
const CELLS = 16;

// Symbols as `irealScore` spells them, so a token is identified the same way
// the layout identifies it.
const REPEAT_MEASURE = "％";
const REPEAT_TWO_MEASURES = "𝄎";
const REPEAT_CHORD = "/";
const SEGNO = "𝄋";
const CODA = "𝄌";
const FERMATA = "𝄐";
const PLAYBACK_END = "END";
const TIME_SIGNATURE = "Time signature";

// The CSV columns, in order. `key` is the JSON field; `header` is the heading.
export const CHART_FEATURE_COLUMNS = [
  { key: "order", header: "Order" },
  { key: "id", header: "Song ID" },
  { key: "title", header: "Title" },
  { key: "composer", header: "Composer" },
  { key: "key", header: "Key" },
  { key: "timeSignature", header: "Time signature" },
  { key: "measures", header: "Measures" },
  { key: "rows", header: "Rows" },
  { key: "sections", header: "Sections" },
  { key: "mainChords", header: "Main chords" },
  { key: "maxMainChordsPerMeasure", header: "Max main chords per measure" },
  { key: "slashChords", header: "Slash chords" },
  { key: "alternateChords", header: "Alternate chords" },
  { key: "narrowChords", header: "Narrow chords" },
  { key: "endRepeats", header: "End repeats" },
  { key: "endingNumbers", header: "Ending numbers" },
  { key: "endingSpansRows", header: "Ending spans rows" },
  { key: "repeatPreviousMeasure", header: "Repeat previous measure" },
  { key: "repeatPreviousTwoMeasures", header: "Repeat previous two measures" },
  { key: "repeatPreviousChord", header: "Repeat previous chord" },
  { key: "segno", header: "Segno" },
  { key: "coda", header: "Coda" },
  { key: "fermata", header: "Fermata" },
  { key: "playbackEnd", header: "Playback end" },
  { key: "notes", header: "Notes" },
  { key: "timeSignatureChanges", header: "Time signature changes" },
  { key: "rowGaps", header: "Row gaps" },
  { key: "lastRowMeasures", header: "Last row measures" },
  { key: "remarks", header: "Remarks" },
];

function symbolText(item) {
  return item.token.kind === "symbol" ? item.token.text ?? "" : "";
}

// A written measure: the span between two barlines that holds a chord or a
// repeat symbol. Repeats are not expanded, so a measure is counted once even
// when the layout wraps it onto the next row. The bar after a two-bar repeat
// is the second half of that repeat: it is empty on the page but is a measure.
function measureSpans(rows) {
  const located = rows.flatMap((row, index) => row.items.map(item => ({ item, at: index * CELLS + item.column })));
  const bars = located.filter(({ item }) => item.token.kind === "bar").map(({ at }) => at);
  const edges = [...new Set([0, ...bars, rows.length * CELLS])].sort((a, b) => a - b);
  const spans = [];
  let repeated = false;
  for (let index = 0; index < edges.length - 1; index++) {
    const [start, end] = [edges[index], edges[index + 1]];
    const cells = located.filter(({ at, item }) => at >= start && at < end && item.token.kind !== "bar");
    const chords = cells.filter(({ item }) => item.token.kind === "chord" && !item.alternate).length;
    const hasRepeat = cells.some(({ item }) => [REPEAT_MEASURE, REPEAT_TWO_MEASURES, REPEAT_CHORD].includes(symbolText(item)));
    if (chords || hasRepeat || repeated) spans.push({ end, chords });
    repeated = cells.some(({ item }) => symbolText(item) === REPEAT_TWO_MEASURES);
  }
  return spans;
}

export function songChartFeatures(song, order) {
  const rows = layoutIreal(song.score.blocks);
  const items = rows.flatMap(row => row.items);
  const chords = items.filter(item => item.token.kind === "chord");
  const symbols = text => items.filter(item => symbolText(item) === text).length;
  const spans = measureSpans(rows);
  const lastRow = (rows.length - 1) * CELLS;

  // The first written time signature, and every later one that differs from
  // the signature then in force. A chart that never states one stays null.
  let timeSignature = null;
  let inForce = null;
  let timeSignatureChanges = 0;
  for (const item of items) {
    if (item.token.label !== TIME_SIGNATURE) continue;
    const value = item.token.text ?? "";
    timeSignature ??= value;
    if (inForce !== null && value !== inForce) timeSignatureChanges++;
    inForce = value;
  }

  const endings = rows.flatMap(row => row.endings);
  return {
    order,
    id: songIdentity(song),
    title: song.title,
    composer: song.artist,
    key: song.originalKey,
    timeSignature,
    measures: spans.length,
    rows: rows.length,
    sections: items.filter(item => item.token.kind === "section").map(item => item.token.text ?? ""),
    mainChords: chords.filter(item => !item.alternate).length,
    maxMainChordsPerMeasure: spans.reduce((most, span) => Math.max(most, span.chords), 0),
    slashChords: chords.filter(item => /\/[A-G]/.test(item.token.raw ?? "")).length,
    alternateChords: chords.filter(item => item.alternate).length,
    narrowChords: chords.filter(item => item.token.narrow === true).length,
    endRepeats: items.filter(item => item.token.kind === "bar" && item.token.raw === "}").length,
    endingNumbers: endings.filter(ending => ending.begins).map(ending => Number(ending.label)),
    endingSpansRows: endings.some(ending => !ending.begins),
    repeatPreviousMeasure: symbols(REPEAT_MEASURE),
    repeatPreviousTwoMeasures: symbols(REPEAT_TWO_MEASURES),
    repeatPreviousChord: symbols(REPEAT_CHORD),
    segno: symbols(SEGNO),
    coda: symbols(CODA),
    fermata: symbols(FERMATA),
    playbackEnd: symbols(PLAYBACK_END),
    notes: items.filter(item => item.token.kind === "comment" && (item.token.text ?? "").trim() !== "").length,
    timeSignatureChanges,
    rowGaps: song.score.blocks.flat().filter(token => token.kind === "break").length,
    lastRowMeasures: spans.filter(span => span.end > lastRow).length,
    remarks: "",
  };
}

export function playlistChartFeatures(playlist, { limit = Infinity, source = "", remarks = {} } = {}) {
  // A chart that cannot be read is a gap in the survey, not a row to drop.
  if (playlist.errors.length) {
    const listed = playlist.errors.slice(0, 5).map(error => `${error.title}: ${error.message}`).join("; ");
    throw new Error(`${playlist.errors.length} song(s) could not be extracted: ${listed}`);
  }
  const validIds = new Set();
  for (const song of playlist.songs) {
    const id = songIdentity(song);
    if (validIds.has(id)) throw new Error(`Duplicate song identity: "${song.title}" (${id})`);
    validIds.add(id);
  }
  const entries = validateRemarks(remarks, validIds);
  const songs = playlist.songs.slice(0, limit).map((song, index) => {
    try {
      const features = songChartFeatures(song, index + 1);
      if (Object.hasOwn(entries, features.id)) features.remarks = entries[features.id];
      return features;
    } catch (error) {
      throw new Error(`Cannot analyze "${song.title}": ${error.message}`, { cause: error });
    }
  });
  return {
    source,
    playlist: playlist.name,
    songCount: playlist.songs.length,
    limit: Number.isFinite(limit) ? limit : null,
    songs,
  };
}

export function chartFeaturesFromHtml(html, options = {}) {
  return playlistChartFeatures(extractIrealPlaylist(html), options);
}

// Plain RFC 4180 text: numbers and true/false unquoted, arrays space
// separated, an absent value empty, and a comma, quote or newline quoted.
function csvField(value) {
  const text = Array.isArray(value) ? value.join(" ") : String(value ?? "");
  return /["\n\r,]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function chartFeaturesCsv(features) {
  const lines = [CHART_FEATURE_COLUMNS.map(column => column.header).join(",")];
  for (const song of features.songs) lines.push(CHART_FEATURE_COLUMNS.map(column => csvField(song[column.key])).join(","));
  return `${lines.join("\n")}\n`;
}
