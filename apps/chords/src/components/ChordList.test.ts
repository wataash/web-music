// @vitest-environment jsdom
// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mount, tick, unmount } from "svelte";
import { afterEach, expect, it, vi } from "vitest";
import ChordList from "./ChordList.svelte";
import { describeChord } from "../lib/chords";

afterEach(() => vi.unstubAllGlobals());

it("moves and plays the selected chord, stops at the ends, and keeps N.C. silent", async () => {
  vi.stubGlobal("IntersectionObserver", class {
    observe() {} unobserve() {} disconnect() {}
  });
  const scroll = vi.fn();
  const previousScroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  const target = document.createElement("div");
  document.body.append(target);
  const chords = ["C", "G7", "N.C."].map((symbol) => describeChord(symbol, "C", "C"));
  const onplay = vi.fn();
  let component = mount(ChordList, { target, props: { chords, fretCount: 12, bassStrings: [4, 5, 6], soundEnabled: true, onplay, onplayfret: vi.fn() } });
  const next = () => target.querySelector<HTMLButtonElement>('[aria-label="Next chord"]')!;
  const previous = () => target.querySelector<HTMLButtonElement>('[aria-label="Previous chord"]')!;
  try {
    await tick();
    expect(previous().disabled).toBe(true);
    expect(onplay).not.toHaveBeenCalled();
    next().click();
    await tick();
    expect(onplay).toHaveBeenLastCalledWith(chords[1]);
    expect(scroll).toHaveBeenCalledOnce();
    expect(target.querySelector('[aria-current="true"] h2')?.textContent).toBe("G7");
    next().click();
    await tick();
    expect(onplay).toHaveBeenCalledTimes(1);
    expect(next().disabled).toBe(true);
    previous().click();
    await tick();
    expect(onplay).toHaveBeenCalledTimes(2);
    await unmount(component);
    onplay.mockClear();
    component = mount(ChordList, { target, props: { chords, fretCount: 12, bassStrings: [], soundEnabled: false, onplay, onplayfret: vi.fn(), shortcutsEnabled: false } });
    await tick();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    await tick();
    expect(previous().disabled).toBe(true);
    next().click();
    await tick();
    expect(previous().disabled).toBe(false);
    expect(onplay).not.toHaveBeenCalled();
  } finally {
    await unmount(component);
    target.remove();
    HTMLElement.prototype.scrollIntoView = previousScroll;
  }
});
