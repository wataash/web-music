// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// Every test gets a fresh browser context, so the app starts with empty
// storage and imports the decks from the dev server. That takes a couple of
// seconds; the deck list fills in as each deck lands.
const IMPORT_TIMEOUT = 30_000;

// Two fingers landing at once, which the card reads as one tap on two places:
// both are played and the answer is shown, as one finger's would be. Desktop
// browsers have no touch to drive and no Touch to build, so the event is made
// by hand; the card reads nothing from it but where the fingers are.
async function touchCard(
  page: Page,
  kind: "touchstart" | "touchmove" | "touchend",
  points: readonly Readonly<{ x: number; y: number }>[],
): Promise<void> {
  await page
    .locator('iframe[title="card"]')
    .evaluate((frame, { kind: name, places }) => {
      const view = (frame as HTMLIFrameElement).contentWindow;
      const document = (frame as HTMLIFrameElement).contentDocument;
      if (view === null || document === null) return;
      const event = new view.Event(name, { bubbles: true });
      const touches = places.map(({ x, y }, index) => ({
        identifier: index,
        clientX: x,
        clientY: y,
      }));
      Object.defineProperty(event, "touches", { value: touches });
      Object.defineProperty(event, "changedTouches", { value: touches });
      document.body.dispatchEvent(event);
    }, { kind, places: points });
}

// Where a locator inside the card sits, in the card's own coordinates: what a
// finger on it would report.
async function centreInCard(
  page: Page,
  locator: ReturnType<ReturnType<Page["frameLocator"]>["locator"]>,
): Promise<{ x: number; y: number }> {
  const frame = (await page.locator('iframe[title="card"]').boundingBox())!;
  const box = (await locator.boundingBox())!;
  return {
    x: box.x + box.width / 2 - frame.x,
    y: box.y + box.height / 2 - frame.y,
  };
}

async function arrangeCard(page: Page): Promise<void> {
  await openSheetAction(page, "Arrange card");
  await expect(page.getByRole("group", { name: "Arrange card" })).toBeVisible();
}

// A mouse cannot pinch, so the wheel over a part is what sizes it. One notch
// is one step, whichever way the wheel is turned.
async function wheelOver(
  page: Page,
  locator: ReturnType<ReturnType<Page["frameLocator"]>["locator"]>,
  notches: number,
): Promise<void> {
  const box = (await locator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let turn = 0; turn < Math.abs(notches); turn += 1) {
    await page.mouse.wheel(0, notches > 0 ? -100 : 100);
  }
}

// Within a pixel or two: an offset is stored to a grain of the card's width
// rather than to the pixel a finger happened to stop on.
function expectNear(value: number, expected: number): void {
  expect(Math.abs(value - expected)).toBeLessThan(2);
}

// From the middle of what is being dragged, in a few steps: one jump is a
// flick to a browser, and the card is watching the pointer move.
async function dragBy(
  page: Page,
  locator: ReturnType<ReturnType<Page["frameLocator"]>["locator"]>,
  by: Readonly<{ x: number; y: number }>,
): Promise<void> {
  const box = (await locator.boundingBox())!;
  const fromX = box.x + box.width / 2;
  const fromY = box.y + box.height / 2;
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX + by.x, fromY + by.y, { steps: 8 });
  await page.mouse.up();
}

function deckRow(page: Page, name: string) {
  return page.locator(".deck-row").filter({
    has: page.locator(".deck-name", { hasText: new RegExp(`^${name}$`) }),
  });
}

async function openDeckList(page: Page): Promise<void> {
  await page.goto("/");
  await expect(deckRow(page, "Music Staff")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });
}

// In development the app imports the staged decks first and then re-imports
// them from the dev server, which is what makes a regenerated deck appear
// without reloading — and rebuilds the card on screen when it lands. A test
// that holds one card across several steps waits for that second pass first.
async function settleDeckImports(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const manifest: readonly { id: string; version: string }[] = await (
            await fetch("/__dev_deck/manifest")
          ).json();
          const versions: Record<string, string> = JSON.parse(
            localStorage.getItem("music-flashcards:dev-deck-versions") ?? "{}",
          );
          return manifest.every(({ id, version }) => versions[id] === version);
        }),
      { timeout: IMPORT_TIMEOUT },
    )
    .toBe(true);

  // A deck is remembered as soon as it is imported, which is before the app
  // has finished with the rest of them and redrawn — and a card is rebuilt
  // when its deck lands again. Waiting for the app to say it is idle keeps a
  // later deck from replacing the card, or the buttons under it, mid-test.
  await expect(page.locator(".preparing")).toHaveCount(0, {
    timeout: IMPORT_TIMEOUT,
  });
  await expect(page.locator(".importing")).toHaveCount(0, {
    timeout: IMPORT_TIMEOUT,
  });
}

// The reviewer keeps one menu, so what it offers is a row in the sheet rather
// than a button of its own.
async function openSheetAction(
  page: Page,
  name: string | RegExp,
): Promise<void> {
  await page.getByRole("button", { name: "Deck actions" }).click();
  await page.getByRole("menuitem", { name }).click();
}

async function openNoteSettings(page: Page): Promise<void> {
  await openSheetAction(page, "What to ask");
}

async function openStudyMore(page: Page): Promise<void> {
  await openSheetAction(page, "Study more today");
}

// Where the answer buttons go: dragged onto an edge while the card is being
// arranged, from wherever the row is now.
async function placeAnswerAt(
  page: Page,
  x: number,
  y: number,
): Promise<void> {
  const held = (await page.locator("footer.bottom").boundingBox())!;
  await page.mouse.move(held.x + held.width / 2, held.y + held.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
}

async function study(page: Page, deck: string): Promise<void> {
  await settleDeckImports(page);
  await deckRow(page, deck).locator(".deck-study").click();
  await expect(page.getByRole("heading", { name: deck })).toBeVisible();
  // The reviewer renders before its first card is picked, and answering does
  // nothing until then. The counts arrive with the card.
  await expect(page.locator(".count.new")).not.toHaveText("0");
}

test("lists the decks as they import, cheapest first", async ({
  page,
  shot,
}) => {
  await page.goto("/");

  // Music Staff is imported first and is studiable while the rest arrive.
  await expect(deckRow(page, "Music Staff")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });
  await shot("first-deck-listed");

  await expect(page.locator(".preparing")).toHaveCount(0, {
    timeout: IMPORT_TIMEOUT,
  });
  await expect(deckRow(page, "Guitar Fretboard")).toBeVisible();
  await shot("all-decks-listed");
});

test("continues importing after one deck fails", async ({ page }) => {
  await page.route("**/__dev_deck/intervals", (route) => route.abort());
  await page.goto("/");

  await expect(page.getByRole("alert")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });
  await expect(deckRow(page, "Guitar Intervals")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });
  await expect(deckRow(page, "Guitar Fretboard")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });
});

test("shows a card, its answer, and moves the counts", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");

  // The staff and the bare keyboard are drawn as inline SVG when the card is
  // shown, and the keyboard carries no name until the answer is out.
  const card = page.frameLocator('iframe[title="card"]');
  await expect(card.locator("svg.staff")).toBeVisible();
  await expect(card.locator("svg.keyboard")).toBeVisible();
  await expect(card.locator(".key-name")).toHaveCount(0);
  await expect(page.locator(".count.new")).toHaveText("19");
  await shot("question");

  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  await shot("answer");

  await page.getByRole("button", { name: "GOOD" }).click();
  await expect(page.locator(".count.new")).toHaveText("18");
  await expect(page.locator(".count.learn")).toHaveText("1");
  await shot("after-good");
});

