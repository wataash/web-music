// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it } from "vitest";

import { addToDailyNewLimit, dailyNewLimit } from "./daily-limits";
import {
  clearUndoQueue,
  describeUndoOp,
  redo,
  saveDailyLimitsUndo,
  subscribeUndoStatus,
  undo,
  undoableOp,
  undoStatus,
} from "./undo";

// The module reads `localStorage` through a guard, so a map of one is enough
// to run the limit half of the queue outside a browser.
function installMemoryStorage(): void {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
}

async function raiseLimit(deck: string, amount: number): Promise<void> {
  await undoableOp("customStudy", async () => {
    saveDailyLimitsUndo();
    addToDailyNewLimit(deck, amount);
  });
}

describe("the undo queue", () => {
  beforeEach(() => {
    installMemoryStorage();
    clearUndoQueue();
  });

  it("puts back what an operation changed, and redoes it", async () => {
    expect(undoStatus()).toEqual({ undo: null, redo: null });
    expect(await undo()).toBeNull();

    await raiseLimit("Intervals", 10);
    expect(dailyNewLimit("Intervals")).toBe(30);
    expect(undoStatus()).toEqual({ undo: "customStudy", redo: null });
    expect(describeUndoOp("customStudy")).toBe("Custom Study");

    expect(await undo()).toBe("customStudy");
    expect(dailyNewLimit("Intervals")).toBe(20);
    expect(undoStatus()).toEqual({ undo: null, redo: "customStudy" });

    expect(await redo()).toBe("customStudy");
    expect(dailyNewLimit("Intervals")).toBe(30);
    expect(undoStatus()).toEqual({ undo: "customStudy", redo: null });
  });

  it("forgets the redo queue as soon as something else is done", async () => {
    await raiseLimit("Intervals", 10);
    await undo();
    expect(undoStatus().redo).toBe("customStudy");

    await raiseLimit("Treble Clef", 10);
    expect(undoStatus()).toEqual({ undo: "customStudy", redo: null });
    expect(await redo()).toBeNull();
  });

  it("remembers an operation only if it changed something", async () => {
    await undoableOp("answerCard", async () => {});
    expect(undoStatus().undo).toBeNull();
  });

  it("keeps thirty steps, and drops the ones before them", async () => {
    for (let step = 0; step < 35; step += 1) {
      await raiseLimit("Intervals", 10);
    }
    expect(dailyNewLimit("Intervals")).toBe(370);

    for (let step = 0; step < 30; step += 1) {
      expect(await undo()).toBe("customStudy");
    }
    // The five oldest are gone, so their raises stand.
    expect(await undo()).toBeNull();
    expect(dailyNewLimit("Intervals")).toBe(70);
  });

  it("tells the screen when the queue moves", async () => {
    let told = 0;
    const stop = subscribeUndoStatus(() => (told += 1));
    await raiseLimit("Intervals", 10);
    await undo();
    stop();
    await redo();
    expect(told).toBe(2);
  });

  it("empties both queues when the rows are written from elsewhere", async () => {
    await raiseLimit("Intervals", 10);
    clearUndoQueue();
    expect(undoStatus()).toEqual({ undo: null, redo: null });
  });
});
