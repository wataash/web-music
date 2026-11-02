// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { test, expect, openDeckSettings } from "./fixtures";
import { preferDiatonicVariant } from "./diatonic-fixture";
import { DIATONIC_DIRECTIONS, DIATONIC_ROOT, DIATONIC_VARIANTS, diatonicChord, parseDiatonicSelections } from "../src/lib/diatonic-selection";

test.use({ viewport: { width: 411, height: 841 } });
// These tests exercise selected experimental decks; default visibility is
// checked separately in deck-order.spec.ts.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window === window.top) localStorage.setItem("music-flashcards:hidden-decks", "[]");
  });
});

test("keeps the diatonic answer focused and the question fixed", async ({ page, shot }) => {
  const selections = parseDiatonicSelections(null);
  const tonic = DIATONIC_VARIANTS.find(v=>v.mode==="major" && v.degree===0)!;
  const settings = Object.fromEntries(DIATONIC_DIRECTIONS.map(d=>[d,{...selections[d],majorKeys:[-1],minorKeys:[]}]));
  await page.addInitScript(value => {
    if (window.top === window) localStorage.setItem("music-flashcards:diatonic-selections",JSON.stringify(value));
  }, settings);
  await page.goto("/");
  await preferDiatonicVariant(page,tonic.id,-1);
  for (const direction of DIATONIC_DIRECTIONS) {
    const row = page.locator(`[data-deck="${DIATONIC_ROOT}"]`);
    await expect(row).toBeVisible({timeout:30000});
    await row.locator(".deck-study").click({position:{x:20,y:20}});
    const frame=page.frameLocator('iframe[title="card"]');
    const question=frame.locator(".diatonic-question");
    await expect(question).toContainText("F major");
    await expect(question).toContainText("IΔ7");
    await expect(question.locator(".chord-triangle")).toBeVisible();
    await expect(question).toHaveCSS("font-family", /"?Flashcard Notes"?, serif/);
    const before=await question.boundingBox();
    await expect(frame.locator(".diatonic-answer")).toBeHidden();
    await page.getByRole("button",{name:"SHOW ANSWER",exact:true}).click();
    await expect(frame.locator(".diatonic-answer")).toBeVisible();
    await expect(frame.locator(".diatonic-answer")).toHaveCSS("font-family", /"?Flashcard Notes"?, serif/);

    await expect(frame.locator(".diatonic-answer")).toHaveText("FΔ7");
    await expect(frame.locator(".diatonic-notes")).toHaveCount(0);
    expect(await question.boundingBox()).toEqual(before);
    await expect(frame.locator("svg.staff, svg.keyboard, .keyboard-frame")).toHaveCount(0);
    await expect(page.getByText("Updating…",{exact:true})).toBeHidden();
    await shot(direction);
    await page.getByRole("button",{name:"Back",exact:true}).click();
  }
  await page.locator('[data-deck="Diatonic Chords"] .deck-study').click({position:{x:20,y:20}});
  await page.getByRole("button",{name:"Deck actions",exact:true}).click();
  await page.getByRole("menuitem",{name:"What to ask",exact:true}).click();
  const range=page.getByRole("region",{name:"Diatonic chord range"});
  await expect(range).toHaveCount(1);
  await expect(range.getByRole("combobox")).toHaveCount(0);
});