test("undoes the last answer, and redoes it", async ({ page, shot }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const newCount = page.locator(".count.new");
  const learnCount = page.locator(".count.learn");
  await expect(newCount).toHaveText("19");

  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await page.getByRole("button", { name: "GOOD" }).click();
  await expect(newCount).toHaveText("18");
  await expect(learnCount).toHaveText("1");

  // The sheet names the operation, as Anki's undo does: "Undo Answer Card".
  await page.getByRole("button", { name: "Deck actions" }).click();
  await shot("undo-in-the-sheet");
  await page.getByRole("menuitem", { name: "Undo Answer Card" }).click();
  await expect(page.locator(".undone")).toHaveText("Answer Card undone");
  await expect(newCount).toHaveText("19");
  await expect(learnCount).toHaveText("0");
  await expect(page.getByRole("button", { name: "SHOW ANSWER" })).toBeVisible();
  await shot("answer-undone");

  await openSheetAction(page, "Redo Answer Card");
  await expect(page.locator(".undone")).toHaveText("Answer Card redone");
  await expect(newCount).toHaveText("18");
  await expect(learnCount).toHaveText("1");

  // Ctrl+Z reaches it without the sheet, as it does in Anki.
  await page.keyboard.press("Control+z");
  await expect(newCount).toHaveText("19");
  await expect(learnCount).toHaveText("0");

  // And with nothing left to undo, the sheet stops offering it.
  await page.getByRole("button", { name: "Deck actions" }).click();
  await expect(
    page.getByRole("menuitem", { name: /^Undo/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("undoes a deck reset, cards and reviews together", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await page.getByRole("button", { name: "GOOD" }).click();
  await expect(page.locator(".count.learn")).toHaveText("1");

  await openSheetAction(page, "Reset study progress");
  await page.getByRole("button", { name: "RESET" }).click();
  await expect(page.locator(".count.learn")).toHaveText("0");
  await expect(page.locator(".count.new")).toHaveText("19");

  // The whole deck's rows come back, so the card studied a moment ago is in
  // learning again.
  await openSheetAction(page, "Undo Reset study progress");
  await expect(page.locator(".undone")).toHaveText(
    "Reset study progress undone",
  );
  await expect(page.locator(".count.learn")).toHaveText("1");
  await expect(page.locator(".count.new")).toHaveText("18");
});

test("undoes from the deck list what was done in the reviewer", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await page.getByRole("button", { name: "GOOD" }).click();
  await expect(page.locator(".count.learn")).toHaveText("1");

  // The queue is the collection's, not the screen's: the answer given in the
  // reviewer is on offer in the list's own menu.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(deckRow(page, "Treble Clef")).toBeVisible();
  await deckRow(page, "Treble Clef").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Undo Answer Card" }).click();

  await expect(page.getByRole("status")).toContainText("Answer Card undone");
  await expect(
    deckRow(page, "Treble Clef").locator(".count.learn"),
  ).toHaveText("0");
  await shot("undone-from-the-deck-list");
});

test("reveals the answer when the keyboard is tapped", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");

  // The staff and the keyboard are both diagrams, and tapping either one
  // stands in for SHOW ANSWER on a card with a single right answer. A key
  // sounds as it is tapped; showing the answer is what it is still for.
  const card = page.frameLocator('iframe[title="card"]');
  await card.locator("svg.keyboard").click();
  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  await expect(card.locator(".key-name")).toHaveCount(1);
});

test("names the keys of an interval on a keyboard", async ({ page, shot }) => {
  await openDeckList(page);
  await study(page, "Intervals");

  // The front marks the root on the keyboard and names that one key. The
  // answer is not on it yet: a question mark holds the place it will take.
  const card = page.frameLocator('iframe[title="card"]');
  await expect(card.locator(".key-name")).toHaveCount(1);
  await expect(card.locator(".answer-value")).toHaveText("?");
  await shot("interval-question");

  // The keyboard stands in for SHOW ANSWER, as the staff decks' diagrams do,
  // however many fingers land on it.
  await card.locator("svg.keyboard-svg").click();

  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  // The answer is spelled out in the question mark's place, and named on the
  // nearest key either side of the root.
  await expect(card.locator(".answer-value")).not.toHaveText("?");
  await expect(card.locator(".answer-value")).not.toBeEmpty();
  await expect(card.locator(".key-name")).toHaveCount(3);
  await shot("interval-answer");
});

// Web Audio makes no sound a test can hear, so the instrument is replaced with
// one that writes down what it was asked to play: a piano note is a stack of
// partials, a plucked string is one buffer.
type PlayedNotes = Readonly<{ partials: number[]; plucks: number }>;

async function recordWhatIsPlayed(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const played = { partials: [] as number[], plucks: 0 };
    (window as unknown as { __played: typeof played }).__played = played;
    const param = () => ({
      value: 0,
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    });
    const node = <T extends object>(extra: T) => ({
      ...extra,
      connect: (target: unknown) => target,
      disconnect: () => {},
    });
    class Recorder {
      currentTime = 0;
      sampleRate = 48000;
      state = "running";
      destination = {};
      resume() {}
      createGain() {
        return node({ gain: param() });
      }
      createBiquadFilter() {
        return node({ type: "", frequency: param() });
      }
      createOscillator() {
        const oscillator = node({ frequency: { value: 0 }, stop: () => {} });
        return {
          ...oscillator,
          start: () => played.partials.push(oscillator.frequency.value),
        };
      }
      createBuffer(_channels: number, length: number) {
        return { getChannelData: () => new Float32Array(length) };
      }
      createBufferSource() {
        return node({
          buffer: null,
          onended: null,
          start: () => (played.plucks += 1),
        });
      }
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = Recorder;
  });
}

function whatWasPlayed(page: Page): Promise<PlayedNotes> {
  return page.evaluate(
    () => (window as unknown as { __played: PlayedNotes }).__played,
  );
}

test("plays the key under the finger, and the answer as it is shown", async ({
  page,
}) => {
  await recordWhatIsPlayed(page);
  await openDeckList(page);
  await study(page, "Intervals");
  const card = page.frameLocator('iframe[title="card"]');

  // The root, both tapped keys, and the answer are played in order.
  const keys = card.locator("rect.keyboard__white-key");
  await touchCard(page, "touchstart", [
    await centreInCard(page, keys.nth(8)),
    await centreInCard(page, keys.nth(12)),
  ]);
  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  const struck = await whatWasPlayed(page);
  const partialsPerNote = 4;
  expect(struck.partials.length).toBe(4 * partialsPerNote);
  expect(struck.plucks).toBe(0);
  // Every one of them is a note a piano has.
  expect(Math.min(...struck.partials)).toBeGreaterThan(20);

  // The answer is not played again once it is out; a key still is. The wait is
  // the fingers coming off: a browser makes a click out of a touch, and the
  // card ignores that one so a tap is played once rather than twice.
  await page.waitForTimeout(800);
  await card.locator("svg.keyboard-svg").click();
  await expect
    .poll(async () => (await whatWasPlayed(page)).partials.length)
    .toBe(5 * partialsPerNote);

  // A guitar deck is plucked instead: one string, not a stack of partials.
  await page.getByTitle("Back").click();
  await study(page, "Guitar Intervals");
  const before = (await whatWasPlayed(page)).partials.length;
  await card.locator(".fret-window-board").click();
  // The root, the cell under the finger, and the answer.
  await expect.poll(async () => (await whatWasPlayed(page)).plucks).toBe(3);
  expect((await whatWasPlayed(page)).partials.length).toBe(before);
});

test("plays the guitar root and correct target without repeating the target", async ({ page }) => {
  await recordWhatIsPlayed(page);
  await openDeckList(page);
  await study(page, "Guitar Intervals");
  const card = page.frameLocator('iframe[title="card"]');
  const cue = await card.locator(".fret-name.cue").boundingBox();
  await page.mouse.click(cue!.x + cue!.width / 2, cue!.y + cue!.height / 2);
  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  expect((await whatWasPlayed(page)).plucks).toBe(2);
  expect((await whatWasPlayed(page)).partials).toHaveLength(0);
});

for (const side of ["lower", "upper"] as const) {
  test(`plays the root then a correct ${side} key only once`, async ({ page }) => {
    await recordWhatIsPlayed(page);
    await page.addInitScript(() => {
      localStorage.setItem("music-flashcards:deck-card-settings", JSON.stringify({
        Intervals: { frontAnswer: true },
      }));
    });
    await openDeckList(page);
    await study(page, "Intervals");
    const card = page.frameLocator('iframe[title="card"]');
    const answers = card.locator("rect.is-highlighted");
    const pitches = await answers.evaluateAll((keys) => keys.map((key) => Number(key.getAttribute("data-semitone"))));
    const pitch = side === "upper" ? Math.max(...pitches) : Math.min(...pitches);
    const key = card.locator(`rect.is-highlighted[data-semitone="${pitch}"]`);
    const box = (await key.boundingBox())!;
    const root = Number(await card.locator("rect.is-given").getAttribute("data-semitone"));
    await key.click({ position: { x: box.width / 2, y: box.height * 0.8 } });
    await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
    const played = (await whatWasPlayed(page)).partials;
    expect(played).toHaveLength(8);
    expect(played[0]).toBeCloseTo(440 * 2 ** ((root - 69) / 12));
    expect(played[4]).toBeCloseTo(440 * 2 ** ((pitch - 69) / 12));
  });
}

test("keeps enlarged interval keys visible outside their translated row", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  await openDeckList(page);
  await study(page, "Intervals");
  const card = page.frameLocator('iframe[title="card"]');
  const visible = await card.locator(".keyboard").evaluate((row) => {
    const host = row as HTMLElement;
    host.style.setProperty("--keyboard-scale", "2");
    host.style.setProperty("--keyboard-x", "40vw");
    const bounds = host.getBoundingClientRect();
    const key = [...host.querySelectorAll("rect[data-semitone]")].find((key) => {
      const rect = key.getBoundingClientRect();
      return rect.left > 0 && rect.right < bounds.left;
    });
    if (!key) return false;
    const rect = key.getBoundingClientRect();
    return host.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.bottom - 5) === key;
  });
  expect(visible).toBe(true);
});

