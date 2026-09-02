// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// FSRS scheduling (ts-fsrs) plus Anki-style day arithmetic: like Anki, the
// study day rolls over at 04:00 local time, not midnight.

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
} from "ts-fsrs";

import type { FsrsCardJson } from "./db";

export { Rating, State, type FsrsCard, type Grade };

export const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export const DAY_START_HOUR = 4;

export function dayNumber(date: Date): number {
  const studyDate = new Date(date);
  if (studyDate.getHours() < DAY_START_HOUR) {
    studyDate.setDate(studyDate.getDate() - 1);
  }
  return Math.floor(
    Date.UTC(
      studyDate.getFullYear(),
      studyDate.getMonth(),
      studyDate.getDate(),
    ) / 86_400_000,
  );
}

// The next 04:00 local-time boundary strictly after `now`.
export function endOfStudyDay(now: Date): Date {
  const boundary = new Date(now);
  boundary.setHours(DAY_START_HOUR, 0, 0, 0);
  if (boundary.getTime() <= now.getTime()) {
    boundary.setDate(boundary.getDate() + 1);
  }
  return boundary;
}

// The most recent 04:00 local-time boundary at or before `now`.
export function startOfStudyDay(now: Date): Date {
  const boundary = new Date(now);
  boundary.setHours(DAY_START_HOUR, 0, 0, 0);
  if (boundary.getTime() > now.getTime()) {
    boundary.setDate(boundary.getDate() - 1);
  }
  return boundary;
}

export function newEmptyCard(now: Date): FsrsCard {
  return createEmptyCard(now);
}

export function scheduleAnswer(
  card: FsrsCard,
  grade: Grade,
  now: Date,
): { card: FsrsCard; ratedAt: Date } {
  const record = scheduler.repeat(card, now)[grade];
  return { card: record.card, ratedAt: now };
}

// Interval preview for each answer button, e.g. { 1: "<1m", ..., 4: "4d" }.
export function previewDueDates(
  card: FsrsCard,
  now: Date,
): Record<Grade, Date> {
  const record = scheduler.repeat(card, now);
  return {
    [Rating.Again]: record[Rating.Again].card.due,
    [Rating.Hard]: record[Rating.Hard].card.due,
    [Rating.Good]: record[Rating.Good].card.due,
    [Rating.Easy]: record[Rating.Easy].card.due,
  };
}

export function isLearningState(state: State): boolean {
  return state === State.Learning || state === State.Relearning;
}

export function serializeFsrsCard(card: FsrsCard): FsrsCardJson {
  const out: Record<string, number | string | null> = {};
  for (const [key, value] of Object.entries(card)) {
    if (value === undefined) continue;
    out[key] = value instanceof Date ? value.getTime() : (value as number);
  }
  return out;
}

export function deserializeFsrsCard(json: FsrsCardJson): FsrsCard {
  const out: Record<string, unknown> = { ...json };
  if (typeof out.due === "number") out.due = new Date(out.due);
  if (typeof out.last_review === "number") {
    out.last_review = new Date(out.last_review);
  }
  return out as unknown as FsrsCard;
}
