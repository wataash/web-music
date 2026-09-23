// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { IrealSong } from "@web-music/ireal";

export type ChartFeatures = {
  order: number; id: string; title: string; composer: string; key: string;
  timeSignature: string | null;
  measures: number; rows: number; sections: string[];
  mainChords: number; maxMainChordsPerMeasure: number;
  slashChords: number; alternateChords: number; narrowChords: number;
  endRepeats: number; endingNumbers: number[]; endingSpansRows: boolean;
  repeatPreviousMeasure: number; repeatPreviousTwoMeasures: number; repeatPreviousChord: number;
  segno: number; coda: number; fermata: number; playbackEnd: number;
  notes: number; timeSignatureChanges: number; rowGaps: number; lastRowMeasures: number;
  remarks: string;
};
export type ChartFeaturesReport = {
  source: string; playlist: string; songCount: number;
  // The requested song limit, or null when every song was analyzed.
  limit: number | null;
  songs: ChartFeatures[];
};
export type ChartFeatureColumn = { key: keyof ChartFeatures; header: string };
export type ChartFeatureOptions = { limit?: number; source?: string; remarks?: Record<string, string> };

export const CHART_FEATURE_COLUMNS: readonly ChartFeatureColumn[];
export function songChartFeatures(song: IrealSong, order: number): ChartFeatures;
export function playlistChartFeatures(
  playlist: { name: string; songs: IrealSong[]; errors: { title: string; message: string }[] },
  options?: ChartFeatureOptions,
): ChartFeaturesReport;
export function chartFeaturesFromHtml(html: string, options?: ChartFeatureOptions): ChartFeaturesReport;
export function chartFeaturesCsv(features: ChartFeaturesReport): string;