test("keeps the staff decks silent until they are asked to sound", async ({
  page,
}) => {
  await recordWhatIsPlayed(page);
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.frameLocator('iframe[title="card"]');

  // A staff card asks which note is written and answers with its name.
  // Sounding that every time is practice at naming pitches by ear, which is a
  // different skill and not one the deck is teaching.
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await card.locator("svg.keyboard").click();
  expect((await whatWasPlayed(page)).partials).toHaveLength(0);

  // The switch is the reader's, and it is the deck's: another deck is not
  // silenced with it.
  await page.getByRole("button", { name: "Deck actions" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Sound" }).click();
  await page.keyboard.press("Escape");
  await card.locator("svg.keyboard").click();
  await expect
    .poll(async () => (await whatWasPlayed(page)).partials.length)
    .toBeGreaterThan(0);

  await page.getByTitle("Back").click();
  await study(page, "Intervals");
  await page.getByRole("button", { name: "Deck actions" }).click();
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Sound" }),
  ).toHaveAttribute("aria-checked", "true");
});

test("plays every key a finger is drawn along", async ({ page }) => {
  await recordWhatIsPlayed(page);
  await openDeckList(page);
  await study(page, "Intervals");
  const card = page.frameLocator('iframe[title="card"]');
  const keys = card.locator("rect.keyboard__white-key");
  // Low in the keys, where no black key lies over them.
  const along = async (nth: number) => {
    const box = (await keys.nth(nth).boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height * 0.8 };
  };

  const start = await along(8);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const nth of [9, 10, 11, 12]) {
    const key = await along(nth);
    await page.mouse.move(key.x, key.y);
  }
  await page.mouse.up();

  // The four keys it crossed, and the answer as the card turns over — the key
  // it started on is played by the tap, not by the drag.
  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  const partialsPerNote = 4;
  await expect
    .poll(async () => (await whatWasPlayed(page)).partials.length)
    .toBe(5 * partialsPerNote);

  // Held still, a key sounds once rather than on every twitch of the finger.
  const held = await along(6);
  await page.mouse.move(held.x, held.y);
  await page.mouse.down();
  await page.mouse.move(held.x + 1, held.y + 1);
  await page.mouse.move(held.x + 2, held.y);
  await page.mouse.up();
  await expect
    .poll(async () => (await whatWasPlayed(page)).partials.length)
    .toBe(6 * partialsPerNote);

  // A finger does the same, and keeps playing while the card is under it: its
  // own events go on arriving whether or not the card scrolls beneath. The one
  // it lands on is played by the landing, and each it reaches after that.
  const landed = [await centreInCard(page, keys.nth(4))];
  await touchCard(page, "touchstart", landed);
  for (const nth of [5, 6, 7]) {
    await touchCard(page, "touchmove", [
      await centreInCard(page, keys.nth(nth)),
    ]);
  }
  await touchCard(page, "touchend", landed);
  await expect
    .poll(async () => (await whatWasPlayed(page)).partials.length)
    .toBe(10 * partialsPerNote);
});

test("chooses what the interval keyboard marks on the front", async ({
  page,
}) => {
  await openDeckList(page);
  await study(page, "Intervals");
  const card = page.frameLocator('iframe[title="card"]');
  const names = card.locator(".key-name");
  await expect(names).toHaveCount(1);

  await page.getByRole("button", { name: "Deck actions" }).click();
  const root = page.getByRole("menuitemcheckbox", { name: "Front: root note" });
  const answer = page.getByRole("menuitemcheckbox", {
    name: "Front: answer note",
  });
  await expect(root).toHaveAttribute("aria-checked", "true");
  await expect(answer).toHaveAttribute("aria-checked", "false");

  // The sheet stays open, and the card behind it is redrawn as you press.
  await root.click();
  await expect(names).toHaveCount(0);

  // Naming the interval between two notes wants both of them on the board:
  // the answer is marked either side of the root, and left for the reader to
  // name.
  await answer.click();
  await expect(names).toHaveCount(2);
  await expect(names.first()).toHaveText("?");
  await root.click();
  await expect(names).toHaveCount(3);

  // It is that deck's setting, and it holds for the next card.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await page.getByRole("button", { name: "GOOD" }).click();
  await expect(names).toHaveCount(3);
});

