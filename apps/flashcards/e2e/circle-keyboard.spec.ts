// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test, type Page } from "@playwright/test";
import { CARDS, type CardDefinition } from "../../../decks/circle-of-fifths/src/cards";
import { createWebDeckData } from "../../../decks/circle-of-fifths/src/apkg";
import { createWebDeckArtifacts } from "../../../decks/circle-of-fifths/src/generate";
import { buildCardDocument, renderTemplate } from "../src/lib/template";

const artifacts = createWebDeckArtifacts();
const model = createWebDeckData(artifacts.notes, artifacts.media).models[0];
const notes = new Map(artifacts.notes.map((note) => [note.id, note]));

async function show(page: Page, card: CardDefinition, back: boolean, showKeyboard?: boolean) {
  const note = notes.get(card.id)!;
  const fields = Object.fromEntries(model.fieldNames.map((name, index) => [name, note.fields[index]]));
  await page.setContent(buildCardDocument({
    html: renderTemplate(back ? model.templates[0].afmt : model.templates[0].qfmt, fields),
    css: model.css,
    nightMode: true,
    showKeyboard,
  }));
}

// Expectations come from card definitions, independently of template payloads.
function pitches(spellings: readonly string[]): number[] {
  const naturals: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return [...new Set(spellings.map((note) => {
    const accidental = [...note.slice(1)].reduce((sum, char) => sum + (char === "#" ? 1 : -1), 0);
    return 60 + (naturals[note[0].toUpperCase()] + accidental + 12) % 12;
  }))].sort((a, b) => a - b);
}

async function markedPitches(page: Page): Promise<number[]> {
  return page.locator("svg.keyboard .is-highlighted").evaluateAll((keys) =>
    keys.map((key) => Number(key.getAttribute("data-semitone"))).sort((a, b) => a - b),
  );
}

function noteLabel(note: string): string {
  const accidentals: Record<string, string> = { "": "", b: "♭", bb: "𝄫", "#": "♯", "##": "𝄪" };
  return note[0].toUpperCase() + accidentals[note.slice(1)];
}

async function expectNoteLabels(page: Page, spellings: readonly string[]) {
  const labels = page.locator("svg.keyboard text.keyboard-note-name");
  await expect(labels).toHaveCount(spellings.length);
  expect((await labels.allTextContents()).sort()).toEqual(spellings.map(noteLabel).sort());
}

test("Circle keyboard defaults off and leaves no row or layout gap on either side", async ({ page }) => {
  for (const tag of new Set(CARDS.map((card) => card.tag))) {
    const card = CARDS.find((candidate) => candidate.tag === tag)!;
    for (const back of [false, true]) {
      for (const enabled of [undefined, false]) {
        await show(page, card, back, enabled);
        await expect(page.locator('[data-card-part="keyboard"]')).toHaveCount(0);
        await expect(page.locator("main > *")).toHaveCount(2);
        const before = await page.locator("main").boundingBox();
        await show(page, card, back, true);
        await expect(page.locator("svg.keyboard")).toBeVisible();
        await page.locator('[data-card-part="keyboard"]').evaluate((row) => row.remove());
        expect(await page.locator("main").boundingBox()).toEqual(before);
      }
    }
  }
});

