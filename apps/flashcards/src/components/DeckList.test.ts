// @vitest-environment jsdom
// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mount, tick, unmount } from "svelte";
import { describe, expect, it } from "vitest";

import DeckList from "./DeckList.svelte";
import { DEFAULT_CIRCLE_NOTE_SELECTION } from "../lib/circle-note-selection";
import { DEFAULT_FRET_WINDOW } from "../lib/guitar-interval-selection";
import { DEFAULT_INTERVAL_PAIR_SELECTION } from "../lib/interval-pair-selection";
import { DEFAULT_STAFF_NOTE_SELECTION } from "../lib/staff-note-selection";

describe("deck-list scroll position", () => {
  it("restores the position and passes the current position when studying", async () => {
    const target = document.createElement("div");
    document.body.append(target);
    let selected: readonly [string, number] | null = null;
    let collapsed: readonly string[] | null = null;
    let list: HTMLElement | null = null;
    const component = mount(DeckList, {
      target,
      props: {
        decks: [
          {
            name: "Music Staff",
            baseName: "Music Staff",
            depth: 0,
            hiddenByDefault: false,
            newCount: 1,
            learnCount: 0,
            dueCount: 0,
          },
          {
            name: "Music Staff::Staff → Note",
            baseName: "Staff → Note",
            depth: 1,
            hiddenByDefault: false,
            newCount: 1,
            learnCount: 0,
            dueCount: 0,
          },
        ],
        collapsedDeckNames: [],
        hiddenDeckNames: [],
        initialScrollTop: 480,
        noteSelections: {
          circle: {
            noteToCell: DEFAULT_CIRCLE_NOTE_SELECTION,
            intervals: DEFAULT_CIRCLE_NOTE_SELECTION,
          },
          fretWindow: DEFAULT_FRET_WINDOW,
  intervalPairs: new Set(DEFAULT_INTERVAL_PAIR_SELECTION),
          staff: DEFAULT_STAFF_NOTE_SELECTION,
        },
        busy: false,
        error: null,
        notice: null,
        onstudy: (name, scrollTop) => (selected = [name, scrollTop]),
        onresetdeck: () => {},
        onhiddendecknameschange: () => {},
        oncollapseddecknameschange: (names) => {
          collapsed = names;
          // Simulate the browser clamping scrollTop while the final child row
          // is removed, before the compensating spacer is committed.
          if (list !== null) list.scrollTop = 624;
        },
        oncirclenoteselectionchange: () => {},
        onfretwindowchange: () => {},
        onintervalpairselectionchange: () => {},
        onstaffnoteselectionchange: () => {},
        ondismisserror: () => {},
        ondismissnotice: () => {},
      },
    });

    try {
      await tick();
      list = target.querySelector<HTMLElement>(".deck-list");
      expect(list?.scrollTop).toBe(480);

      list!.scrollTop = 720;
      target.querySelector<HTMLButtonElement>(".deck-study")!.click();
      expect(selected).toEqual(["Music Staff", 720]);

      const expander = target.querySelector<HTMLButtonElement>(
        ".deck-expander",
      );
      expect(expander?.getAttribute("aria-expanded")).toBe("true");
      expander!.click();
      expect(collapsed).toEqual(["Music Staff"]);
      await tick();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(
        target.querySelector<HTMLElement>(".deck-collapse-spacer")?.style
          .height,
      ).toBe("48px");

      expect(list!.scrollTop).toBe(720);
      Object.defineProperties(list!, {
        scrollHeight: { configurable: true, value: 920 },
        clientHeight: { configurable: true, value: 200 },
      });
      list!.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(target.querySelector(".deck-collapse-spacer")).not.toBeNull();

      list!.scrollTop = 672;
      list!.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(target.querySelector(".deck-collapse-spacer")).toBeNull();
    } finally {
      await unmount(component);
      target.remove();
    }
  });
});