test("names a fretboard position's degree, in a window of frets", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  await study(page, "Guitar Intervals");

  // The board is drawn around the root, so the front marks it and puts a "?"
  // on the position it is asking about.
  const card = page.frameLocator('iframe[title="card"]');
  await expect(card.locator(".fret-name.root")).toHaveText("1");
  await expect(card.locator(".fret-name.cue")).toHaveText("?");
  await shot("guitar-interval-question");

  // The board is a diagram, so tapping it stands in for SHOW ANSWER.
  await card.locator(".fret-window-board").click();
  await expect(card.locator(".fret-name.answer")).not.toBeEmpty();
  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  await shot("guitar-interval-answer");

  // Narrowing the window crops the board and drops the positions past it.
  const boardWidth = async () =>
    (await card.locator(".fret-window-board").boundingBox())?.width ?? 0;
  const wide = await boardWidth();
  await openNoteSettings(page);
  const dialog = page.getByRole("dialog");
  // The card itself is the preview: it is redrawn to the window being dragged,
  // before APPLY commits it. A narrower window is a wider board, since fewer
  // frets fill the same screen.
  await dialog.locator("#fret-reach-left").fill("0");
  await dialog.locator("#fret-reach-right").fill("1");
  await expect(dialog).toContainText("11 positions asked");
  await expect.poll(boardWidth).toBeGreaterThan(wide);

  // RESET goes back to the three frets each way the deck ships with.
  await dialog.getByRole("button", { name: /^RESET/ }).click();
  await expect(dialog).toContainText("41 positions asked");
  await expect(dialog.getByRole("button", { name: /^RESET/ })).toBeDisabled();

  // Cancelling puts the board back rather than leaving it on the dragged one.
  await dialog.getByRole("button", { name: "CANCEL" }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(boardWidth).toBeCloseTo(wide, 0);

  // The board is sized on the card itself, screen width and all — which is
  // not a multiple of anything and so cannot be pinched to.
  await arrangeCard(page);
  const bar = page.getByRole("group", { name: "Arrange card" });
  const window = card.locator(".fret-window");
  const screen = (await page.locator(".card-rotator").boundingBox())!.width;
  const windowWidth = async () => (await window.boundingBox())!.width;
  expect(await windowWidth()).toBeCloseTo(screen, 0);

  await wheelOver(page, window, -2);
  await expect(bar).toContainText("Diagram");
  await expect.poll(windowWidth).toBeLessThan(screen - 10);

  // The width of the screen is a width rather than a multiple of one, so a
  // pinch cannot reach it and the bar offers it by name.
  await page.getByRole("button", { name: "Screen width" }).click();
  await expect(bar).toContainText("Screen width");
  await expect.poll(windowWidth).toBeCloseTo(screen, 0);
});

test("adds more cards from the deck's menu", async ({ page, shot }) => {
  await openDeckList(page);
  // A deck with more unstudied cards than the daily limit, so raising the
  // limit is what decides how many new cards are offered.
  await study(page, "Intervals");
  await expect(page.locator(".count.new")).toHaveText("20");

  await openStudyMore(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".extra-section")).toHaveCount(3);
  await expect(dialog.getByRole("button", { name: "ADD" })).toBeDisabled();
  await shot("study-more");

  await dialog.getByRole("button", { name: "+5" }).first().click();
  await expect(dialog.getByRole("button", { name: "ADD 5" })).toBeEnabled();
  await dialog.getByRole("button", { name: "ADD 5" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator(".count.new")).toHaveText("25");
  await shot("after-add");
});

test("offers ten more new cards once the day's are done", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  // A deck with more unstudied cards than the daily limit, so there is still
  // something to offer once the day's twenty are done.
  await study(page, "Intervals");
  const newCount = page.locator(".count.new");
  await expect(newCount).toHaveText("20");

  // Nothing to shortcut while the day's new cards are still coming.
  await page.getByRole("button", { name: "Deck actions" }).click();
  const shortcut = page.getByRole("menuitem", {
    name: "10 more new cards today",
  });
  await expect(shortcut).toBeHidden();
  await page.keyboard.press("Escape");

  // GOOD puts a new card ten minutes out, so the twenty come one after
  // another rather than the learning queue cutting in.
  for (let remaining = 20; remaining > 0; remaining -= 1) {
    await page.getByRole("button", { name: "SHOW ANSWER" }).click();
    await page.getByRole("button", { name: "GOOD" }).click();
    await expect(newCount).toHaveText(String(remaining - 1));
  }

  await page.getByRole("button", { name: "Deck actions" }).click();
  await expect(shortcut).toBeVisible();
  await shot("sheet-offers-ten-more");

  // One press raises the limit and closes the sheet, where the study-more
  // dialog would be three.
  await shortcut.click();
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(newCount).toHaveText("10");
  await shot("after-ten-more");
});

test("picks interval cards out of the frequency grid", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  await expect(deckRow(page, "Intervals")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });

  // The flat deck has no subdecks to study one degree at a time.
  await expect(page.locator(".deck-name", { hasText: /^P5$/ })).toHaveCount(0);

  await deckRow(page, "Intervals").locator(".deck-settings").click();
  const dialog = page.getByRole("dialog");
  // Most-used first, both ways: C P5 is the corner cell.
  await expect(dialog.locator("tbody tr").first().locator("th")).toHaveText(
    "C",
  );
  await expect(dialog.locator("thead th").nth(1)).toHaveText("P5");
  await expect(dialog.locator("tbody td").first()).toHaveText("(9,769)");
  await shot("interval-grid");

  // Dragging the threshold to the top leaves the single most-used pair on.
  const slider = dialog.getByRole("slider");
  await slider.fill(String(await slider.getAttribute("max")));
  await expect(dialog.locator(".cell.on")).toHaveCount(1);

  // A cell is a toggle of its own.
  await dialog.locator("tbody td").nth(1).locator("button").click();
  await expect(dialog.locator(".cell.on")).toHaveCount(2);

  await dialog.getByRole("button", { name: "APPLY" }).click();
  await expect(dialog).toBeHidden();
  await expect(deckRow(page, "Intervals").locator(".count.new")).toHaveText(
    "2",
  );
});

test("walks the deck list with the arrow keys", async ({ page }) => {
  await openDeckList(page);
  await expect(deckRow(page, "Guitar Fretboard")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });

  const focusedDeck = () =>
    page.evaluate(
      () =>
        (document.activeElement?.closest(".deck-row") as HTMLElement | null)
          ?.dataset.deck ?? null,
    );

  // The first press lands on the first row, whatever had the focus.
  await page.keyboard.press("ArrowDown");
  expect(await focusedDeck()).toBe("Music Staff");
  await page.keyboard.press("ArrowDown");
  expect(await focusedDeck()).toBe("Music Staff::Staff → Note");

  // Left folds the row the focus is on, right opens it again.
  await expect(deckRow(page, "Treble Clef")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(deckRow(page, "Treble Clef")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(deckRow(page, "Treble Clef")).toBeVisible();

  await page.keyboard.press("ArrowUp");
  expect(await focusedDeck()).toBe("Music Staff");
  // The row is a button, so Enter studies what the arrows landed on.
  await settleDeckImports(page);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Music Staff" }),
  ).toBeVisible();
});

