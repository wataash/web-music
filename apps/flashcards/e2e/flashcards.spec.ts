// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// Every test gets a fresh browser context, so the app starts with empty
// storage and imports the decks from the dev server. That takes a couple of
// seconds; the deck list fills in as each deck lands.
const IMPORT_TIMEOUT = 30_000;

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
async function openSheetAction(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Deck actions" }).click();
  await page.getByRole("menuitem", { name }).click();
}

async function openNoteSettings(page: Page): Promise<void> {
  await openSheetAction(page, "Note settings");
}

async function openStudyMore(page: Page): Promise<void> {
  await openSheetAction(page, "Study more today");
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

test("reveals the answer when the keyboard is tapped", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");

  // The staff and the keyboard are both diagrams, and tapping either one
  // stands in for SHOW ANSWER on a card with a single right answer.
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

  // The keyboard stands in for SHOW ANSWER, as the staff decks' diagrams do.
  await card.locator(".diagram.keyboard").click();

  await expect(page.getByRole("button", { name: "GOOD" })).toBeVisible();
  // The answer is spelled out in the question mark's place, and named on the
  // nearest key either side of the root.
  await expect(card.locator(".answer-value")).not.toHaveText("?");
  await expect(card.locator(".answer-value")).not.toBeEmpty();
  await expect(card.locator(".key-name")).toHaveCount(3);
  await shot("interval-answer");
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
  await card.locator(".diagram.board").click();
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

  // The board is sized like the interval deck's keyboard, screen width and
  // all.
  await page.getByRole("button", { name: "Deck actions" }).click();
  const boardSize = page.getByRole("group", { name: "Board size" });
  const screenWidth = boardSize.getByRole("button", { name: "Screen width" });
  await expect(screenWidth).toHaveAttribute("aria-pressed", "false");
  await screenWidth.click();
  await expect(screenWidth).toHaveAttribute("aria-pressed", "true");
  await expect(boardSize).toContainText("Screen width");
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

test("turns the card sideways from the deck's menu", async ({ page, shot }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.locator(".card-rotator");

  // The sheet stays open, so every turn is one press.
  await page.getByRole("button", { name: "Deck actions" }).click();
  const rotate = page.getByRole("group", { name: "Rotate card" });
  const clockwise = page.getByRole("button", { name: "Rotate clockwise" });
  const anticlockwise = page.getByRole("button", {
    name: "Rotate anticlockwise",
  });

  await clockwise.click();
  await expect(card).toHaveClass(/clockwise/);
  await expect(rotate).toContainText("Clockwise");
  await shot("rotated-clockwise");

  // A second press the same way stands the card on its head.
  await clockwise.click();
  await expect(card).toHaveClass(/upside-down/);
  await expect(rotate).toContainText("Upside down");

  await clockwise.click();
  await expect(card).toHaveClass(/anticlockwise/);

  // The fourth press brings it back upright, and the other button turns it
  // back the way it came.
  await clockwise.click();
  await expect(card).not.toHaveClass(/clockwise|upside-down/);
  await expect(rotate).toContainText("Upright");
  await anticlockwise.click();
  await expect(card).toHaveClass(/anticlockwise/);
  await expect(rotate).toContainText("Anticlockwise");

  // The app bar and the answer buttons never turn with it.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "SHOW ANSWER" })).toBeVisible();
});

test("sizes the staff, the keyboard and the answer", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const card = page.frameLocator('iframe[title="card"]');
  const staff = card.locator("svg.staff");
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
  const nameBefore = await nameSize();

  await page.getByRole("button", { name: "Deck actions" }).click();
  // The sheet stays open, and the card behind it resizes as you press.
  await page.getByRole("button", { name: "Staff size larger" }).click();
  await page.getByRole("button", { name: "Staff size larger" }).click();
  await page.getByRole("button", { name: "Answer size larger" }).click();

  await expect(page.getByRole("group", { name: "Staff size" })).toContainText(
    "120%",
  );
  await expect.poll(staffWidth).toBeCloseTo(staffBefore * 1.2, 0);
  await expect.poll(nameSize).toBeCloseTo(nameBefore * 1.1, 0);

  // The width of the screen is offered beside the stepper, not past the end
  // of it.
  const screenWidth = page.getByRole("button", { name: "Screen width" });
  await expect(screenWidth).toHaveAttribute("aria-pressed", "false");
  await screenWidth.click();
  await expect(screenWidth).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("group", { name: "Keyboard size" }),
  ).toContainText("Screen width");

  // And they are remembered for the next card.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "GOOD" }).click();
  await expect.poll(staffWidth).toBeCloseTo(staffBefore * 1.2, 0);
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

test("pushes the card down the screen, and up past the top", async ({
  page,
}) => {
  await openDeckList(page);
  await study(page, "Treble Clef");
  const area = page.locator(".card-area");
  const card = page.locator('iframe[title="card"]');
  const areaBox = (await area.boundingBox())!;

  await page.getByRole("button", { name: "Deck actions" }).click();
  const down = page.getByRole("button", { name: "Top space larger" });
  const up = page.getByRole("button", { name: "Top space smaller" });
  await down.click();
  await down.click();
  await expect(page.getByRole("group", { name: "Top space" })).toContainText(
    "10%",
  );
  const pushedDown = (await card.boundingBox())!;
  expect(pushedDown.y).toBeGreaterThan(areaBox.y);

  // Below zero the card takes height from above the area, which is cropped:
  // it starts above the area and is taller than it.
  await up.click();
  await up.click();
  await up.click();
  await up.click();
  await expect(page.getByRole("group", { name: "Top space" })).toContainText(
    "-10%",
  );
  const pulledUp = (await card.boundingBox())!;
  expect(pulledUp.y).toBeLessThan(areaBox.y);
  expect(pulledUp.height).toBeGreaterThan(areaBox.height);

  // The space is the card's own, not the phone's: turned clockwise, the card's
  // top is the screen's right, and that is the side the space is left on.
  await down.click();
  await down.click();
  await down.click();
  await down.click();
  await page.getByRole("button", { name: "Rotate clockwise" }).click();
  const turned = (await card.boundingBox())!;
  expect(turned.width).toBeLessThan(areaBox.width - 10);
  expect(turned.x).toBeLessThan(areaBox.x + 2);
});

test("keeps the card turned after leaving the deck", async ({ page }) => {
  await openDeckList(page);
  await study(page, "Treble Clef");

  const rotator = page.locator(".card-rotator");
  await page.getByRole("button", { name: "Deck actions" }).click();
  await page.getByRole("button", { name: "Rotate clockwise" }).click();
  await expect(rotator).toHaveClass(/clockwise/);
  await page.keyboard.press("Escape");

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
  await page.getByRole("menuitem", { name: "Note settings" }).click();
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