test("Circle keyboard matches the Music Staff width at its default scale", async ({ page }) => {
  const card = CARDS.find((candidate) => candidate.kind === "interval")!;
  for (const { width, height } of [{ width: 390, height: 844 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize({ width, height });
    await show(page, card, false, true);
    const keyboardWidth = await page.locator(".keyboard-frame").evaluate(element => element.getBoundingClientRect().width);
    expect(keyboardWidth).toBeCloseTo(Math.min(width * 0.88, 26 * 16, height * 0.62), 1);
  }
});

test("cell answers keep both diagrams in place and stack enharmonic key labels", async ({ page }, testInfo) => {
  const card = CARDS.find((candidate) => candidate.kind === "cell-to-notes" && candidate.ring === "inner" && candidate.hour === 12);
  if (!card || card.kind !== "cell-to-notes") throw new Error("missing inner cell card");
  await page.setViewportSize({ width: 390, height: 844 });
  await show(page, card, false, true);
  const circle = page.locator('[data-card-part="board"] svg.circle-of-fifths');
  const keyboard = page.locator(".keyboard-frame");
  await expect(page.locator(".prompt-line")).toBeEmpty();
  const front = { circle: (await circle.boundingBox())!, keyboard: (await keyboard.boundingBox())! };
  await page.screenshot({ path: testInfo.outputPath("inner-cell-front.png"), fullPage: true });

  await show(page, card, true, true);
  for (const [part, locator] of [["circle", circle], ["keyboard", keyboard]] as const) {
    const after = (await locator.boundingBox())!;
    for (const dimension of ["x", "y", "width", "height"] as const) {
      expect(after[dimension], `${part} ${dimension}`).toBeCloseTo(front[part][dimension], 1);
    }
  }
  const labels = page.locator("svg.keyboard .keyboard-note-name");
  await expect(labels).toHaveCount(card.notes.length);
  const selectedKey = page.locator("svg.keyboard .is-highlighted");
  await expect(selectedKey).toHaveCount(1);
  expect(await selectedKey.evaluate((key) => getComputedStyle(key).stroke)).toBe("none");
  const circleLetters = page.locator('.circle-of-fifths__note:not([display="none"]) .circle-of-fifths__letter');
  await expect(circleLetters).toHaveCount(card.notes.length);
  for (const letter of await circleLetters.all()) {
    expect((await letter.boundingBox())!.height).toBeGreaterThanOrEqual(17);
  }
  const positions = await labels.evaluateAll((nodes) => nodes.map((node) => ({
    text: node.textContent,
    x: Number(node.getAttribute("x")),
    y: Number(node.getAttribute("y")),
    size: Number(node.getAttribute("font-size")),
  })).sort((a, b) => a.y - b.y));
  expect(new Set(positions.map(({ x }) => x)).size).toBe(1);
  expect(positions.every(({ size }) => size >= 15)).toBe(true);
  for (let index = 1; index < positions.length; index++) {
    expect(positions[index].y - positions[index - 1].y).toBeGreaterThanOrEqual(18);
  }
  await page.screenshot({ path: testInfo.outputPath("inner-cell-back.png"), fullPage: true });
});

test("interval keyboard gives both note names one font size", async ({ page }, testInfo) => {
  const card = CARDS.find((candidate) => candidate.kind === "interval" && candidate.interval === "flat3" && candidate.questionNote === "bb")!;
  await page.setViewportSize({ width: 390, height: 844 });
  await show(page, card, true, true);
  const labels = page.locator("svg.keyboard .keyboard-note-name");
  await expect(labels).toHaveText(["D♭", "B♭"]);
  const sizes = await labels.evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute("font-size"))));
  expect(sizes[0]).toBeCloseTo(sizes[1], 2);
  expect(sizes[0]).toBeGreaterThanOrEqual(18);
  await expect(page.locator("svg.keyboard .keyboard-degree")).toHaveText("♭3");
  const backdrops = page.locator("svg.keyboard .keyboard-label-backdrop");
  await expect(backdrops).toHaveCount(2);
  for (const key of await page.locator("svg.keyboard .is-highlighted").all()) {
    expect(await key.evaluate((element) => getComputedStyle(element).stroke)).not.toBe("none");
  }
  for (const backdrop of await backdrops.all()) {
    expect(await backdrop.evaluate((element) => getComputedStyle(element).fillOpacity)).toBe("0.6");
  }
  await page.screenshot({ path: testInfo.outputPath("flat3-bb-back.png"), fullPage: true });
});