test("turns decks off and on again from the deck list", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  await expect(deckRow(page, "Guitar Fretboard")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });

  await page.getByRole("button", { name: "CHOOSE DECKS" }).click();
  const dialog = page.getByRole("dialog");
  await shot("choose-decks");
  await dialog.getByRole("checkbox", { name: "Guitar Fretboard" }).uncheck();

  // A deck under one that is off goes with it, and turning that one back on
  // brings the branch it hangs from with it, but not its siblings.
  const child = dialog.getByRole("checkbox", { name: "Position → Note" });
  await expect(child).not.toBeChecked();
  await child.check();
  await expect(
    dialog.getByRole("checkbox", { name: "Guitar Fretboard" }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("checkbox", { name: "Note → Positions" }),
  ).not.toBeChecked();
  await dialog.getByRole("button", { name: "APPLY" }).click();

  await expect(deckRow(page, "Guitar Fretboard")).toBeVisible();
  await expect(deckRow(page, "Position → Note")).toBeVisible();
  await expect(deckRow(page, "Note → Positions")).toHaveCount(0);

  // And RESET puts the list back to the decks the packages ship on.
  await page.getByRole("button", { name: "CHOOSE DECKS" }).click();
  const reset = dialog.getByRole("button", { name: /^RESET/ });
  await reset.click();
  await expect(reset).toBeDisabled();
  await dialog.getByRole("button", { name: "APPLY" }).click();
  await expect(deckRow(page, "Guitar Fretboard")).toBeVisible();
  await expect(deckRow(page, "Alto Clef")).toHaveCount(0);
});

test("ships the deeper decks turned off", async ({ page, shot }) => {
  await openDeckList(page);
  await expect(deckRow(page, "Guitar Fretboard")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });

  // The circle of fifths and staff reading with octave numbers are off until
  // they are asked for; nothing on the list says "advanced" any more.
  const circle = deckRow(page, "\\(Experimental\\) Circle of Fifths");
  await expect(circle).toHaveCount(0);
  await expect(
    deckRow(page, "Music Staff \\(with Octave Numbers\\)"),
  ).toHaveCount(0);
  // The clefs only violists and trombonists read ship off too.
  await expect(deckRow(page, "Alto Clef")).toHaveCount(0);
  await expect(deckRow(page, "Tenor Clef")).toHaveCount(0);
  await expect(deckRow(page, "Treble Clef")).toBeVisible();
  await expect(page.getByText("Show advanced decks")).toHaveCount(0);

  // Turning the head of the branch on brings the branch with it.
  await page.getByRole("button", { name: "CHOOSE DECKS" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("checkbox", { name: "(Experimental) Circle of Fifths" })
    .check();
  await expect(
    dialog.getByRole("checkbox", { name: "Note → Cell", exact: true }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "APPLY" }).click();

  await expect(circle).toBeVisible();
  await shot("advanced-decks");
});

test("turns the card sideways while it is being arranged", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.locator(".card-rotator");

  // The card is the screen while it is being arranged, so every turn is one
  // press and the card behind the press is what answers it.
  await arrangeCard(page);
  const clockwise = page.getByRole("button", { name: "Rotate clockwise" });
  const anticlockwise = page.getByRole("button", {
    name: "Rotate anticlockwise",
  });

  await clockwise.click();
  await expect(card).toHaveClass(/clockwise/);
  await expect(clockwise).toHaveAttribute("title", "Clockwise");
  await shot("rotated-clockwise");

  // A second press the same way stands the card on its head.
  await clockwise.click();
  await expect(card).toHaveClass(/upside-down/);
  await expect(clockwise).toHaveAttribute("title", "Upside down");

  await clockwise.click();
  await expect(card).toHaveClass(/anticlockwise/);

  // The fourth press brings it back upright, and the other button turns it
  // back the way it came.
  await clockwise.click();
  await expect(card).not.toHaveClass(/clockwise|upside-down/);
  await expect(clockwise).toHaveAttribute("title", "Upright");
  await anticlockwise.click();
  await expect(card).toHaveClass(/anticlockwise/);
  await expect(clockwise).toHaveAttribute("title", "Anticlockwise");

  // The app bar and the answer buttons never turn with it.
  await page.getByRole("button", { name: "DONE" }).click();
  await expect(page.getByRole("button", { name: "SHOW ANSWER" })).toBeVisible();
});

test("puts the answer buttons where they are dragged", async ({
  page,
  shot,
}) => {
  // A phone held upright, which is what a card turned sideways is read on.
  await page.setViewportSize({ width: 390, height: 844 });
  await openDeckList(page);
  await study(page, "Treble Clef");
  const cardArea = page.locator(".card-area");
  const acrossTheBottom = (await cardArea.boundingBox())!;
  const showAnswer = page.getByRole("button", { name: "SHOW ANSWER" });
  const bar = page.getByRole("group", { name: "Arrange card" });

  // Eleven places, dragged onto rather than chosen from a list: the row is
  // taken hold of where it is and let go where it is wanted.
  await arrangeCard(page);
  await shot("arranging-the-answer-row");

  // One end of the foot rather than the whole of it: the row leaves the
  // column, so the card has the height it was costing.
  await placeAnswerAt(page, 60, 830);
  await expect(bar).toContainText("Bottom left");
  // The bar gets out of its way: one lying over the row is a row that cannot
  // be dragged out from under it.
  const said = (await bar.boundingBox())!;
  expect(said.y + said.height).toBeLessThan(
    (await page.locator("footer.bottom").boundingBox())!.y + 2,
  );
  const flat = (await showAnswer.boundingBox())!;
  expect((await cardArea.boundingBox())!.height).toBeGreaterThan(
    acrossTheBottom.height,
  );
  expect(flat.width).toBeGreaterThan(flat.height);
  expect(flat.x).toBeLessThan(195);
  await shot("answer-bottom-left");

  // Turning the card leaves them where they are — the edge is asked for, not
  // taken from the turn.
  await page.getByRole("button", { name: "Rotate clockwise" }).click();
  const turned = (await showAnswer.boundingBox())!;
  expect(turned.width).toBeGreaterThan(turned.height);

  // A side on its own stands them on end and spreads them down the whole of
  // it, with the counts at the near end.
  await placeAnswerAt(page, 10, 420);
  await expect(bar).toContainText("Answer buttons Left");
  const rail = (await showAnswer.boundingBox())!;
  expect(rail.x).toBeLessThan(100);
  expect(rail.height).toBeGreaterThan(400);
  const railCounts = (await page.locator(".counts").boundingBox())!;
  expect(railCounts.y).toBeLessThan(rail.y);
  await shot("answer-rail-left");

  // One end of that side instead: the buttons packed into the corner and the
  // counts at the other end.
  await placeAnswerAt(page, 10, 700);
  await expect(bar).toContainText("Left bottom");
  const strip = (await showAnswer.boundingBox())!;
  expect(strip.height).toBeGreaterThan(strip.width);
  expect(strip.height).toBeLessThan(400);
  expect(strip.x).toBeLessThan(100);
  expect(strip.y + strip.height).toBeGreaterThan(700);
  expect((await page.locator(".counts").boundingBox())!.y).toBeLessThan(
    strip.y,
  );

  // And across to the top of the other side, in one drag rather than four
  // presses.
  await placeAnswerAt(page, 380, 120);
  await expect(bar).toContainText("Right top");
  const topRight = (await showAnswer.boundingBox())!;
  expect(topRight.x).toBeGreaterThan(290);
  // Below the app bar, not under it.
  expect(topRight.y).toBeGreaterThanOrEqual(56);
  expect(topRight.y).toBeLessThan(200);
  await page.getByRole("button", { name: "DONE" }).click();
  await shot("answer-right-top");

  // The eases stand in the strip too, AGAIN at the end the card's own bottom
  // left corner is at.
  await showAnswer.click();
  const eases = (await page.locator(".eases").boundingBox())!;
  expect(eases.height).toBeGreaterThan(eases.width);
  expect(eases.x).toBeGreaterThan(290);
  expect((await page.locator(".ease.again").boundingBox())!.y).toBeLessThan(
    (await page.locator(".ease.easy").boundingBox())!.y,
  );
  await shot("eases-right-top");

  // A side on its own shares itself between the four of them, as the foot
  // shares its width.
  await arrangeCard(page);
  await placeAnswerAt(page, 10, 420);
  const railEases = (await page.locator(".eases").boundingBox())!;
  expect(railEases.height).toBeGreaterThan(400);
  // A quarter each, but for the lines between them.
  const share = (await page.locator(".ease.again").boundingBox())!.height;
  expect(Math.abs(share - railEases.height / 4)).toBeLessThan(2);
  await shot("eases-rail-left");

  // Beside an upright card they stand on the edge they are on, as though it
  // were the foot of the screen: down the right, AGAIN is at the bottom,
  // which is where the left of the row lands when the phone is turned to
  // bring that edge down.
  await placeAnswerAt(page, 380, 700);
  await expect(bar).toContainText("Right bottom");
  const anticlockwise = page.getByRole("button", {
    name: "Rotate anticlockwise",
  });
  await anticlockwise.click();
  await expect(anticlockwise).toHaveAttribute("title", "Upright");
  await page.getByRole("button", { name: "DONE" }).click();
  expect((await page.locator(".ease.again").boundingBox())!.y).toBeGreaterThan(
    (await page.locator(".ease.easy").boundingBox())!.y,
  );
  await shot("upright-right-bottom");

  // Arranging the card is a history entry, so the back button closes it and
  // leaves the card where it was — and the next press leaves the deck, since
  // it took the sheet's entry rather than pushing one behind itself.
  await arrangeCard(page);
  await page.goBack();
  await expect(bar).toBeHidden();
  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  await page.goBack();
  await expect(deckRow(page, "Treble Clef")).toBeVisible();
});

