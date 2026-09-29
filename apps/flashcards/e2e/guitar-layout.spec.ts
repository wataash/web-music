// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  CARD_CSS,
  WEB_FRONT_TEMPLATE,
  WEB_BACK_TEMPLATE,
} from "../../../decks/guitar-fretboard/src/template";
import { buildCardDocument, renderTemplate } from "../src/lib/template";
import { boardMedia, createDeckNotes } from "../../../decks/guitar-intervals/src/web-deck";
import {
  BACK_TEMPLATE as INTERVAL_BACK_TEMPLATE,
  CARD_CSS as INTERVAL_CARD_CSS,
} from "../../../decks/guitar-intervals/src/template";
import { expect, test } from "./fixtures";

test("keeps an altered interval label on one line", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const note = createDeckNotes().find(({ id }) => id === "r6-s5-f3")!;
  const media = boardMedia();
  const answerBoard = note.fields[7].replace(media.filename, `data:image/svg+xml,${encodeURIComponent(media.content as string)}`);
  await page.setContent(buildCardDocument({
    html: renderTemplate(INTERVAL_BACK_TEMPLATE, { AnswerBoard: answerBoard }),
    css: INTERVAL_CARD_CSS,
    nightMode: true,
  }));
  const answer = page.locator(".fret-name.answer");
  await expect(answer).toHaveText("♭13 m6 A5");
  const box = await answer.boundingBox();
  expect(box).not.toBeNull();
  const glyph = await answer.locator(".glyph.flat").boundingBox();
  expect(glyph).not.toBeNull();
  expect(await answer.locator(".glyph.flat").evaluate(el => getComputedStyle(el).display)).toBe("inline-block");
  expect(glyph!.x).toBeGreaterThan(box!.x);
  expect(glyph!.x + glyph!.width).toBeLessThan(box!.x + box!.width);
  expect(glyph!.y).toBeGreaterThanOrEqual(box!.y);
  expect(glyph!.y + glyph!.height).toBeLessThanOrEqual(box!.y + box!.height);
  const fontSize = await answer.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(box!.height).toBeLessThan(fontSize * 1.6);
  expect(await answer.evaluate(el => getComputedStyle(el).whiteSpace)).toBe("nowrap");
  await page.screenshot({ path: testInfo.outputPath("guitar-flat-label.png") });
});

for (const rotated of [false, true]) {
  test(`keeps an open-string answer aligned with its front (${rotated ? "rotated" : "upright"})`, async ({ page, shot }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(`<style>
      body { margin: 0; background: #111827; }
      iframe {
        border: 0; position: absolute; left: 50%; top: 50%;
        width: ${rotated ? 844 : 390}px; height: ${rotated ? 390 : 844}px;
        transform: translate(-50%, -50%) rotate(${rotated ? -90 : 0}deg);
      }
    </style><iframe title="card"></iframe>`);
    const frame = page.locator("iframe");
    const card = page.frameLocator("iframe");
    const fields = { String: "6", Fret: "", Note: "E", Positions: "6-0 6-12 6-24" };
    async function show(template: string, side: "front" | "back") {
      const doc = buildCardDocument({
        html: renderTemplate(template, fields),
        css: CARD_CSS,
        nightMode: true,
        variables: { "--text-scale": "2" },
      });
      await frame.evaluate((element, srcdoc) => {
        (element as HTMLIFrameElement).srcdoc = srcdoc;
      }, doc);
      await expect(card.locator(`[data-side="${side}"] svg`)).toBeVisible();
      await shot(`guitar-open-string-${rotated ? "rotated" : "upright"}-${side}`);
      return {
        board: await card.locator("svg.fretboard").boundingBox(),
        question: await card.locator(".position-question").boundingBox(),
      };
    }

    const front = await show(WEB_FRONT_TEMPLATE, "front");
    await expect(card.locator(".position-answer")).toBeHidden();
    await expect(card.locator(".position-question")).toHaveText("E");
    const back = await show(WEB_BACK_TEMPLATE, "back");
    await expect(card.locator(".position-answer")).toBeVisible();
    await expect(card.locator(".position-answer")).toHaveText("6-0 6-12");
    await expect(card.locator('.fretboard__target[data-fret="24"]')).toHaveCount(1);
    expect(back).toEqual(front);
  });
}
