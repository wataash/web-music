// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The undo queue, modelled on Anki's (rslib/src/undo, AGPL-3.0-or-later, and
// the way AnkiDroid presents it): a named operation opens a step, every write
// it makes saves the row it replaced into that step, and the step joins a
// queue capped at thirty. Undoing puts those rows back in reverse order and
// keeps what they replaced as a redo step, so undo and redo are the same
// walk in opposite directions.
//
// Where Anki keeps Added, Updated and Removed apart, one before-image covers
// all three: a row that was not there is undone by deleting it again.
//
// Nothing is written to disk. Anki's queue lives as long as the open
// collection; this one lives as long as the open tab, and a reload starts
// empty rather than offering to undo work the reader has stopped thinking
// about.

import { dailyLimitsSnapshot, restoreDailyLimits } from "./daily-limits";
import { db, type RevlogRow, type StateRow } from "./db";

const UNDO_LIMIT = 30;

export type UndoOp = "answerCard" | "customStudy" | "resetProgress";

// Anki names an operation and translates the name where it is shown, as in
// "Undo Answer Card" and "Answer Card undone".
const OP_LABELS: Readonly<Record<UndoOp, string>> = {
  answerCard: "Answer Card",
  customStudy: "Custom Study",
  resetProgress: "Reset study progress",
};

export function describeUndoOp(op: UndoOp): string {
  return OP_LABELS[op];
}

type UndoableChange =
  | Readonly<{ table: "states"; key: string; before?: StateRow }>
  | Readonly<{ table: "revlog"; id: number; before?: RevlogRow }>
  | Readonly<{ table: "dailyLimits"; before: string | null }>;

type UndoStep = Readonly<{ op: UndoOp; changes: UndoableChange[] }>;

let currentStep: UndoStep | null = null;
// Most recent first, so the cap is a truncation.
let undoSteps: UndoStep[] = [];
let redoSteps: UndoStep[] = [];
const listeners = new Set<() => void>();

export type UndoStatus = Readonly<{ undo: UndoOp | null; redo: UndoOp | null }>;

export function undoStatus(): UndoStatus {
  return { undo: undoSteps[0]?.op ?? null, redo: redoSteps.at(-1)?.op ?? null };
}

export function subscribeUndoStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

// For writes that go round this module — restoring a backup rewrites the rows
// the queue holds before-images of, and undoing to them afterwards would put
// the reader back somewhere they never were.
export function clearUndoQueue(): void {
  currentStep = null;
  undoSteps = [];
  redoSteps = [];
  notify();
}

// One step per operation: a step already open swallows the changes rather
// than starting a second, which is how Anki's nested transactions behave.
export async function undoableOp<T>(
  op: UndoOp,
  body: () => Promise<T>,
): Promise<T> {
  if (currentStep) return body();
  const step: UndoStep = { op, changes: [] };
  currentStep = step;
  try {
    const result = await body();
    if (step.changes.length > 0) {
      undoSteps = [step, ...undoSteps].slice(0, UNDO_LIMIT);
      // A new operation is a fork: what was undone cannot be redone onto it.
      redoSteps = [];
    }
    return result;
  } finally {
    currentStep = null;
    notify();
  }
}

function saveUndo(change: UndoableChange): void {
  currentStep?.changes.push(change);
}

export async function putStateUndoable(row: StateRow): Promise<void> {
  saveUndo({
    table: "states",
    key: row.key,
    before: await db.states.get(row.key),
  });
  await db.states.put(row);
}

export async function deleteStatesUndoable(
  keys: readonly string[],
): Promise<void> {
  for (const row of await db.states.bulkGet([...keys])) {
    if (row) saveUndo({ table: "states", key: row.key, before: row });
  }
  await db.states.bulkDelete([...keys]);
}

export async function addRevlogUndoable(row: RevlogRow): Promise<void> {
  const id = await db.revlog.add(row);
  saveUndo({ table: "revlog", id });
}

export async function deleteRevlogUndoable(
  keys: readonly string[],
): Promise<void> {
  const rows = await db.revlog.where("key").anyOf([...keys]).toArray();
  const ids: number[] = [];
  for (const row of rows) {
    if (row.id === undefined) continue;
    saveUndo({ table: "revlog", id: row.id, before: row });
    ids.push(row.id);
  }
  await db.revlog.bulkDelete(ids);
}

// The whole item rather than one deck's entry: it is a few dozen bytes, and
// what a limit was is not derivable from what it became.
export function saveDailyLimitsUndo(): void {
  saveUndo({ table: "dailyLimits", before: dailyLimitsSnapshot() });
}

// Applied in reverse, so a step that touched a row twice ends on the value it
// had before the first touch. What each change replaces becomes the step that
// walks back the other way.
async function applyChanges(
  changes: readonly UndoableChange[],
): Promise<UndoableChange[]> {
  const reverse: UndoableChange[] = [];
  for (const change of [...changes].reverse()) {
    if (change.table === "states") {
      reverse.push({
        table: "states",
        key: change.key,
        before: await db.states.get(change.key),
      });
      if (change.before) await db.states.put(change.before);
      else await db.states.delete(change.key);
    } else if (change.table === "revlog") {
      reverse.push({
        table: "revlog",
        id: change.id,
        before: await db.revlog.get(change.id),
      });
      if (change.before) await db.revlog.put(change.before);
      else await db.revlog.delete(change.id);
    } else {
      reverse.push({ table: "dailyLimits", before: dailyLimitsSnapshot() });
      restoreDailyLimits(change.before);
    }
  }
  return reverse;
}

export async function undo(): Promise<UndoOp | null> {
  const step = undoSteps[0];
  if (!step) return null;
  undoSteps = undoSteps.slice(1);
  redoSteps = [...redoSteps, { op: step.op, changes: await revert(step) }];
  notify();
  return step.op;
}

export async function redo(): Promise<UndoOp | null> {
  const step = redoSteps.at(-1);
  if (!step) return null;
  redoSteps = redoSteps.slice(0, -1);
  undoSteps = [{ op: step.op, changes: await revert(step) }, ...undoSteps];
  notify();
  return step.op;
}

// A step that moved nothing but a daily limit has no rows to put back, and so
// no transaction to open for them.
function revert(step: UndoStep): Promise<UndoableChange[]> {
  const rows = step.changes.some(({ table }) => table !== "dailyLimits");
  if (!rows) return applyChanges(step.changes);
  return db.transaction("rw", [db.states, db.revlog], () =>
    applyChanges(step.changes),
  );
}