test("sizes each part of the card by pinching it", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.frameLocator('iframe[title="card"]');
  const staff = card.locator("svg.staff");
  const keyboard = card.locator(".keyboard-frame");
  const staffWidth = async () => (await staff.boundingBox())?.width ?? 0;
  const nameSize = async () =>
    Number(
      (
        await card
          .locator(".key-name")
          .evaluate((el) => getComputedStyle(el).fontSize)
      ).replace("px", ""),
    );

  // The answer's name is written by the card rather than drawn into the
  // keyboard, so it needs to be on screen to be measured.
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  const staffBefore = await staffWidth();
  const keyboardBefore = (await keyboard.boundingBox())!.width;

  // A mouse has the wheel where a finger has the pinch, and each part is
  // sized where it is drawn rather than from a row in a sheet covering it.
  await arrangeCard(page);
  const bar = page.getByRole("group", { name: "Arrange card" });
  await wheelOver(page, staff, 2);
  await expect(bar).toContainText("Staff");
  await expect.poll(staffWidth).toBeGreaterThan(staffBefore);
  const staffGrown = await staffWidth();

  // Only that part: the keyboard beside it keeps the size it had.
  expect((await keyboard.boundingBox())!.width).toBeCloseTo(keyboardBefore, 0);
  await wheelOver(page, keyboard, -2);
  await expect(bar).toContainText("Keyboard");
  await expect
    .poll(async () => (await keyboard.boundingBox())!.width)
    .toBeLessThan(keyboardBefore);
  expect(await staffWidth()).toBeCloseTo(staffGrown, 0);

  // The answer's name is not a part of its own — a question side has none at
  // all to take hold of — so it is stepped from the sheet. It is written over
  // the keyboard and sized against it, so it is measured once the keyboard is
  // the size it is going to be.
  await page.getByRole("button", { name: "DONE" }).click();
  const nameBefore = await nameSize();
  await page.getByRole("button", { name: "Deck actions" }).click();
  await page.getByRole("button", { name: "Answer size larger" }).click();
  await expect(page.getByRole("group", { name: "Answer size" })).toContainText(
    "110%",
  );
  await expect.poll(nameSize).toBeCloseTo(nameBefore * 1.1, 0);

  // And they are remembered for the next card.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "GOOD" }).click();
  await expect.poll(staffWidth).toBeCloseTo(staffGrown, 0);
});

test("draws the staff at one size however many notes it asks", async ({
  page,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.frameLocator('iframe[title="card"]');
  const line = card.locator('svg.staff .staff__line[data-line="1"]');
  const lineWidth = async () => (await line.boundingBox())?.width ?? 0;
  const basic = await lineWidth();
  expect(basic).toBeGreaterThan(0);

  await openNoteSettings(page);
  await page.getByRole("radio", { name: /^All/ }).check();
  await page.getByRole("button", { name: "APPLY" }).click();

  // The card trims the image to the notes that can come up, and trimming is
  // all it does: a reader who takes on the far ledger lines gets a taller
  // staff, not a larger one.
  await expect.poll(lineWidth).toBeCloseTo(basic, 0);
});

test("frames the staff for every clef the deck asks", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Staff → Note");
  const card = page.frameLocator('iframe[title="card"]');
  const staff = card.locator("svg.staff");
  // The image keeps its own height and the bands cut off it are taken out of
  // the layout, so it is the row around it that says how much is shown.
  const shownHeight = async () =>
    (await card.locator(".diagram").first().boundingBox())?.height ?? 0;
  const clef = staff.locator(".staff__clef");

  // Both clefs start on Basic, and this card is a bass one.
  await expect(clef).toHaveAttribute("data-clef", "bass");
  const basic = await shownHeight();

  // Taking the treble clef out to every note it can carry makes room on the
  // bass cards too: the two clefs follow one another in this deck, and a
  // staff cropped to each clef's own notes would jump between them.
  await openNoteSettings(page);
  await page
    .locator(".deck-section")
    .first()
    .getByRole("radio", { name: /^All/ })
    .check();
  await page.getByRole("button", { name: "APPLY" }).click();

  await expect.poll(shownHeight).toBeGreaterThan(basic);
  await expect(clef).toHaveAttribute("data-clef", "bass");
});

test("keeps the whole actions sheet on a screen turned sideways", async ({
  page,
}) => {
  // A phone on its side: the sheet has more rows than fit.
  await page.setViewportSize({ width: 740, height: 360 });
  await openDeckList(page);
  await study(page, "Treble Clef");
  await page.getByRole("button", { name: "Deck actions" }).click();

  const sheet = page.getByRole("menu");
  const box = (await sheet.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);

  // The sheet opens on its first row, and what does not fit is scrolled to
  // rather than lost off the top of the screen.
  const first = page.getByRole("menuitem", { name: "Study more today" });
  const last = page.getByRole("menuitem", { name: "Reset study progress" });
  await expect(first).toBeInViewport();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});

test("cuts the app bar down to its buttons", async ({ page, shot }) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await openDeckList(page);
  await study(page, "Treble Clef");
  const bar = page.locator(".appbar");
  const title = bar.locator("h1");
  await expect(title).toHaveText("Treble Clef");
  const cardArea = page.locator(".card-area");
  const before = (await cardArea.boundingBox())!;

  await page.getByRole("button", { name: "Deck actions" }).click();
  await page
    .getByRole("menuitemcheckbox", { name: "Minimize app bar" })
    .click();
  await page.keyboard.press("Escape");

  // The name of the deck goes; the way back and the way to these settings
  // stay, because on a phone the arrow may be the only way back there is.
  await expect(title).toBeHidden();
  await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Deck actions" })).toBeVisible();
  // The bar is out of the column now, so the card has the screen from the top
  // down — the whole bar's worth of height, not just the title's.
  const after = (await cardArea.boundingBox())!;
  expect(after.y).toBe(0);
  expect(after.height).toBeGreaterThan(before.height);
  expect((await bar.boundingBox())!.y).toBe(0);
  await shot("minimal-app-bar");

  // It is the reader's, not the deck's, so it holds across decks.
  await page.getByRole("button", { name: "Back" }).click();
  await deckRow(page, "Bass Clef").locator(".deck-study").click();
  await expect(page.locator(".count.new")).not.toHaveText("0");
  await expect(title).toHaveText("Bass Clef");
  await expect(title).toBeHidden();
});

