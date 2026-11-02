// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { test, expect } from "./fixtures";

test.skip(!existsSync(new URL("../public/music-notation-examples/manifest.json",import.meta.url)),"Generate the MuseScore atlas first");

test("keeps technical files in details while preserving downloads and vector previews", async ({page,shot}) => {
  await page.goto("/music-notation-examples/index.html");
  await expect(page.locator("#count")).toHaveText("104 examples");
  await expect(page.locator("html")).toHaveAttribute("lang","en");
  await expect(page.getByLabel("Fonts and settings",{exact:true})).not.toBeVisible();
  await expect(page.locator("pre")).toHaveCount(0);
  await page.getByRole("searchbox",{name:"Search"}).fill("Am(maj7)");
  await expect(page.locator(".card")).toHaveCount(8);
  await page.locator(".view-options > summary").click();
  await page.getByLabel("Fonts and settings",{exact:true}).selectOption("Standard / Edwin");
  await expect(page.locator(".card")).toHaveCount(1);
  const card=page.locator(".card");
  await expect(card.getByRole("link",{name:"PNG",exact:true})).toBeVisible();
  await expect(card.getByRole("link",{name:"MSCZ",exact:true})).not.toBeVisible();
  await card.locator(".thumb").click();
  await expect(page.locator("dialog")).toBeVisible();
  await expect(page.locator("#full")).toHaveAttribute("src",/\.svg$/);
  await expect.poll(()=>page.locator("#full").evaluate((img:HTMLImageElement)=>img.complete && img.naturalWidth>0)).toBe(true);
  await shot("chord-vector-preview");
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();
  await expect(page.locator("#zoom")).toHaveText("150%");
  await page.getByRole("button",{name:"Close",exact:true}).click();
  await card.locator(".sample-details > summary").click();
  for(const title of ["PNG","SVG","PDF","MSCZ","MSCX","Source XML","Rendering style (MSS)","JSON"]){
    const link=card.getByRole("link",{name:title,exact:true});
    await expect(link).toBeVisible();
    const href=await link.getAttribute("href");
    expect((await page.request.get(`/music-notation-examples/${href}`)).ok()).toBe(true);
  }
});

test("filters related sheets through shared and sample tags", async ({page}) => {
  await page.goto("/music-notation-examples/index.html");
  const tags=page.getByRole("group",{name:"Filter by tag"});
  await tags.getByRole("button",{name:"Accidentals",exact:true}).click();
  await expect(page.locator(".card")).toHaveCount(24);
  await page.getByRole("button",{name:"Filter by Minor"}).first().click();
  await expect(page.locator(".card")).toHaveCount(16);
  await expect(tags.getByRole("button",{name:"Minor",exact:true})).toBeFocused();
  await expect(tags.getByRole("button",{name:"Minor",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("searchbox",{name:"Search"}).fill("Bbbm7");
  await page.locator(".view-options > summary").click();
  await page.getByLabel("Fonts and settings",{exact:true}).selectOption("Standard / lowercase minor");
  await expect(page.locator(".card")).toHaveCount(1);
  await page.getByRole("button",{name:"Filter by Chords"}).click();
  await expect(page.locator(".card")).toHaveCount(40);
  await expect(page.getByRole("searchbox",{name:"Search"})).toHaveValue("");
  await expect(page.getByLabel("Fonts and settings",{exact:true})).toHaveValue("");
  await expect(page.locator(".view-options")).not.toHaveAttribute("open");
  await page.getByRole("button",{name:"Clear filters",exact:true}).click();
  await expect(page.locator(".card")).toHaveCount(104);
  await expect(page.getByRole("button",{name:"Clear filters",exact:true})).not.toBeVisible();
  await tags.getByRole("button",{name:"Notes",exact:true}).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".card")).toHaveCount(8);
  await page.getByRole("button",{name:"Filter by Dots"}).first().click();
  await expect(page.locator(".card")).toHaveCount(8);
  await expect(tags.getByRole("button",{name:"Dots",exact:true})).toBeFocused();
  await page.getByRole("searchbox",{name:"Search"}).fill("no-such-sample");
  await expect(page.locator(".empty")).toBeVisible();
  await page.getByRole("button",{name:"Clear filters",exact:true}).click();
  await expect(page.locator(".card")).toHaveCount(104);
});

test("keeps tags and previews usable on a phone",async({page,shot})=>{
  await page.setViewportSize({width:411,height:841});
  await page.goto("/music-notation-examples/index.html");
  await expect(page.locator("#count")).toHaveText("104 examples");
  await page.locator(".card img").first().evaluate((img:HTMLImageElement)=>img.decode());
  await shot("mobile-initial-view");
  await page.getByRole("group",{name:"Filter by tag"}).getByRole("button",{name:"Rests",exact:true}).click();
  await expect(page.locator(".card")).toHaveCount(8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator(".card img").first().evaluate((img:HTMLImageElement)=>img.decode());
  await shot("mobile-rest-tag");
});

for (const palette of [
  { mode: "light", bg: "rgb(245, 245, 245)", surface: "rgb(255, 255, 255)", bar: "rgb(33, 150, 243)" },
  { mode: "dark", bg: "rgb(18, 18, 18)", surface: "rgb(30, 30, 30)", bar: "rgb(38, 50, 56)" },
] as const) {
  test(`uses the Flashcards ${palette.mode} palette`, async ({page,shot}) => {
    await page.emulateMedia({colorScheme:palette.mode});
    await page.goto("/music-notation-examples/index.html");
    await expect(page.locator("#count")).toHaveText("104 examples");
    await expect(page.locator("body")).toHaveCSS("background-color",palette.bg);
    await expect(page.locator("body")).toHaveCSS("font-family",/Roboto/);
    await expect(page.locator(".appbar")).toHaveCSS("background-color",palette.bar);
    await expect(page.locator("#grid")).toHaveCSS("background-color",palette.surface);
    await expect(page.locator(".about")).not.toHaveAttribute("open");
    await page.locator(".card img").first().evaluate((img:HTMLImageElement)=>img.decode());
    await shot(`simple-view-${palette.mode}`);
  });
}
