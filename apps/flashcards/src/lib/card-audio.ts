// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// What a card sounds like: the note it answers with, and the note under a
// finger on the keyboard or the neck. A card names its answer in letters, and
// a drawing names its keys and cells in strings and frets; both come back from
// here as MIDI semitones, which is all the synthesiser wants.

import { guitarSemitone } from "@web-music/practice-ui/guitar";
export { guitarSemitone, GUITAR_OPEN_STRINGS } from "@web-music/practice-ui/guitar";
import type { NoteRow } from "./db";
import { isGuitarIntervalCard } from "./guitar-interval-selection";
import { intervalAnswerNote, isIntervalCard } from "./interval-pair-selection";
import type { Instrument } from "@web-music/practice-ui/tones";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NATURAL_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;


// `Guitar Intervals` draws the neck around the root rather than at a fret
// number: the shape is the same wherever it is played. A sound is not — it has
// to be played somewhere — so the root is put at the seventh fret. The board
// reaches six frets either way, and from there every one of them is on the
// neck rather than behind the nut.
export const GUITAR_INTERVAL_ROOT_FRET = 7;


// A tap on a drawing, as the card names the place that was touched: a key
// that knows its own pitch, a cell at a fret, or a cell so many frets from a
// root whose own fret the card never says.
export type CardTap =
  | Readonly<{ kind: "key"; semitone: number }>
  | Readonly<{ kind: "fret"; string: number; fret: number }>
  | Readonly<{ kind: "fret-offset"; string: number; offset: number }>;

export type CardSound = Readonly<{
  instrument: Instrument;
  semitones: readonly number[];
}>;

// Reveal an interval with its root first, then the tapped pitch and any
// unanswered target. A correct tap supplies the target at its chosen octave.
export function tappedAnswerSound(
  taps: readonly CardTap[],
  answer: CardSound | null,
  interval: boolean,
): CardSound {
  const tapped = taps.flatMap((tap) => tapSound(tap) ?? []);
  const played = [...new Set(tapped.flatMap(({ semitones }) => semitones))];
  const prefix = interval ? answer?.semitones.slice(0, 1) ?? [] : [];
  const targets = interval
    ? answer?.semitones.slice(1) ?? []
    : answer?.semitones ?? [];
  const eitherOctave = interval && answer?.instrument === "piano";
  const remaining = targets.filter((pitch) =>
    !played.some((tap) => eitherOctave ? (tap - pitch) % 12 === 0 : tap === pitch),
  );
  return {
    instrument: (answer ?? tapped[0])?.instrument ?? "piano",
    semitones: [
      ...prefix,
      ...played.filter((pitch) => !prefix.includes(pitch)),
      ...new Set(remaining),
    ],
  };
}


export function tapSound(tap: CardTap): CardSound | null {
  if (tap.kind === "key") {
    return { instrument: "piano", semitones: [tap.semitone] };
  }
  const fret =
    tap.kind === "fret" ? tap.fret : GUITAR_INTERVAL_ROOT_FRET + tap.offset;
  const semitone = guitarSemitone(tap.string, fret);
  return semitone === null
    ? null
    : { instrument: "guitar", semitones: [semitone] };
}

// What the card plays when it is turned over. Every deck answers with a note
// somewhere — a name, a key, a position on the neck — except those that
// answer with the name of a distance, which have no pitch of their own.
export function answerSound(
  note: Pick<NoteRow, "fields" | "tags">,
): CardSound | null {
  if (isIntervalCard(note)) return intervalAnswerSound(note);
  if (isGuitarIntervalCard(note)) return guitarIntervalAnswerSound(note);
  if (isFretboardCard(note)) return fretboardAnswerSound(note);
  if (isStaffCard(note)) return staffAnswerSound(note);
  return null;
}

function isFretboardCard(note: Pick<NoteRow, "tags">): boolean {
  const tags = note.tags.split(/\s+/);
  return (
    tags.includes("direction::position-to-note") ||
    tags.includes("direction::note-to-positions")
  );
}