test("moves one part of the card without moving the rest", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.frameLocator('iframe[title="card"]');
  const staff = card.locator(".diagram:not(.keyboard)");
  const keyboard = card.locator(".diagram.keyboard");
  const staffBefore = (await staff.boundingBox())!;
  const keyboardBefore = (await keyboard.boundingBox())!;

  await arrangeCard(page);
  const bar = page.getByRole("group", { name: "Arrange card" });
  await expect(bar).toContainText("Drag to move");
  await shot("moving-card-parts");

  // The card is the screen: the part is dragged where it is wanted rather
  // than stepped from behind a sheet covering it.
  await dragBy(page, staff, { x: 40, y: 60 });
  await expect(bar).toContainText("Staff");
  const moved = (await staff.boundingBox())!;
  // Where the finger left it, to within the grain an offset is stored at.
  expectNear(moved.x - staffBefore.x, 40);
  expectNear(moved.y - staffBefore.y, 60);
  // The keyboard under it is a part of its own and stays where it was: the
  // card is set out piece by piece rather than pushed about as a whole.
  expectNear((await keyboard.boundingBox())!.y, keyboardBefore.y);
  await shot("card-part-moved");

  // The drawing moves with its row and no further. A deck names the row it
  // draws in, and the drawing inside can carry that same name: moved once for
  // each, a keyboard travelled twice as far as the box around it.
  const drawn = card.locator("svg.keyboard");
  const rowBefore = (await keyboard.boundingBox())!;
  const drawnBefore = (await drawn.boundingBox())!;
  await dragBy(page, keyboard, { x: -30, y: 20 });
  const rowAfter = (await keyboard.boundingBox())!;
  const drawnAfter = (await drawn.boundingBox())!;
  expectNear(rowAfter.x - rowBefore.x, -30);
  expectNear(drawnAfter.x - drawnBefore.x, rowAfter.x - rowBefore.x);
  expectNear(drawnAfter.y - drawnBefore.y, rowAfter.y - rowBefore.y);

  // And the staff's row says nothing down the side of the card: a drawing
  // larger than the card is cut off at its edges rather than making the row
  // something to be scrolled, which would put a scrollbar over the card.
  expect(
    await staff.evaluate((element) => getComputedStyle(element).overflow),
  ).toBe("clip");

  // Where the parts are is the deck's, and it outlasts the mode: coming back
  // to the card finds them where they were left.
  await page.getByRole("button", { name: "DONE" }).click();
  await expect(bar).toBeHidden();
  await page.getByTitle("Back").click();
  await study(page, "Treble Clef");
  expectNear((await staff.boundingBox())!.x, moved.x);

  await arrangeCard(page);
  await page.getByRole("button", { name: "Reset" }).click();
  const reset = (await staff.boundingBox())!;
  expectNear(reset.x, staffBefore.x);
  expectNear(reset.y, staffBefore.y);

  // The back button leaves the mode, as it closes every other screen.
  await page.goBack();
  await expect(bar).toBeHidden();
  await expect(page.getByRole("button", { name: "SHOW ANSWER" })).toBeVisible();
});

// A part is moved in the card's own directions: turned sideways, the card's
// down is the screen's left, and the finger that drags it goes that way too.
test("sizes a part with two fingers, and turns the card with them", async ({
  page,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.frameLocator('iframe[title="card"]');
  const staff = card.locator("svg.staff");
  const staffWidth = async () => (await staff.boundingBox())!.width;
  const before = await staffWidth();

  await arrangeCard(page);
  const bar = page.getByRole("group", { name: "Arrange card" });
  const middle = await centreInCard(page, staff);
  const apart = (half: number, lift = 0) => [
    { x: middle.x - half, y: middle.y },
    { x: middle.x + half, y: middle.y + lift },
  ];

  // Drawn apart, the part under them grows by as much as they did.
  await touchCard(page, "touchstart", apart(60));
  await touchCard(page, "touchmove", apart(90));
  await touchCard(page, "touchend", apart(90));
  await expect(bar).toContainText("Staff 150%");
  await expect.poll(staffWidth).toBeCloseTo(before * 1.5, 0);

  // Twisted far enough, the card turns a quarter with them.
  await touchCard(page, "touchstart", apart(60));
  await touchCard(page, "touchmove", apart(60, 90));
  await touchCard(page, "touchend", apart(60, 90));
  await expect(page.locator(".card-rotator")).toHaveClass(/clockwise/);
});

test("crops a keyboard larger than the card, centred on it", async ({
  page,
}) => {
  await openDeckList(page);
  await study(page, "Intervals");
  const card = page.frameLocator('iframe[title="card"]');
  const row = card.locator(".diagram.keyboard");
  const drawn = card.locator(".keyboard-frame");
  const middleOf = async (
    locator: ReturnType<ReturnType<Page["frameLocator"]>["locator"]>,
  ) => {
    const box = (await locator.boundingBox())!;
    return box.x + box.width / 2;
  };

  await arrangeCard(page);
  const middle = await middleOf(row);
  expectNear(await middleOf(drawn), middle);

  await wheelOver(page, row, 6);
  const grown = (await drawn.boundingBox())!;
  expect(grown.width).toBeGreaterThan((await row.boundingBox())!.width);

  // Wider than the card and still centred on it: the middle of the keyboard —
  // the boundary the deck draws every card around — stays in the middle of
  // the card, and both ends are cut off alike.
  expectNear(await middleOf(drawn), middle);

  // Cut off rather than scrolled: a row that can be scrolled puts a scrollbar
  // over the card, and where it was scrolled to is not remembered.
  expect(
    await row.evaluate((element) => {
      element.scrollLeft = 999;
      return {
        scrolledTo: element.scrollLeft,
        overflow: getComputedStyle(element).overflow,
      };
    }),
  ).toEqual({ scrolledTo: 0, overflow: "clip" });
});

test("drags a part in the card's own directions", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.frameLocator('iframe[title="card"]');
  const staff = card.locator(".diagram:not(.keyboard)");

  await arrangeCard(page);
  await page.getByRole("button", { name: "Rotate clockwise" }).click();
  const before = (await staff.boundingBox())!;
  await dragBy(page, staff, { x: -50, y: 0 });

  const moved = (await staff.boundingBox())!;
  expectNear(moved.x - before.x, -50);
  expectNear(moved.y, before.y);
  await expect(page.getByRole("group", { name: "Arrange card" })).toContainText(
    "Staff",
  );
});

test("keeps the card turned after leaving the deck", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");

  const rotator = page.locator(".card-rotator");
  await arrangeCard(page);
  await page.getByRole("button", { name: "Rotate clockwise" }).click();
  await expect(rotator).toHaveClass(/clockwise/);
  await page.getByRole("button", { name: "DONE" }).click();

  // Back to the list and in again: the turn is a setting, not a mood.
  await page.getByTitle("Back").click();
  await expect(deckRow(page, "Treble Clef")).toBeVisible();
  await deckRow(page, "Treble Clef").locator(".deck-study").click();
  await expect(rotator).toHaveClass(/clockwise/);

  // The decks of a package draw the same card, so its other clefs are turned
  // with it.
  await page.getByTitle("Back").click();
  await study(page, "Bass Clef");
  await expect(rotator).toHaveClass(/clockwise/);

  // Another package is not: its own card is its own to turn.
  await page.getByTitle("Back").click();
  await study(page, "Guitar Fretboard");
  await expect(rotator).not.toHaveClass(/clockwise/);
});

