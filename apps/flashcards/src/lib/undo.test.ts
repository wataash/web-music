// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";

import { addToDailyNewLimit, dailyNewLimit } from "./daily-limits";
import {
  clearUndoQueue,
  describeUndoOp,
  redo,
  saveDailyLimitsUndo,
  saveUndoEffect,
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

  it("moves session state only after a successful undo or redo", async () => {
    let count = 1;
    await undoableOp("customStudy", async () => {
      saveDailyLimitsUndo();
      addToDailyNewLimit("Intervals", 5);
      saveUndoEffect(() => { count -= 1; }, () => { count += 1; });
    });
    const write = vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => { throw new Error("full"); });
    await expect(undo()).rejects.toThrow("full");
    expect(count).toBe(1);
    write.mockRestore();
    await undo();
    expect(count).toBe(0);
    await redo();
    expect(count).toBe(1);
    await undo();
    expect(count).toBe(0);
  });

  it.each(["undo", "redo"] as const)("preserves %s history when storage fails, allowing a retry", async (direction) => {
    await raiseLimit("Intervals", 10);
    if (direction === "redo") await undo();
    const before = undoStatus();
    const limit = dailyNewLimit("Intervals");
    const write = vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });
    try {
      await expect((direction === "undo" ? undo : redo)()).rejects.toThrow("storage unavailable");
      expect(undoStatus()).toEqual(before);
      expect(dailyNewLimit("Intervals")).toBe(limit);
    } finally {
      write.mockRestore();
    }
    expect(await (direction === "undo" ? undo : redo)()).toBe("customStudy");
    expect(dailyNewLimit("Intervals")).toBe(direction === "undo" ? 20 : 30);
  });

  it("preserves every step when undo requests overlap", async () => {
    await raiseLimit("Intervals", 5);
    await raiseLimit("Intervals", 10);
    await Promise.all([undo(), undo()]);
    expect(dailyNewLimit("Intervals")).toBe(20);
    expect(await redo()).toBe("customStudy");
    expect(dailyNewLimit("Intervals")).toBe(25);
    expect(await redo()).toBe("customStudy");
    expect(dailyNewLimit("Intervals")).toBe(35);
  });

  it("applies overlapping redo requests in order", async () => {
    await raiseLimit("Intervals", 5);
    await raiseLimit("Intervals", 10);
    await undo();
    await undo();
    await Promise.all([redo(), redo()]);
    expect(dailyNewLimit("Intervals")).toBe(35);
    await undo();
    expect(dailyNewLimit("Intervals")).toBe(25);
    await undo();
    expect(dailyNewLimit("Intervals")).toBe(20);
  });

  it("orders undo followed immediately by redo", async () => {
    await raiseLimit("Intervals", 10);
    expect(await Promise.all([undo(), redo()])).toEqual(["customStudy", "customStudy"]);
    expect(dailyNewLimit("Intervals")).toBe(30);
  });

  it("finishes undo before recording a new operation", async () => {
    await raiseLimit("Intervals", 10);
    await Promise.all([undo(), raiseLimit("Intervals", 5)]);
    expect(dailyNewLimit("Intervals")).toBe(25);
    expect(undoStatus()).toEqual({ undo: "customStudy", redo: null });
    await undo();
    expect(dailyNewLimit("Intervals")).toBe(20);
  });

  it("does not revert history while an operation is still being recorded", async () => {
    await raiseLimit("Intervals", 10);
    await undoableOp("customStudy", async () => {
      expect(await undo()).toBeNull();
      saveDailyLimitsUndo();
      addToDailyNewLimit("Intervals", 5);
    });
    expect(dailyNewLimit("Intervals")).toBe(35);
    await undo();
    expect(dailyNewLimit("Intervals")).toBe(30);
  });

  it("does not apply queued history after it has been cleared", async () => {
    await raiseLimit("Intervals", 10);
    const pending = undo();
    clearUndoQueue();
    expect(await pending).toBeNull();
    expect(dailyNewLimit("Intervals")).toBe(30);
    expect(undoStatus()).toEqual({ undo: null, redo: null });
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