function isStaffCard(note: Pick<NoteRow, "tags">): boolean {
  const tags = note.tags.split(/\s+/);
  return (
    tags.includes("direction::staff-to-note") ||
    tags.includes("direction::note-to-staff")
  );
}

// The keyboard puts every root in the octave from middle C up and marks the
// answer on either side of it; the one above is the interval as the card
// names it, so that is the one it sounds.
function intervalAnswerSound(
  note: Pick<NoteRow, "fields">,
): CardSound | null {
  const root = pitchClassOf(note.fields[2] ?? "");
  const answer = pitchClassOf(intervalAnswerNote(note));
  if (root === null || answer === null) return null;
  const rootSemitone = 60 + root;
  const above = mod12(answer - root) || 12;
  return { instrument: "piano", semitones: [rootSemitone, rootSemitone + above] };
}

function guitarIntervalAnswerSound(
  note: Pick<NoteRow, "fields">,
): CardSound | null {
  const targetString = Number(note.fields[3]);
  const offset = Number(note.fields[4]);
  if (!Number.isInteger(targetString) || !Number.isInteger(offset)) return null;
  const root = guitarSemitone(Number(note.fields[2]), GUITAR_INTERVAL_ROOT_FRET);
  const target = guitarSemitone(targetString, GUITAR_INTERVAL_ROOT_FRET + offset);
  return root === null || target === null
    ? null
    : { instrument: "guitar", semitones: [root, target] };
}

// One card names a position and answers with its note; the other names a note
// and answers with every position it has on one string, which is a run up the
// neck rather than a single note.
function fretboardAnswerSound(
  note: Pick<NoteRow, "fields">,
): CardSound | null {
  const guitarString = Number(note.fields[2]);
  const fret = Number(note.fields[3]);
  if (Number.isInteger(fret) && (note.fields[3] ?? "") !== "") {
    const semitone = guitarSemitone(guitarString, fret);
    return semitone === null
      ? null
      : { instrument: "guitar", semitones: [semitone] };
  }
  const semitones = (note.fields[7] ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((position) => {
      const [written, writtenFret] = position.split("-");
      const semitone = guitarSemitone(Number(written), Number(writtenFret));
      return semitone === null ? [] : [semitone];
    });
  return semitones.length === 0
    ? null
    : { instrument: "guitar", semitones };
}

function staffAnswerSound(note: Pick<NoteRow, "fields">): CardSound | null {
  const semitone = semitoneOfPitch(note.fields[2] ?? "");
  return semitone === null
    ? null
    : { instrument: "piano", semitones: [semitone] };
}

// A note name, written the way the decks write one: a letter and as many
// accidentals as the spelling needs, in symbols or in ASCII.
export function pitchClassOf(name: string): number | null {
  const match = /^([A-G])(bb|##|b|#)?$/.exec(normalizeName(name));
  if (match === null) return null;
  const accidental = { bb: -2, b: -1, "": 0, "#": 1, "##": 2 }[match[2] ?? ""];
  return mod12(NATURAL_SEMITONES[LETTERS.indexOf(match[1] as "C")] + accidental!);
}

// The same, with the octave the staff decks write after it: C4 is middle C, as
// MIDI numbers it 60.
export function semitoneOfPitch(pitch: string): number | null {
  const match = /^([A-G](?:bb|##|b|#)?)(-?\d+)$/.exec(normalizeName(pitch));
  if (match === null) return null;
  const pitchClass = pitchClassOf(match[1]);
  if (pitchClass === null) return null;
  return (Number(match[2]) + 1) * 12 + pitchClass;
}

function normalizeName(value: string): string {
  return value
    .trim()
    .replaceAll("𝄫", "bb")
    .replaceAll("𝄪", "##")
    .replaceAll("♭", "b")
    .replaceAll("♯", "#");
}

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}