test("resets a deck from its long-press menu", async ({ page, shot }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await page.getByRole("button", { name: "GOOD" }).click();
  await expect(page.locator(".count.learn")).toHaveText("1");
  await page.getByRole("button", { name: "Back" }).click();

  // A long press is a right click on the desktop.
  await deckRow(page, "Treble Clef").click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await shot("deck-actions");

  await page.getByRole("menuitem", { name: "Reset study progress" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("1 / 33 cards");
  await shot("reset-confirmation");

  await dialog.getByRole("button", { name: "RESET 1 CARDS" }).click();

  await expect(deckRow(page, "Treble Clef").locator(".count.learn")).toHaveText(
    "0",
  );
  await expect(deckRow(page, "Treble Clef").locator(".count.new")).toHaveText(
    "19",
  );
  await shot("after-reset");
});

test("resets the deck being studied from its menu", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await page.getByRole("button", { name: "AGAIN" }).click();
  await expect(page.locator(".count.learn")).toHaveText("1");

  await page.getByRole("button", { name: "Deck actions" }).click();
  await page.getByRole("menuitem", { name: "Reset study progress" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^RESET/ })
    .click();

  await expect(page.locator(".count.learn")).toHaveText("0");
  await expect(page.locator(".count.new")).toHaveText("19");
});

test("closes study more with the browser back button", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");

  await openStudyMore(page);
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.goBack();

  // Back closes the dialog rather than leaving the deck.
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Treble Clef" }),
  ).toBeVisible();
});

test("closes the deck chooser and the actions sheet with back", async ({
  page,
}) => {
  await openDeckList(page);
  await expect(deckRow(page, "Intervals")).toBeVisible({
    timeout: IMPORT_TIMEOUT,
  });

  await page.getByRole("button", { name: "CHOOSE DECKS" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(deckRow(page, "Intervals")).toBeVisible();

  // A long press is a right click on the desktop.
  await deckRow(page, "Intervals").click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(deckRow(page, "Intervals")).toBeVisible();

  // The sheet hands over to the settings rather than stacking under them, so
  // one press of back from there lands on the list.
  await deckRow(page, "Intervals").click({ button: "right" });
  await page.getByRole("menuitem", { name: "What to ask" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(deckRow(page, "Intervals")).toBeVisible();
});

test("sets every clef under the deck being studied", async ({ page, shot }) => {
  await openDeckList(page);
  await study(page, "Staff → Note");

  // The parent asks all its clefs, so its gear offers all of them — bar the
  // ones the reader has turned off, which it does not ask either.
  await openNoteSettings(page);
  const sections = page.locator(".deck-section");
  await expect(sections).toHaveCount(2);
  await expect(sections.first()).toContainText("Treble Clef");
  await expect(sections.nth(1)).toContainText("Bass Clef");
  await expect(sections.nth(1)).not.toContainText("Alto Clef");
  await shot("parent-deck-note-settings");

  // Each section sets its own clef, and one APPLY saves them together.
  const counts = sections.locator(".selected-count");
  const before = await counts.allTextContents();
  await sections.first().getByRole("radio", { name: /^All/ }).check();
  await sections.nth(1).getByRole("radio", { name: /Advanced/ }).check();
  await page.getByRole("button", { name: "APPLY" }).click();

  await openNoteSettings(page);
  const after = await counts.allTextContents();
  expect(after[0]).not.toBe(before[0]);
  expect(after[1]).not.toBe(before[1]);
  await expect(
    sections.first().getByRole("radio", { name: /^All/ }),
  ).toBeChecked();
  await expect(
    sections.nth(1).getByRole("radio", { name: /Advanced/ }),
  ).toBeChecked();
});

test("chooses a clef's notes on the staff itself", async ({ page, shot }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  await openNoteSettings(page);

  // Every note the clef can carry, drawn on one staff and named under it.
  const notes = page.locator("[data-pitch]");
  await expect(notes).toHaveCount(33);
  const count = page.locator(".selected-count");
  await expect(count).toHaveText("19 / 33 selected");
  await expect(page.getByRole("radio", { name: /^Basic/ })).toBeChecked();
  await shot("staff-note-settings");

  // A tap anywhere in a note's column turns it on or off.
  const d3 = page.locator('[data-pitch="D3"]');
  await expect(d3).toHaveAttribute("aria-checked", "false");
  await d3.click();
  await expect(d3).toHaveAttribute("aria-checked", "true");
  await expect(count).toHaveText("20 / 33 selected");
  await expect(page.getByRole("radio", { name: "Custom" })).toBeChecked();
  await shot("staff-note-chosen");

  const g3 = page.locator('[data-pitch="G3"]');
  await g3.click();
  await expect(g3).toHaveAttribute("aria-checked", "false");
  await expect(count).toHaveText("19 / 33 selected");

  // And what was tapped is what is studied.
  await page.getByRole("button", { name: "APPLY" }).click();
  await openNoteSettings(page);
  await expect(page.locator('[data-pitch="D3"]')).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.locator('[data-pitch="G3"]')).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("closes the note settings with the browser back button", async ({
  page,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");

  await openNoteSettings(page);
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.goBack();

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Treble Clef" }),
  ).toBeVisible();

  // A screen opened from the sheet takes the sheet's history entry rather
  // than pushing a second one, so the next press leaves the deck instead of
  // landing on an entry with nothing on it.
  await page.goBack();
  await expect(deckRow(page, "Treble Clef")).toBeVisible();
});

test("carries the study progress out to a file and back in", async ({
  page,
  shot,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  await page.getByRole("button", { name: "SHOW ANSWER" }).click();
  await page.getByRole("button", { name: "GOOD" }).click();
  await expect(page.locator(".count.learn")).toHaveText("1");
  await page.getByTitle("Back").click();

  await page.getByRole("button", { name: "BACKUP" }).click();
  const dialog = page.getByRole("dialog");
  const studied = dialog.locator(".counts div").first().locator("dd");
  await expect(studied).toHaveText("1");
  await shot("backup");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "EXPORT" }).click(),
  ]);
  const file = await download.path();
  await dialog.getByRole("button", { name: "CANCEL" }).click();

  // Thrown away the way a reader on a new browser would never have had it.
  await deckRow(page, "Treble Clef").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Reset study progress" }).click();
  await dialog.getByRole("button", { name: "RESET 1 CARDS" }).click();
  await expect(deckRow(page, "Treble Clef").locator(".count.learn")).toHaveText(
    "0",
  );

  await page.getByRole("button", { name: "BACKUP" }).click();
  await expect(studied).toHaveText("0");
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await expect(dialog).toContainText("1 card, 1 answer");
  await shot("backup-chosen");

  await dialog.getByRole("button", { name: "RESTORE" }).click();
  await expect(dialog).toContainText("Restored 1 card, 1 answer");
  await shot("backup-restored");
  await dialog.getByRole("button", { name: "RELOAD" }).click();

  await expect(deckRow(page, "Treble Clef").locator(".count.learn")).toHaveText(
    "1",
    { timeout: IMPORT_TIMEOUT },
  );
});
