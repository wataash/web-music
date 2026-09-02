// @vitest-environment jsdom
// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mount, tick, unmount } from "svelte";
import { describe, expect, it } from "vitest";

import ExtraStudyDialog, {
  type ExtraStudySelection,
} from "./ExtraStudyDialog.svelte";

const AVAILABILITY = {
  newRemaining: 42,
  forgottenTodayKeys: ["f1", "f2", "f3"],
  aheadKeys: ["a1", "a2", "a3", "a4", "a5", "a6", "a7"],
};

function open() {
  const target = document.createElement("div");
  document.body.append(target);
  let started: ExtraStudySelection | null = null;
  const component = mount(ExtraStudyDialog, {
    target,
    props: {
      deckLabel: "Staff → Note",
      availability: AVAILABILITY,
      onstart: (selection) => (started = selection),
      oncancel: () => {},
    },
  });
  const sections = () =>
    [...target.querySelectorAll<HTMLElement>(".extra-section")].map(
      (section) => ({
        title: section.querySelector(".extra-heading span")!.textContent,
        choices: [...section.querySelectorAll<HTMLButtonElement>(".choice")],
        selected: () => section.querySelector(".selected")!.textContent,
      }),
    );
  const apply = () =>
    target.querySelector<HTMLButtonElement>(".primary-action")!;
  return {
    sections,
    apply,
    started: () => started,
    dispose: async () => {
      await unmount(component);
      target.remove();
    },
  };
}

describe("extra study dialog", () => {
  it("collects a selection from every source", async () => {
    const dialog = open();
    try {
      expect(dialog.sections().map((s) => s.title)).toEqual([
        "Increase today's new card limit",
        "Review forgotten cards",
        "Review ahead",
      ]);
      expect(dialog.apply().disabled).toBe(true);

      dialog.sections()[0].choices[0].click();
      // +10 on the 7 cards scheduled for later days clamps to 7.
      dialog.sections()[2].choices[1].click();
      await tick();
      expect(dialog.apply().textContent?.trim()).toBe("ADD 12");

      dialog.apply().click();
      expect(dialog.started()).toEqual({ new: 5, forgotten: 0, ahead: 7 });
    } finally {
      await dialog.dispose();
    }
  });

  it("clamps a quick choice to what the section has left", async () => {
    const dialog = open();
    try {
      // +5 on a section that only holds 3 cards.
      dialog.sections()[1].choices[0].click();
      await tick();
      expect(dialog.sections()[1].selected()).toBe("Selected: 3");
      expect(dialog.sections()[1].choices.every((c) => c.disabled)).toBe(true);
      expect(dialog.sections()[0].choices.some((c) => c.disabled)).toBe(false);
    } finally {
      await dialog.dispose();
    }
  });
});
