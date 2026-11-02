// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { expect, test, type Page } from "@playwright/test";
import { createMovableDoWebDeckData } from "../../../decks/music-staff/src/movable-do";
import { buildCardDocument, renderTemplate } from "../src/lib/template";
import { MAJOR_KEYS } from "@web-music/music-staff-core";

const deck = createMovableDoWebDeckData();
const model = deck.models[0];
const template = model.templates[0];

test("every key keeps a bright central tonic octave with symmetric context", async ({ page }) => {
  const starts = [60, 67, 62, 69, 64, 71, 66, 65, 70, 63, 68, 61, 61, 66, 71];
  for (const [index, key] of MAJOR_KEYS.entries()) {
    for (const count of [13, 15, 25, 49]) {
      await page.setContent(buildCardDocument({
        html: renderTemplate(template.qfmt, fieldsFor("C4", key.fifths)),
        css: model.css, nightMode: true, showKeyboard: true, referenceKeyboardKeys: count,
      }));
      const keys = page.locator("svg.keyboard [data-semitone]");
      await expect(keys).toHaveCount(count);
      const pitches = await keys.evaluateAll((elements) => elements.map((element) => Number(element.getAttribute("data-semitone"))));
      expect(Math.min(...pitches)).toBe(starts[index] - (count - 13) / 2);
      expect(Math.max(...pitches)).toBe(starts[index] + 12 + (count - 13) / 2);
      const focus = page.locator("svg.keyboard .is-root-octave");
      await expect(focus).toHaveCount(13);
      const focusedPitches = await focus.evaluateAll((elements) => elements.map((element) => Number(element.getAttribute("data-semitone"))));
      expect(Math.min(...focusedPitches)).toBe(starts[index]);
      expect(Math.max(...focusedPitches)).toBe(starts[index] + 12);
      await expect(page.locator("svg.keyboard .is-context")).toHaveCount(count - 13);
      if (count > 13) {
        const dim = page.locator("svg.keyboard .is-context").first();
        const black = await dim.evaluate((element) => element.classList.contains("keyboard__black-key"));
        const bright = page.locator(`svg.keyboard .${black ? "keyboard__black-key" : "keyboard__white-key"}.is-root-octave`).first();
        expect(await dim.evaluate((element) => getComputedStyle(element).fill)).not.toBe(await bright.evaluate((element) => getComputedStyle(element).fill));
      }
      expect(new Set(pitches).size).toBe(pitches.length);
      await expect(page.locator("svg.keyboard .is-highlighted")).toHaveCount(0);
    }
  }
});

function fieldsFor(pitch: string, fifths: number, clef = "treble") {
  const note = deck.notes.find(({ fields }) =>
    fields[1] === clef && fields[2] === pitch && fields[3] === String(fifths),
  );
  if (!note) throw new Error(`missing movable-do note: ${pitch}, ${fifths}`);
  return Object.fromEntries(model.fieldNames.map((name, index) => [name, note.fields[index]]));
}

async function show(page: Page, fields: Record<string, string>, back: boolean, showKeyboard?: boolean) {
  await page.setContent(buildCardDocument({
    html: renderTemplate(back ? template.afmt : template.qfmt, fields),
    css: model.css,
    nightMode: true,
    showKeyboard,
  }));
}

test("movable-do key signatures retain staff-sized music glyphs", async ({ page }, testInfo) => {
  await page.goto("/");
  for (const clef of ["treble", "bass", "alto", "tenor"]) {
    for (const fifths of [-1, -7, 1, 7]) {
      for (const back of [false, true]) {
        await show(page, fieldsFor("C4", fifths, clef), back);
        await page.evaluate(() => document.fonts.ready);
        const signature = page.locator(".staff__key-signature");
        const glyphs = signature.locator("svg.glyph");
        await expect(glyphs).toHaveCount(Math.abs(fifths));
        const heightInSpaces = await glyphs.first().evaluate(element => {
          const paths = [...element.querySelectorAll("path")].map(path => path.getBoundingClientRect());
          const lines = [...element.closest("svg.staff")!.querySelectorAll(".staff__line")];
          const gap = Math.abs(lines[1].getBoundingClientRect().y - lines[0].getBoundingClientRect().y);
          return (Math.max(...paths.map(box => box.bottom)) - Math.min(...paths.map(box => box.top))) / gap;
        });
        expect(heightInSpaces).toBeCloseTo((fifths > 0 ? 683 : 591) / 250, 2);
        const inkBounds = await glyphs.evaluateAll(elements => elements.map(element => {
          const paths = [...element.querySelectorAll("path")].map(path => path.getBoundingClientRect());
          return {
            left: Math.min(...paths.map(box => box.left)),
            right: Math.max(...paths.map(box => box.right)),
          };
        }));
        for (let index = 1; index < inkBounds.length; index++) {
          expect(inkBounds[index].left).toBeGreaterThan(inkBounds[index - 1].right);
        }
        if (!back) {
          await page.locator(".diagram").screenshot({ path: testInfo.outputPath(`${clef}-signature-${fifths}.png`) });
        }
      }
    }
  }
});

