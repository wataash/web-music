import { expect, test } from "./fixtures";

test("diversifies eligible reviews while preserving learning priority, new groups and filters", async ({ page }) => {
  await page.route("**/queue-check", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Queue check</title>" }));
  await page.goto("/queue-check");
  const result = await page.evaluate(async () => {
    const dbPath = "/src/lib/db.ts", studyPath = "/src/lib/study.ts";
    const { db, importDeckData } = await import(dbPath);
    const { nextCard, answerCard, Rating } = await import(studyPath);
    const { deck } = await (await fetch("/__dev_deck/intervals")).json();
    await importDeckData(deck);
    const now = new Date();
    const ids = ["interval-A5-c", "interval-m6-c", "interval-P5-d", "interval-P5-c"];
    const includeNote = (note: { fields: string[] }) => ids.includes(note.fields[0]);
    const recent = await nextCard("Intervals", now, { includeNote: (n: { fields: string[] }) => n.fields[0] === ids[0] });
    await answerCard(recent, Rating.Easy, now);
    const recentState = await db.states.get(recent.card.key);
    for (const id of [ids[1], ids[2]]) {
      const item = await nextCard("Intervals", now, { includeNote: (n: { fields: string[] }) => n.fields[0] === id });
      await db.states.put({ ...recentState, key: item.card.key, stateKind: "review", due: now.getTime() - 1000 });
    }
    const diverse = await nextCard("Intervals", now, { includeNote });
    const similar = await nextCard("Intervals", now, { includeNote: (n: { fields: string[] }) => n.fields[0] === ids[1] });
    await db.states.update(similar.card.key, { stateKind: "learning" });
    const learning = await nextCard("Intervals", now, { includeNote });
    await db.states.delete(similar.card.key);
    await db.states.delete(diverse.card.key);
    const introduced = await nextCard("Intervals", now, { includeNote });
    const countBefore = await db.revlog.count();
    await nextCard("Intervals", now, { includeNote });
    const logUnchanged = countBefore === await db.revlog.count();
    // Undo removes a review log event; selection must not retain hidden
    // in-memory history after that event disappears.
    await db.revlog.clear();
    const withoutHistory = await nextCard("Intervals", now, { includeNote });
    const expectedFirst = deck.cards.filter((c: { nid: number }) => {
      const note = deck.notes.find((n: { id: number }) => n.id === c.nid);
      return note && [ids[1], ids[2], ids[3]].includes(note.fields[0]);
    }).sort((a: { newOrder: number }, b: { newOrder: number }) => a.newOrder - b.newOrder)[0];
    return { diverse: diverse.note.fields[0], learning: learning.note.fields[0],
      introduced: introduced.note.fields[0], single: similar.note.fields[0],
      logUnchanged, historyRemoved: withoutHistory.card.id === expectedFirst.id };
  });
  expect(result).toEqual({ diverse: "interval-P5-d", learning: "interval-m6-c",
    introduced: "interval-P5-d", single: "interval-m6-c", logUnchanged: true, historyRemoved: true });
});