test("selects major and minor keys on the wheel and saves independent ranges", async ({ page, shot }) => {
  await page.goto("/");
  const row=page.locator('[data-deck="Diatonic Chords"]');
  await expect(row).toBeVisible({timeout:30000});
  await openDeckSettings(row);
  const dialog=page.getByRole("dialog",{name:"What to ask"});
  const major=dialog.getByRole('region',{name:'Major',exact:true});
  const minor=dialog.getByRole('region',{name:'Minor',exact:true});
  const minorChords=dialog.getByRole('region',{name:'Minor chords',exact:true});
  await expect(dialog.locator('.wheel')).toHaveCount(2);
  await expect(dialog.getByRole('region',{name:'Major chords',exact:true})).toHaveCount(0);
  const required=minorChords.locator('input:disabled');
  await expect(required).toHaveCount(7);
  for(const checkbox of await required.all())await expect(checkbox).toBeChecked();
  await expect(minorChords.getByText(/^Default (on|off)$/)).toHaveCount(0);
  await expect(minorChords.locator('.setting-change.modified')).toHaveCount(0);
  await expect(minorChords.getByRole('button')).toHaveCount(0);
  await expect(minorChords.getByText('Required',{exact:true})).toHaveCount(0);
  await minorChords.scrollIntoViewIfNeeded();
  await shot('required-natural-minor-and-defaults');
  await major.getByRole("button",{name:"Clear",exact:true}).click();
  await dialog.getByRole("button",{name:"F major",exact:true}).click();
  await minor.getByRole("button",{name:"Clear",exact:true}).click();
  await dialog.getByRole("button",{name:"G minor",exact:true}).click();
  await expect(dialog.getByRole("button",{name:"G minor",exact:true}).locator(".tonic")).toHaveText("g");
  await expect(minorChords.getByRole("checkbox",{name:/^V7 /})).toBeChecked();
  await expect(minorChords.getByRole("checkbox",{name:/^vii°7 /})).toBeChecked();
  const optional=minorChords.getByRole("checkbox",{name:/^viiø7 /});
  await expect(optional).not.toBeChecked();
  await optional.check();
  const dominant=minorChords.getByRole('checkbox',{name:/^V7 /});
  await dominant.uncheck();
  await expect(minorChords.locator('.setting-change.modified')).toHaveCount(2);
  await minorChords.locator('h3').evaluate(el=>el.scrollIntoView({block:'start'}));
  await shot('changed-minor-chords-with-reset');
  await minorChords.getByRole('button',{name:'Reset V7 to default',exact:true}).click();
  await expect(dominant).toBeChecked();
  await minorChords.getByRole('button',{name:'Reset viiø7 to default',exact:true}).click();
  await expect(optional).not.toBeChecked();
  await expect(minorChords.locator('.setting-change.modified')).toHaveCount(0);
  await optional.check();
  await expect(dialog.getByRole("checkbox",{name:"Relative-major degree"})).not.toBeChecked();
  await minor.locator(".wheel").scrollIntoViewIfNeeded();
  await shot("minor-range-with-circle-of-fifths");
  await dialog.getByRole("button",{name:"APPLY",exact:true}).click();
  const value=await page.evaluate(()=>JSON.parse(localStorage.getItem("music-flashcards:diatonic-selections")!));
  expect(value["degree-chord"].majorKeys).toEqual([-1]);
  expect(value["degree-chord"].minorKeys).toEqual([-2]);
  expect(value["degree-chord"].minorChords).toHaveLength(10);
  expect(value["degree-chord"].relativeMajor).toBe(false);
  await page.reload();
  await openDeckSettings(row);
  await expect(dialog.getByRole("button",{name:"G minor",exact:true})).toHaveAttribute("aria-pressed","true");
  await expect(minorChords.getByRole("checkbox",{name:/^viiø7 /})).toBeChecked();
  const reset=minorChords.getByRole('button',{name:'Reset viiø7 to default',exact:true});
  await expect(reset).toBeVisible();
  await reset.click();
  await expect(optional).not.toBeChecked();
  await dialog.getByRole('button',{name:'CANCEL',exact:true}).click();
  await openDeckSettings(row);
  await expect(optional).toBeChecked();
  await reset.click();
  await dialog.getByRole('button',{name:'APPLY',exact:true}).click();
  await page.reload();
  await openDeckSettings(row);
  await expect(optional).not.toBeChecked();
  await expect(reset).toHaveCount(0);
});

