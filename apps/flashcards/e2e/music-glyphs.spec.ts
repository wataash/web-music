// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { CARDS, type CardDefinition } from "../../../decks/circle-of-fifths/src/cards";
import { createWebDeckData } from "../../../decks/circle-of-fifths/src/apkg";
import { createWebDeckArtifacts } from "../../../decks/circle-of-fifths/src/generate";
import {
  BACK_TEMPLATE as INTERVAL_BACK_TEMPLATE,
  CARD_CSS as INTERVAL_CARD_CSS,
  FRONT_TEMPLATE as INTERVAL_FRONT_TEMPLATE,
  WEB_BACK_TEMPLATE as INTERVAL_WEB_BACK_TEMPLATE,
  WEB_FRONT_TEMPLATE as INTERVAL_WEB_FRONT_TEMPLATE,
} from "../../../decks/intervals/src/template";
import { buildCardDocument, renderTemplate } from "../src/lib/template";
import { musicGlyphMetrics, renderMusicTextHtml } from "@web-music/music-notation";
import { renderDarkCircleOfFifthsSvg } from "@circle-of-fifths/svg";
import { renderStaffRowSvg } from "@web-music/music-staff-core";

const artifacts = createWebDeckArtifacts();
const model = createWebDeckData(artifacts.notes, artifacts.media).models[0];
const notes = new Map(artifacts.notes.map((note) => [note.id, note]));

async function show(page: Page, card: CardDefinition, back: boolean, light = false) {
  const note = notes.get(card.id)!;
  const fields = Object.fromEntries(model.fieldNames.map((name, index) => [name, note.fields[index]]));
  await page.setContent(buildCardDocument({
    html: renderTemplate(back ? model.templates[0].afmt : model.templates[0].qfmt, fields),
    css: model.css + (light ? "\n.card { background: #fff; color: #111; }" : ""),
    nightMode: !light,
    showKeyboard: true,
  }));
  await page.evaluate(() => document.fonts.ready);
}

test("circle cards render flat, triangle, and sharp with readable key labels", async ({ page }, testInfo) => {
  const flat = CARDS.find((card) => card.id === "flat3-c")!;
  const major = CARDS.find((card) => card.id === "major3-g")!;
  const sharp = CARDS.find((card) => card.kind === "note-to-cell" && card.note.includes("#"))!;

  await show(page, flat, true);
  await expect(page.locator(".answer .glyph.flat")).toHaveCount(1);
  await expect(page.locator("svg.keyboard .glyph.flat")).toHaveCount(2);
  expect((await page.locator("svg.keyboard text.keyboard-note-name").allTextContents()).sort()).toEqual(["C", "E♭"].sort());
  const answerPath = page.locator(".answer .glyph.flat path");
  await expect(answerPath).toHaveAttribute("d", /^M288 283/);
  await expect(page.locator("svg.keyboard .glyph.flat path")).toHaveCount(2);
  const circlePaths = page.locator("[data-circle-of-fifths] .glyph.flat path");
  expect(await circlePaths.count()).toBeGreaterThan(0);
  for (const path of await page.locator(".glyph.flat path").all()) {
    await expect(path).toHaveAttribute("d", (await answerPath.getAttribute("d"))!);
    expect(await path.evaluate((node) => getComputedStyle(node).stroke)).toBe("none");
    expect(await path.evaluate((node) => getComputedStyle(node).fill)).not.toBe("none");
  }
  await page.evaluate((html) => {
    const reference = document.createElement("div");
    reference.style.cssText = "position:fixed;right:16px;top:16px;padding:8px;background:#222;color:#fff;font-size:24px;z-index:10";
    reference.innerHTML = `chart: ${html}`;
    document.body.append(reference);
  }, renderMusicTextHtml("E♭", "chart"));
  await expect(page.locator("body > div .glyph.flat .stem")).toHaveAttribute("d", "M3.3 1L2.2 15");
  await page.screenshot({ path: testInfo.outputPath("flat-dark.png"), fullPage: true });

  await show(page, flat, true, true);
  await expect(page.locator(".answer .glyph.flat")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("flat-light.png"), clip: { x: 0, y: 0, width: 1280, height: 175 } });

  await show(page, major, true);
  await expect(page.locator("svg.keyboard .glyph.triangle")).toHaveCount(1);
  await expect(page.locator("svg.keyboard text.keyboard-degree")).toHaveText("Δ3");
  await page.screenshot({ path: testInfo.outputPath("triangle-dark.png"), fullPage: true });

  await show(page, sharp, false);
  await expect(page.locator(".question .glyph.sharp")).toHaveCount(1);
  await expect(page.locator(".answer")).toHaveCount(0);
  await expect(page.locator("svg.keyboard text.keyboard-degree")).toHaveCount(0);
  await expect(page.locator("svg.keyboard text.keyboard-note-name")).toHaveText([/♯/]);
});

