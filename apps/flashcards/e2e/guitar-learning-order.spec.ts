// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "./fixtures";

test("re-imports guitar priorities without resetting studied cards or review history", async ({ page }) => {
  // Keep automatic app imports from racing the old/new deck replacement.
  await page.route("**/learning-order-check", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Learning order check</title>",
  }));
  await page.goto("/learning-order-check");
  const result = await page.evaluate(async () => {
    const dbPath = "/src/lib/db.ts";
    const studyPath = "/src/lib/study.ts";
    const schedulerPath = "/src/lib/scheduler.ts";
    const selectionPath = "/src/lib/guitar-interval-selection.ts";
    const { db, importDeckData } = await import(dbPath);
    const { nextCard, answerCard } = await import(studyPath);
    const { Rating } = await import(schedulerPath);
    const { includesGuitarIntervalCard } = await import(selectionPath);
    const { deck } = await (await fetch("/__dev_deck/guitar-intervals")).json();
    const sorted = [...deck.cards].sort((a, b) => a.newOrder - b.newOrder);
    // Simulate a previously imported deck with a different new-card order.
    await importDeckData({ ...deck, cards: deck.cards.map((card: { newOrder: number }) => ({
      ...card, newOrder: deck.cards.length + 1 - card.newOrder,
    })) });
    const now = new Date("2026-09-12T03:00:00Z");
    const studied = await nextCard("Guitar Intervals", now);
    await answerCard(studied, Rating.Easy, now);
    const statesBefore = await db.states.toArray();
    const logBefore = await db.revlog.toArray();
    await importDeckData(deck);
    const first = await nextCard("Guitar Intervals", now);
    const filtered = await nextCard("Guitar Intervals", now, {
      includeNote: (note: { fields: string[] }) => includesGuitarIntervalCard(note, { left: 0, right: 0 }),
    });
    const review = await nextCard("Guitar Intervals", new Date(statesBefore[0].due));
    return {
      statesBefore, statesAfter: await db.states.toArray(),
      logBefore, logAfter: await db.revlog.toArray(),
      storedOrder: (await db.cards.toArray()).map((card: { id: number; newOrder: number }) => [card.id, card.newOrder]),
      expectedOrder: deck.cards.map((card: { id: number; newOrder: number }) => [card.id, card.newOrder]),
      firstId: first.card.id, expectedFirstIds: sorted.slice(0, 4).map((card: { id: number }) => card.id),
      firstShape: first.note.fields[0], filteredOffset: filtered.note.fields[4],
      reviewKey: review.card.key, studiedKey: studied.card.key,
    };
  });
  expect(result.statesBefore).toHaveLength(1);
  expect(result.logBefore).toHaveLength(1);
  expect(result.statesAfter).toEqual(result.statesBefore);
  expect(result.logAfter).toEqual(result.logBefore);
  expect(result.storedOrder).toEqual(result.expectedOrder);
  expect(result.expectedFirstIds).toContain(result.firstId);
  expect(["r6-s5-f2", "r5-s4-f2", "r6-s4-f2", "r5-s3-f2"]).toContain(result.firstShape);
  expect(result.filteredOffset).toBe("0");
  expect(result.reviewKey).toBe(result.studiedKey);
});