test("previews relative-major hints in What to ask and saves the choice", async ({ page, shot }) => {
  const selections=parseDiatonicSelections(null);
  const dominant=DIATONIC_VARIANTS.find(v=>v.mode==="minor" && v.degree===4 && v.quality==="7")!;
  const range={majorKeys:[],minorKeys:[-2],minorChords:[dominant.id]};
  const saved={...selections,"degree-chord":{...selections["degree-chord"],...range,relativeMajor:true}};
  await page.addInitScript(value=>{
    if(window.top===window && !localStorage.getItem("music-flashcards:diatonic-selections")) localStorage.setItem("music-flashcards:diatonic-selections",JSON.stringify(value));
  },saved);
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto('/');
  await expect(page.locator('[data-deck="Guitar Fretboard"]')).toBeVisible({timeout:30000});
  const frame=page.frameLocator('iframe[title="card"]');
  for(const direction of ['degree-chord'] as const){
    await page.locator(`[data-deck="${DIATONIC_ROOT}"] .deck-study`).click({position:{x:20,y:20}});
    await expect(frame.locator('.diatonic-key')).toHaveText('G minor');
    await page.getByRole('button',{name:'SHOW ANSWER',exact:true}).click();
    const answer=await frame.locator('.diatonic-answer').textContent();
    const initially=direction==='degree-chord';
    await page.getByRole('button',{name:'Deck actions',exact:true}).click();
    await page.getByRole('menuitem',{name:'What to ask',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'What to ask',exact:true});
    const toggle=dialog.getByLabel('Relative-major degree',{exact:true});
    await expect(dialog.getByLabel('Notation setting',{exact:true})).toHaveCount(0);
    await expect(dialog.getByRole('combobox')).toHaveCount(0);
    await expect(toggle).toBeChecked({checked:initially});
    await toggle.setChecked(!initially);
    const preview=dialog.getByLabel('Relative-major degree hint preview',{exact:true});
    await expect(preview).toHaveText(initially?'G minor · V7':'G minor · V7 (III7 in B♭ major)');
    await shot(`${direction}-hint-preview`);
    await dialog.getByRole('button',{name:'CANCEL',exact:true}).click();
    await expect(frame.locator('.diatonic-relative')).toBeVisible({visible:initially});
    await expect(frame.locator('.diatonic-answer')).toBeVisible();
    await page.getByRole('button',{name:'Deck actions',exact:true}).click();
    await page.getByRole('menuitem',{name:'What to ask',exact:true}).click();
    await toggle.setChecked(!initially);
    await dialog.getByRole('button',{name:'APPLY',exact:true}).click();
    await expect(frame.locator('.diatonic-relative')).toBeVisible({visible:!initially});
    await expect(frame.locator('.diatonic-answer')).toBeVisible();
    await expect(frame.locator('.diatonic-answer')).toHaveText(answer!);
    await page.getByRole('button',{name:'Back',exact:true}).click();
  }
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('music-flashcards:diatonic-selections')!));
  expect(stored['degree-chord'].relativeMajor).toBe(false);
  await page.reload();
  await page.locator('[data-deck="Diatonic Chords"] .deck-study').click({position:{x:20,y:20}});
  await expect(frame.locator('.diatonic-relative')).toBeHidden();
});

test("chooses minor degree spelling globally and remembers it without changing answers", async ({ page, shot }) => {
  // The first visible deck precedes the completion of the development import.
  const imported = page.waitForEvent("console", { predicate: message => message.text().startsWith("[Music Flashcards] automatically imported") });
  const settings = parseDiatonicSelections(null);
  const tonic = DIATONIC_VARIANTS.find(v => v.mode === "minor" && v.degree === 0 && v.quality === "m7")!;
  const saved = Object.fromEntries(DIATONIC_DIRECTIONS.map(d => [d, { ...settings[d], majorKeys: [], minorKeys: [0], minorChords: [tonic.id], relativeMajor: true }]));
  await page.addInitScript(value => {
    if (window.top === window && !localStorage.getItem("music-flashcards:diatonic-selections")) localStorage.setItem("music-flashcards:diatonic-selections", JSON.stringify(value));
  }, saved);
  await page.goto("/");
  await imported;
  await preferDiatonicVariant(page,tonic.id,0);
  const row = page.locator('[data-deck="Diatonic Chords"]');
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Updating…", { exact: true })).toBeHidden();
  await row.locator(".deck-study").click({ position: { x: 20, y: 20 } });
  const frame = page.frameLocator('iframe[title="card"]');
  await expect(frame.locator(".diatonic-degree")).toHaveText("im7");
  const before = await frame.locator(".diatonic-question").boundingBox();
  await page.getByRole("button", { name: "SHOW ANSWER", exact: true }).click();
  await expect(frame.locator(".diatonic-answer")).toHaveText("Am7");
  expect(await frame.locator(".diatonic-question").boundingBox()).toEqual(before);
  await shot("default-im7-answer");
  for (const [style, relative] of [["i7", "vi7"], ["i-7", "vi-7"], ["im7", "vim7"], ["Im7", "VIm7"], ["I-7", "VI-7"]]) {
    await page.getByRole("button", { name: "Deck actions", exact: true }).click();
    await page.getByRole('menuitem',{name:'What to ask',exact:true}).click();
    const select = page.getByRole("radiogroup", { name: "Minor degree", exact: true });
    await expect(select.getByRole("radio")).toHaveCount(5);
    await select.getByRole("radio",{name:style,exact:true}).check();
    await expect(select.getByRole("radio",{name:style,exact:true})).toBeChecked();
    await page.getByRole('button',{name:'APPLY',exact:true}).click();
    await expect(frame.locator(".diatonic-degree")).toHaveText(style);
    await expect(frame.locator(".diatonic-relative")).toHaveText(`(${relative} in C major)`);
    await expect(frame.locator(".diatonic-answer")).toHaveText("Am7");
    await expect(frame.locator(".diatonic-answer")).toBeVisible();
    await shot(`minor-notation-${style}`);
  }
  await page.reload();
  await expect(frame.locator(".diatonic-degree")).toHaveText("I-7");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await openDeckSettings(row);
  const dialog = page.getByRole("dialog", { name: "What to ask", exact: true });
  await expect(dialog.getByRole('region',{name:'Minor chords',exact:true}).getByRole("checkbox", { name: /^I-7 / })).toBeChecked();
  await dialog.getByRole("button", { name: "CANCEL", exact: true }).click();
});