async function expectStablePrompt(
  page: Page,
  render: (back: boolean) => Promise<void>,
  questionText: string,
  answerText: string,
  fontSizes: Readonly<Record<number, number>>,
  testInfo: TestInfo,
  screenshotName: string,
) {
  for (const width of [400, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    let frontQuestionBox: { x: number; y: number; width: number; height: number } | undefined;
    for (const back of [false, true]) {
      await render(back);
      const line = page.locator('.prompt-line[data-card-part="text"]');
      const question = line.locator(".question");
      const value = line.locator(".answer-value");
      await expect(line).toHaveCount(1);
      await expect(question).toHaveText(questionText);
      await expect(value).toHaveText(back ? answerText : "?");
      await expect(value).toHaveClass(back ? /\banswer\b/ : /^answer-value$/);
      await expect(page.locator(".answer")).toHaveCount(back ? 1 : 0);
      await expect(line).toHaveCSS("align-items", "baseline");
      const fontSize = await question.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      expect(fontSize).toBeCloseTo(fontSizes[width], 1);
      const [leftColumn, rightColumn] = (await line.evaluate((element) => getComputedStyle(element).gridTemplateColumns)).split(" ").map(parseFloat);
      expect(leftColumn).toBeCloseTo(rightColumn, 1);
      expect(await line.evaluate((element) => parseFloat(getComputedStyle(element).columnGap))).toBeCloseTo(fontSize * 0.4, 1);
      const questionBox = (await question.boundingBox())!;
      const valueBox = (await value.boundingBox())!;
      expect(valueBox.x - questionBox.x - questionBox.width).toBeGreaterThanOrEqual(fontSize * 0.4 - 0.1);
      expect(Math.abs(questionBox.y + questionBox.height - valueBox.y - valueBox.height)).toBeLessThan(2);
      if (back) {
        for (const dimension of ["x", "y", "width", "height"] as const) {
          expect(questionBox[dimension], `${width}px: question ${dimension}`).toBeCloseTo(frontQuestionBox![dimension], 1);
        }
      } else {
        frontQuestionBox = questionBox;
      }
      if (width === 400) {
        await page.screenshot({ path: testInfo.outputPath(`${screenshotName}-${back ? "back" : "front"}.png`), fullPage: true });
      }
    }
  }
}

for (const [id, question, answer] of [
  ["flat3-bb", "B♭ ♭3", "D♭"],
  ["major3-cb", "C♭ Δ3", "E♭"],
] as const) {
  test(`circle ${id} keeps its question fixed across the flip`, async ({ page }, testInfo) => {
    const card = CARDS.find((candidate) => candidate.kind === "interval"
      && candidate.interval === (id.startsWith("flat3") ? "flat3" : "major3")
      && candidate.questionNote === (id.startsWith("flat3") ? "bb" : "Cb"))!;
    await expectStablePrompt(page, (back) => show(page, card, back), question, answer, { 400: 32, 1280: 56 }, testInfo, `circle-${id}`);
  });
}

for (const [name, front, back] of [
  ["Anki", INTERVAL_FRONT_TEMPLATE, INTERVAL_BACK_TEMPLATE],
  ["web", INTERVAL_WEB_FRONT_TEMPLATE, INTERVAL_WEB_BACK_TEMPLATE],
] as const) {
  test(`Intervals ${name} template keeps its question fixed across the flip`, async ({ page }, testInfo) => {
    const fields = { Question: "C♭ Δ3", Answer: "E♭", Root: "Cb", Keyboard: "", AnswerKeyboard: "Eb" };
    await expectStablePrompt(page, async (revealed) => {
      await page.setContent(buildCardDocument({
        html: renderTemplate(revealed ? back : front, fields),
        css: INTERVAL_CARD_CSS,
        nightMode: true,
      }));
      await page.evaluate(() => document.fonts.ready);
    }, fields.Question, fields.Answer, { 400: 40, 1280: 64 }, testInfo, `intervals-${name}`);
  });
}

test("engraves all five accidental glyphs in card text and SVG while preserving their readings", async ({ page }, testInfo) => {
  const original = "B♭ C♯ D♮ E𝄪 F𝄫";
  await page.setContent(buildCardDocument({
    html: `<div class="question">${original}<svg width="700" height="80"><text x="0" y="50" font-size="32">${original}</text></svg></div>`,
    css: ".question { font-size: 32px; }",
    nightMode: true,
  }));
  await page.evaluate(() => document.fonts.ready);

  const question = page.locator(".question");
  await expect(question.locator(":scope > .glyph")).toHaveCount(5);
  await expect(question.locator(".reading")).toHaveText(["♭", "♯", "♮", "𝄪", "𝄫"]);
  await expect(question.locator("svg text")).toHaveText(original);
  await expect(question.locator("svg text tspan")).toHaveText(["♭", "♯", "♮", "𝄪", "𝄫"]);
  const svgGlyphs = question.locator("svg > svg.glyph");
  await expect(svgGlyphs).toHaveCount(5);
  const xPositions = await svgGlyphs.evaluateAll((glyphs) => glyphs.map((glyph) => Number(glyph.getAttribute("x"))));
  expect(xPositions.every(Number.isFinite)).toBe(true);
  expect(xPositions).toEqual([...xPositions].sort((a, b) => a - b));
  expect(xPositions[2]).toBeGreaterThan(xPositions[1]);
  expect(xPositions[3]).toBeGreaterThan(xPositions[2]);
  await page.screenshot({ path: testInfo.outputPath("engraved-accidentals.png"), fullPage: true });
});

test("circle note accidentals leave room for their letters in text glyph mode", async ({ page }, testInfo) => {
  // The standard circle shows every spelling; single-note labels use a larger font
  // and are rendered separately so each selected cell has only one spelling.
  const singleNotes = ["Bb", "B#", "Bbb", "B##"];
  for (const layout of ["standard", "single-note"] as const) {
    const circles = layout === "standard"
      ? [renderDarkCircleOfFifthsSvg({ glyphs: "text" })]
      : singleNotes.map((note) => renderDarkCircleOfFifthsSvg({ glyphs: "text", labelLayout: layout, visibleNotes: [note] }));
    await page.setContent(buildCardDocument({
      html: `<div class="question">${circles.join("")}</div>`,
      css: ".question > svg { display: block; width: 1000px; height: 1000px; }",
      nightMode: true,
    }));
    await page.evaluate(() => document.fonts.ready);
    const notes = page.locator(".circle-of-fifths__note").filter({ has: page.locator("svg.glyph") });
    await expect(notes.first().locator("svg.glyph")).toBeVisible();
    const bounds = await notes.evaluateAll((elements) => elements.map((element) => {
      const letter = element.querySelector<SVGTextElement>(".circle-of-fifths__letter, .circle-of-fifths__spelling")!;
      const glyph = element.querySelector<SVGSVGElement>("svg.glyph")!;
      const extent = letter.getExtentOfChar(0);
      const letterRight = new DOMPoint(extent.x + extent.width, extent.y).matrixTransform(letter.getScreenCTM()!).x;
      // Measure ink, not the nested SVG viewport (whose bounds differ by browser).
      const glyphLeft = glyph.querySelector("path")!.getBoundingClientRect().left;
      return {
        note: element.getAttribute("data-note")!,
        accidental: letter.classList.contains("circle-of-fifths__spelling")
          ? [...letter.textContent!].slice(1).join("")
          : element.querySelector(".circle-of-fifths__accidental")!.textContent!,
        gap: glyphLeft - letterRight,
        aspectRatio: Number(glyph.getAttribute("width")) / Number(glyph.getAttribute("height")),
      };
    }));
    expect(bounds.length).toBeGreaterThanOrEqual(singleNotes.length);
    for (const note of singleNotes) expect(bounds.some((bound) => bound.note === note), `${layout}: ${note}`).toBe(true);
    for (const { note, accidental, gap, aspectRatio } of bounds) {
      const metrics = musicGlyphMetrics(accidental, "engraved")!;
      expect(gap, `${layout}: ${note} (${accidental}) letter/accidental gap`).toBeGreaterThanOrEqual(-0.5);
      expect(aspectRatio, `${layout}: ${note} (${accidental}) aspect ratio`).toBeCloseTo(metrics.width / metrics.height, 4);
    }
    await page.screenshot({ path: testInfo.outputPath(`circle-accidentals-${layout}.png`), fullPage: true });
  }
});

test("circle and staff retain identical Maestro signature paths after browser enhancement", async ({ page }, testInfo) => {
  await page.setContent(buildCardDocument({
    html: `<div class="question">${renderDarkCircleOfFifthsSvg({ showKeySignatures: true, visibleNotes: [], glyphs: "text" })}${renderStaffRowSvg({ clef: "treble", pitches: ["F4"], keyFifths: 6 })}</div>`,
    css: ".question > svg { width: 600px; max-width: 100%; height: auto; }",
    nightMode: true,
  }));
  await page.evaluate(() => document.fonts.ready);
  const circle = page.locator('.circle-of-fifths__staff[data-clef="treble"] [data-fifths="6"] .glyph.sharp');
  const staff = page.locator(".staff__key-signature .glyph.sharp");
  await expect(circle).toHaveCount(6);
  await expect(staff).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    expect(await circle.nth(i).locator("path").getAttribute("d")).toBe(await staff.nth(i).locator("path").getAttribute("d"));
    expect(await circle.nth(i).getAttribute("viewBox")).toBe(await staff.nth(i).getAttribute("viewBox"));
  }
  expect(await circle.first().locator("path").evaluate(node => getComputedStyle(node).fill)).not.toBe("rgb(0, 0, 0)");
  await page.screenshot({ path: testInfo.outputPath("shared-maestro.png"), fullPage: true });
});

