// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IREAL_MUSIC_PREFIX, scramble } from "@web-music/ireal";

import { chartFeaturesCsv, chartFeaturesFromHtml } from "./chart-features.js";

// A playlist page as iReal Pro shares one: the music of each song is scrambled
// behind a link, so the fixtures exercise the real extraction path.
function playlistHtml(songs, name = "Fixture playlist") {
  const entries = songs.map(({ title, composer = "Fixture composer", key = "C", music }) =>
    [title, composer, "", "Medium Swing", key, "", IREAL_MUSIC_PREFIX + scramble(music)].join("="));
  const payload = `${entries.join("===")}===${name}`;
  return `<html><body><a href="irealb://${encodeURIComponent(payload)}">${name}</a></body></html>`;
}

function features(music, song = {}) {
  const report = chartFeaturesFromHtml(playlistHtml([{ title: "Fixture", music, ...song }]));
  return report.songs[0];
}

describe("chart features", () => {
  it("counts the blank half of a two-bar repeat as a measure", () => {
    // |: C | A-7 | 𝄎 |    :|  — the fourth bar carries no cell of its own but
    // is the second measure the two-bar repeat plays.
    const song = features("{*AT44C   |A-7   |r   |    }");

    assert.equal(song.measures, 4);
    assert.equal(song.repeatPreviousTwoMeasures, 1);
    assert.equal(song.mainChords, 2);
    assert.equal(song.maxMainChordsPerMeasure, 1);
    assert.equal(song.endRepeats, 1);
    assert.equal(song.rows, 1);
    assert.equal(song.lastRowMeasures, 4);
  });

  it("leaves a blank bar out when no repeat precedes it", () => {
    const song = features("{*AT44C   |A-7   |D-7   |    }");

    assert.equal(song.measures, 3);
    assert.equal(song.repeatPreviousTwoMeasures, 0);
  });

  it("counts a measure that wraps onto the next row only once", () => {
    // Five-cell measures: the fourth starts in the last cell of the first row
    // and finishes on the second row, and the ending bracket runs with it.
    const song = features("[*AT44N1C    |F7    |G7    |A-7    Z");

    assert.equal(song.rows, 2);
    assert.equal(song.measures, 4);
    assert.equal(song.lastRowMeasures, 1);
    assert.deepEqual(song.endingNumbers, [1]);
    assert.equal(song.endingSpansRows, true);
  });

  it("reads the written symbols, spacings and sections", () => {
    const song = features(
      "[*AT44SC^7   |F7/A   |D-7 G7(Db7) |sBb7b9   l|Y*BT34A-7   |T34D7   |QT44G7   f|<Note>C6 U  Z",
      { title: "Symbols", composer: "Fixture, Jr.", key: "Bb" },
    );

    assert.deepEqual(song.sections, ["A", "B"]);
    assert.equal(song.rows, 2);
    assert.equal(song.measures, 8);
    assert.equal(song.mainChords, 9);
    assert.equal(song.maxMainChordsPerMeasure, 2);
    assert.equal(song.alternateChords, 1);
    assert.equal(song.slashChords, 1);
    assert.equal(song.narrowChords, 1);
    assert.equal(song.segno, 1);
    assert.equal(song.coda, 1);
    assert.equal(song.fermata, 1);
    assert.equal(song.playbackEnd, 1);
    assert.equal(song.notes, 1);
    assert.equal(song.rowGaps, 1);
    assert.equal(song.lastRowMeasures, 4);
    assert.equal(song.key, "Bb");
    assert.equal(song.composer, "Fixture, Jr.");
  });

  it("counts a time signature change only when the signature differs", () => {
    // 4/4, then 3/4, then 3/4 again, then back to 4/4.
    const song = features("[*AT44C   |T34A-7   |T34D7   |T44G7   Z");

    assert.equal(song.timeSignature, "4/4");
    assert.equal(song.timeSignatureChanges, 2);
  });

  it("leaves the time signature unknown when the chart states none", () => {
    const song = features("*AC   |F7   |C   |G7   Z");

    assert.equal(song.timeSignature, null);
    assert.equal(song.timeSignatureChanges, 0);
  });

  it("keeps the playlist order and honours the limit", () => {
    const html = playlistHtml([
      { title: "First", music: "*AT44C   Z" },
      { title: "Second", music: "*AT44F7   Z" },
      { title: "Third", music: "*AT44G7   Z" },
    ]);

    const report = chartFeaturesFromHtml(html, { limit: 2, source: "fixture.html" });

    assert.equal(report.playlist, "Fixture playlist");
    assert.equal(report.songCount, 3);
    assert.equal(report.limit, 2);
    assert.equal(report.source, "fixture.html");
    assert.deepEqual(report.songs.map(song => [song.order, song.title]), [[1, "First"], [2, "Second"]]);
  });

  it("reports a chart it cannot extract instead of dropping it", () => {
    const html = playlistHtml([{ title: "Broken", music: "*AT44C   |%%%|G7   Z" }]);

    assert.throws(() => chartFeaturesFromHtml(html), /Broken.*could not be extracted|could not be extracted.*Broken/s);
  });

  it("writes machine-readable CSV with escaped fields", () => {
    const report = chartFeaturesFromHtml(playlistHtml([
      { title: 'Comma, "quote"\nnewline', music: "*AC   |F7   Z" },
    ]));
    const csv = chartFeaturesCsv(report);
    const [header, ...rest] = csv.split("\n");

    assert.equal(header.split(",")[0], "Order");
    assert.ok(header.includes("Last row measures"));
    assert.match(header, /^[A-Za-z ,]+$/);
    // The quoted title keeps its comma, doubled quotes and newline.
    assert.ok(csv.includes('"Comma, ""quote""\nnewline"'));
    // Empty for an unknown time signature, true/false for the flag, and a
    // space-separated list for the sections.
    assert.ok(rest.join("\n").includes(",,2,1,A,"));
    assert.ok(rest.join("\n").includes(",false,"));
    assert.equal(csv.at(-1), "\n");
  });
});