test("plain movable-do documents omit the optional keyboard unless explicitly enabled", async ({ page }) => {
  const fields = fieldsFor("F4", 1);
  for (const back of [false, true]) {
    for (const enabled of [undefined, false]) {
      await show(page, fields, back, enabled);
      await expect(page.locator('[data-card-part="keyboard"]')).toHaveCount(0);
      await expect(page.locator("svg.keyboard")).toHaveCount(0);
      await expect(page.locator("svg.staff")).toBeVisible();
      await expect(page.locator(".movable-do-card > :visible")).toHaveCount(back ? 2 : 1);
      const before = await page.locator(".movable-do-card").boundingBox();
      await show(page, fields, back, true);
      await expect(page.locator('[data-card-part="keyboard"]')).toHaveCount(1);
      await page.locator('[data-card-part="keyboard"]').evaluate((row) => row.remove());
      await page.evaluate(() => { document.documentElement.dataset.showKeyboard = "off"; });
      expect(await page.locator(".movable-do-card").boundingBox()).toEqual(before);
    }
  }
});

test("questions have a tonic octave with context and answers stay in the focus region", async ({ page }) => {
  for (const [pitch, fifths, sounding, pitchClass] of [
    ["C4", 0, "C4", 0],
    ["F4", 1, "F♯4", 6],
    ["B3", -1, "B♭3", 10],
    ["B3", 7, "B♯3", 0],
    ["C4", -7, "C♭4", 11],
    ["E4", 6, "E♯4", 5],
    ["F4", -7, "F♭4", 4],
  ] as const) {
    const fields = fieldsFor(pitch, fifths);
    for (const back of [false, true]) {
      await show(page, fields, back, true);
      await expect(page.locator("html")).toHaveAttribute("data-show-keyboard", "on");
      await expect(page.locator("main[data-optional-keyboard]")).toHaveAttribute("data-keyboard-notes", back ? sounding : "");
      await expect(page.locator('[data-card-part="keyboard"] svg.keyboard')).toBeVisible();
      await expect(page.locator("svg.keyboard [data-semitone]")).toHaveCount(25);
      const marked = page.locator("svg.keyboard .is-highlighted");
      await expect(marked).toHaveCount(back ? 1 : 0);
      await expect(page.locator("svg.staff")).toBeVisible();
      await expect(page.locator(".movable-do__accidental")).toHaveCount(Math.abs(fifths));
      if (back) {
        await expect(marked).toHaveClass(/is-root-octave/);
        expect(Number(await marked.getAttribute("data-semitone")) % 12).toBe(pitchClass);
        await expect(page.locator(".movable-do__answer")).toHaveText(`${sounding.replaceAll("♯", "#").replaceAll("♭", "b").replace(/[0-9]/g, "")} ${fields.Solfege}`);
      } else {
        await expect(page.locator("[data-movable-do-answer]")).toBeHidden();
      }
    }
  }
});

test("optional keyboard uses the keyboard scale and offsets without moving the staff", async ({ page }) => {
  await show(page, fieldsFor("F4", 1), true, true);
  const keyboard = page.locator("svg.keyboard");
  const staffBefore = await page.locator("svg.staff").boundingBox();
  const initial = (await keyboard.boundingBox())!;
  await page.evaluate(() => document.documentElement.style.setProperty("--keyboard-scale", "1.5"));
  const scaled = (await keyboard.boundingBox())!;
  expect(scaled.width).toBeCloseTo(initial.width * 1.5, 0);
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--keyboard-x", "30px");
    document.documentElement.style.setProperty("--keyboard-y", "20px");
  });
  const moved = (await keyboard.boundingBox())!;
  expect(moved.x - scaled.x).toBeCloseTo(30, 0);
  expect(moved.y - scaled.y).toBeCloseTo(20, 0);
  expect(await page.locator("svg.staff").boundingBox()).toEqual(staffBefore);
});

test("movable-do diagrams stay fixed when answers are revealed", async ({ page }, testInfo) => {
  for (const locale of ["en", "ja"]) {
    await page.addInitScript(language => Object.defineProperty(navigator, "language", { value: language, configurable: true }), locale);
    await page.goto("/");
    for (const width of [390, 640]) {
      await page.setViewportSize({ width, height: 900 });
      for (const clef of ["treble", "bass", "alto", "tenor"]) {
        const fields = fieldsFor("F4", 0, clef);
        await show(page, fields, false, true);
        await page.evaluate(() => document.fonts.ready);
        const staff = await page.locator("svg.staff").boundingBox();
        const keyboard = await page.locator("svg.keyboard").boundingBox();
        if (locale === "en" && width === 390 && clef === "treble") {
          await page.screenshot({ path: testInfo.outputPath("movable-do-front.png") });
        }
        await show(page, fields, true, true);
        await page.evaluate(() => document.fonts.ready);
        expect(await page.locator("svg.staff").boundingBox()).toEqual(staff);
        expect(await page.locator("svg.keyboard").boundingBox()).toEqual(keyboard);
        if (locale === "en" && width === 390 && clef === "treble") {
          await page.screenshot({ path: testInfo.outputPath("movable-do-back.png") });
        }
      }
    }
  }
});