for (const tag of new Set(CARDS.map((card) => card.tag))) {
  test(`${tag}: keyboard highlights only note-to-cell pitches on fronts and chart pitches on backs`, async ({ page }) => {
    for (const card of CARDS.filter((candidate) => candidate.tag === tag)) {
      const frontNotes = card.kind === "note-to-cell" ? [card.note] : [];
      const backNotes = card.kind === "cell-to-notes" ? card.notes
        : card.kind === "interval" ? [card.outerNote, card.innerNote] : [card.note];
      await show(page, card, false, true);
      const keyboard = page.locator("svg.keyboard");
      await expect(keyboard).toBeVisible();
      await expect(keyboard.locator("[data-semitone]")).toHaveCount(12);
      expect(await markedPitches(page), `${card.id} front`).toEqual(pitches(frontNotes));
      await expectNoteLabels(page, frontNotes);
      await expect(keyboard.locator("text.keyboard-degree")).toHaveCount(0);
      const before = await keyboard.boundingBox();

      await show(page, card, true, true);
      expect(await markedPitches(page), `${card.id} back`).toEqual(pitches(backNotes));
      await expectNoteLabels(page, backNotes);
      const degree = keyboard.locator("text.keyboard-degree");
      await expect(degree).toHaveCount(card.kind === "interval" ? 1 : 0);
      if (card.kind === "interval") {
        await expect(degree).toHaveText(card.interval === "major3" ? "Δ3" : "♭3");
      }
      const chartNotes = await page.locator('.circle-of-fifths__note:not([display="none"])')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-note")!));
      expect(chartNotes.sort(), card.id).toEqual([...backNotes].sort());
      const after = (await keyboard.boundingBox())!;
      expect(after.width).toEqual(before!.width);
      expect(after.height).toEqual(before!.height);
    }
  });
}

for (const example of [
  { id: "major3-g", notes: ["G", "B"], degree: "Δ3", answerPitch: 71, keyClass: "keyboard__white-key" },
  { id: "flat3-c", notes: ["C", "E♭"], degree: "♭3", answerPitch: 63, keyClass: "keyboard__black-key" },
]) {
  test(`${example.id}: labels the answer key with its note and degree`, async ({ page }, testInfo) => {
    const card = CARDS.find((candidate) => candidate.id === example.id)!;
    await show(page, card, false, true);
    await expect(page.locator("svg.keyboard .is-highlighted")).toHaveCount(0);
    await expect(page.locator("svg.keyboard text.keyboard-note-name")).toHaveCount(0);
    await expect(page.locator("svg.keyboard text.keyboard-degree")).toHaveCount(0);

    await show(page, card, true, true);
    if (example.id === "major3-g") {
      const screenshotPath = testInfo.outputPath("g-major3-back.png");
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await testInfo.attach("G major3 back", { path: screenshotPath, contentType: "image/png" });
    }
    const keyboard = page.locator("svg.keyboard");
    const labels = keyboard.locator("text.keyboard-note-name");
    await expect(labels).toHaveCount(2);
    expect((await labels.allTextContents()).sort()).toEqual([...example.notes].sort());
    const answerKey = keyboard.locator(`rect.${example.keyClass}[data-semitone="${example.answerPitch}"]`);
    await expect(answerKey).toHaveClass(/is-highlighted/);
    const degree = keyboard.locator("text.keyboard-degree");
    await expect(degree).toHaveCount(1);
    await expect(degree).toHaveText(example.degree);

    // Both labels must be drawn over the answer key, including black keys.
    // Compare in the shared SVG coordinate system, independent of browser
    // viewport transforms and scrolling.
    const keyBox = await answerKey.evaluate((node: SVGGraphicsElement) => {
      const { x, y, width, height } = node.getBBox();
      return { x, y, width, height };
    });
    for (const label of [labels.filter({ hasText: new RegExp(`^${example.notes[1]}$`) }), degree]) {
      await expect(label).toBeVisible();
      const box = await label.evaluate((node: SVGGraphicsElement) => {
        const { x, y, width, height } = node.getBBox();
        return { x, y, width, height };
      });
      expect(Math.abs(box.x + box.width / 2 - (keyBox.x + keyBox.width / 2))).toBeLessThan(1);
      expect(box.y).toBeGreaterThanOrEqual(keyBox.y);
      expect(box.y + box.height).toBeLessThanOrEqual(keyBox.y + keyBox.height);
    }
  });
}