for (const example of [
  { key: "majorSeventh", label: "Major seventh", mode: "major", quality: "Δ7", degree: 0, value: "maj7", chord: "Cmaj7", roman: "Imaj7" },
  { key: "minor", label: "Minor chord", mode: "minor", quality: "m7", degree: 0, value: "-7", chord: "A-7", roman: "im7" },
  { key: "halfDiminished", label: "Half-diminished", mode: "major", quality: "ø7", degree: 6, value: "m7(♭5)", chord: "Bm7(♭5)", roman: "viim7(♭5)" },
  { key: "minorMajorSeventh", label: "Minor-major seventh", mode: "minor", quality: "mΔ7", degree: 0, value: "m(maj7)", chord: "Am(maj7)", roman: "im(maj7)" },
]) {
  test(`shares ${example.label} across cards, range labels and reload`, async ({ page, shot }) => {
    const imported = page.waitForEvent("console", { predicate: message => message.text().startsWith("[Music Flashcards] automatically imported") });
    const variant = DIATONIC_VARIANTS.find(v => v.mode === example.mode && v.quality === example.quality && v.degree === example.degree)!;
    const defaults = parseDiatonicSelections(null);
    const selected = Object.fromEntries(DIATONIC_DIRECTIONS.map(direction => [direction, { ...defaults[direction],
      majorKeys: example.mode === "major" ? [0] : [], minorKeys: example.mode === "minor" ? [0] : [],
      minorChords: example.mode === "minor" ? [variant.id] : [],
    }]));
    await page.addInitScript(value => {
      if (window === window.top && !localStorage.getItem("music-flashcards:diatonic-selections")) localStorage.setItem("music-flashcards:diatonic-selections", JSON.stringify(value));
    }, selected);
    await page.goto("/");
    await imported;
    await preferDiatonicVariant(page,variant.id,0);
    await page.locator('[data-deck="Diatonic Chords"] .deck-study').click({ position: { x: 20, y: 20 } });
    await page.getByRole("button", { name: "Deck actions", exact: true }).click();
    await page.getByRole('menuitem',{name:'What to ask',exact:true}).click();
    await page.getByRole("radiogroup", { name: example.label, exact: true }).getByRole("radio",{name:example.value,exact:true}).check();
    await shot(`${example.key}-settings`);
    const frame = page.frameLocator('iframe[title="card"]');
    await expect(page.getByRole("radiogroup",{name:example.label,exact:true}).getByRole("radio",{name:example.value,exact:true})).toBeChecked();
    await page.getByRole('button',{name:'APPLY',exact:true}).click();
    await expect(frame.locator(".diatonic-degree")).toHaveText(example.roman);
    await page.getByRole("button", { name: "SHOW ANSWER", exact: true }).click();
    await expect(frame.locator(".diatonic-answer")).toHaveText(example.chord);
    await shot(`${example.key}-answer`);
    await page.reload();
    await expect(frame.locator(".diatonic-degree")).toHaveText(example.roman);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem("music-flashcards:chord-notation")!)[key], example.key)).toBe(example.value);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    const notes = page.locator('[data-deck="Chord Tones (Four-note Chords)"]');
    await expect(notes).toBeVisible({timeout:30000});
    await page.evaluate(async chord=>{const path='/src/lib/db.ts';const{db}=await import(path);const ids=(await db.notes.toArray()).filter(n=>n.tags==='chord-tones'&&n.fields[4]===chord).map(n=>n.id);await db.cards.filter(c=>ids.includes(c.nid)).modify({newOrder:-1});},diatonicChord(0,variant).chord);
    await notes.locator(".deck-study").click({ position: { x: 20, y: 20 } });
    await expect(frame.locator(".diatonic-question")).toHaveText(example.chord);
    await page.getByRole("button", { name: "SHOW ANSWER", exact: true }).click();
    await expect(frame.locator(".diatonic-notes > span")).toHaveText(diatonicChord(0, variant).notes);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await openDeckSettings(page.locator('[data-deck="Diatonic Chords"]'));
    const dialog = page.getByRole("dialog", { name: "What to ask", exact: true });
    if(example.mode==='minor'){
      const chosen=dialog.getByRole('region',{name:'Minor chords',exact:true}).locator('.variant').filter({has:page.getByText(example.roman,{exact:true})});
      await expect(chosen.getByRole('checkbox')).toBeChecked();
    }else await expect(dialog.getByRole('region',{name:'Major chords',exact:true})).toHaveCount(0);
  });
}