test("B double-sharp keeps the same glyph proportions in the heading, circle and keyboard", async ({ page }, testInfo) => {
  const card = CARDS.find((candidate) => candidate.kind === "note-to-cell" && candidate.note === "B##");
  if (!card) throw new Error("missing B double-sharp card");
  await page.setViewportSize({ width: 400, height: 720 });
  await show(page, card, true);

  const glyphs = [
    page.locator(".question svg.glyph.double-sharp"),
    page.locator('.circle-of-fifths__note[data-note="B##"]:not([display="none"]) svg.glyph.double-sharp'),
    page.locator("svg.keyboard > svg.glyph.double-sharp"),
  ];
  for (const glyph of glyphs) await expect(glyph).toHaveCount(1);
  const widths = await Promise.all(glyphs.map((glyph) => glyph.evaluate((element) => {
    const parent = element.parentElement!;
    const fontSize = parseFloat(getComputedStyle(
      parent.querySelector("text") ?? parent,
    ).fontSize);
    return (Number(element.getAttribute("width")) || parseFloat(getComputedStyle(element).width)) / fontSize;
  })));
  for (const width of widths) expect(width).toBeCloseTo(musicGlyphMetrics("𝄪", "engraved")!.width, 1);
  expect(Number(await page.locator("svg.keyboard text.keyboard-note-name").getAttribute("font-size"))).toBeGreaterThanOrEqual(20);
  const keyLabel = await page.locator("svg.keyboard").evaluate((svg) => {
    const backdrop = svg.querySelector<SVGRectElement>(".keyboard-label-backdrop")!.getBoundingClientRect();
    const ink = svg.querySelector<SVGPathElement>(".glyph.double-sharp path")!.getBoundingClientRect();
    return { left: ink.left - backdrop.left, right: backdrop.right - ink.right };
  });
  expect(keyLabel.left).toBeGreaterThanOrEqual(-1);
  expect(keyLabel.right).toBeGreaterThanOrEqual(-1);
  const paths = await Promise.all(glyphs.map((glyph) => glyph.locator("path").getAttribute("d")));
  expect(new Set(paths).size).toBe(1);
  for (const text of [
    page.locator('.circle-of-fifths__note[data-note="B##"]:not([display="none"]) text.circle-of-fifths__spelling'),
    page.locator("svg.keyboard text.keyboard-note-name"),
  ]) {
    const gap = await text.evaluate((element: SVGTextElement) => {
      const letter = element.getExtentOfChar(0);
      const right = new DOMPoint(letter.x + letter.width, letter.y).matrixTransform(element.getScreenCTM()!).x;
      const accidental = element.nextElementSibling!.querySelector("path")!.getBoundingClientRect();
      return accidental.left - right;
    });
    expect(gap).toBeGreaterThanOrEqual(-0.5);
  }
  await page.screenshot({ path: testInfo.outputPath("b-double-sharp.png"), fullPage: true });
});
