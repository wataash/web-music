// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from "./fixtures";

test("merges matching outside strings and rotates their presentations", async ({ page }) => {
  await page.route("**/fretboard-edge-check", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Fretboard edge check</title>",
    }),
  );
  await page.goto("/fretboard-edge-check");

  const result = await page.evaluate(async () => {
    const dbPath = "/src/lib/db.ts";
    const studyPath = "/src/lib/study.ts";
    const { db, importDeckData } = await import(dbPath);
    const { answerCard, nextCard, Rating, resetPreview } = await import(studyPath);
    const { deck } = await (await fetch("/__dev_deck/guitar-fretboard")).json();
    const members = [1, 6].map((string) =>
      deck.notes.find(
        (note: { fields: string[] }) =>
          note.fields[0] === `position-to-note-string-${string}-fret-5`,
      ),
    );
    const legacyKeys = members.map(
      (note: { guid: string }) => `${note.guid}#0`,
    );
    const now = new Date("2026-09-20T03:00:00Z");
    const state = (key: string, updatedAt: number, reps: number) => ({
      key,
      fsrs: {
        due: now.getTime(),
        stability: 5,
        difficulty: 5,
        elapsed_days: 1,
        scheduled_days: 1,
        learning_steps: 0,
        reps,
        lapses: 0,
        state: 2,
        last_review: updatedAt,
      },
      due: now.getTime(),
      stateKind: "review",
      introducedDay: 20000,
      updatedAt,
      updatedBy: `event-${updatedAt}`,
    });
    await db.states.bulkPut([
      state(legacyKeys[0], now.getTime() - 2000, 2),
      state(legacyKeys[1], now.getTime() - 1000, 5),
    ]);
    await importDeckData(deck);

    const preview = await resetPreview("Guitar Fretboard");
    const options = {
      includeNote: (note: { guid: string }) =>
        members.some((member: { guid: string }) => member.guid === note.guid),
    };
    const first = await nextCard("Guitar Fretboard", now, options);
    await answerCard(first, Rating.Easy, now);
    const reviewed = await db.states.get(first.card.key);
    const second = await nextCard(
      "Guitar Fretboard",
      new Date(reviewed.due),
      options,
    );
    return {
      preview,
      states: await db.states.toArray(),
      sharedKey: first.card.key === second.card.key,
      strings: [first.note.fields[2], second.note.fields[2]],
    };
  });

  expect(result.preview).toMatchObject({ totalCount: 235, studiedCount: 1 });
  expect(result.states).toHaveLength(1);
  expect(result.states[0].key).toContain("fretboard-edge:");
  expect(result.sharedKey).toBe(true);
  expect(new Set(result.strings).size).toBe(2);
});
