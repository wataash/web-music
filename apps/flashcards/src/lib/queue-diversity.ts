// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { NoteRow } from "./db";
import { intervalAnswerNote } from "./interval-pair-selection";
import { pitchClassOf } from "./card-audio";
import { guitarIntervalLevel } from "./guitar-interval-selection";

export function supportsDiversity(note: NoteRow): boolean {
  return ["interval", "identification", "guitar-interval"].includes(note.fields[1]);
}

export function introductionGroup(note: NoteRow): string {
  return `${note.pkg}:${note.fields[1]}:${note.fields[1] === "guitar-interval" ? guitarIntervalLevel(note) : note.fields[3]}`;
}

function features(note: NoteRow): readonly (string | null)[] {
  const f = note.fields;
  if (f[1] === "guitar-interval") {
    return [f[5], f[5], f[2], `${Number(f[3]) - Number(f[2])}:${f[4]}`];
  }
  const root = pitchClassOf(f[2]);
  const target = pitchClassOf(intervalAnswerNote(note));
  const distance = root !== null && target !== null ? (target - root + 12) % 12 : null;
  return [f[1] === "identification" ? (distance === null ? null : `degree:${distance}`) : (target === null ? null : `pitch:${target}`),
    distance === null ? null : `degree:${distance}`, root === null ? null : `pitch:${root}`, null];
}

export function similarity(note: NoteRow, recent: readonly NoteRow[]): number {
  const current = features(note);
  return recent.slice(0, 3).reduce((sum, previous, index) => {
    if (previous.fields[1] !== note.fields[1]) return sum;
    const old = features(previous);
    const weights = [8, 6, 2, 4];
    const score = current.reduce<number>((value, feature, i) =>
      value + (feature !== null && feature === old[i] ? weights[i] : 0), 0);
    return sum + (3 - index) * (score + (note.guid === previous.guid ? 100 : 0));
  }, 0);
}

export function diverseIndex(notes: readonly NoteRow[], recent: readonly NoteRow[], random = Math.random): number {
  if (notes.length < 2 || recent.length === 0) return 0;
  const scores = notes.map((note) => similarity(note, recent));
  const best = Math.min(...scores);
  const tied = scores.flatMap((score, index) => score === best ? [index] : []);
  return tied[Math.min(tied.length - 1, Math.floor(random() * tied.length))];
}
