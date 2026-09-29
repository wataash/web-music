// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { OPTIONAL_KEYBOARD_SCRIPT } from "@web-music/music-staff-core";
export { OPTIONAL_KEYBOARD_CSS as KEYBOARD_CSS } from "@web-music/music-staff-core";

export const WEB_KEYBOARD_SCRIPT = `
<script>
(() => {
  if (document.documentElement.dataset.showKeyboard !== "on") return;
  const board = document.querySelector("[data-fretboard]");
  if (!(board instanceof HTMLElement)) return;
  const container = board.parentElement;
  container.dataset.optionalKeyboard = "";
  container.dataset.keyboardNotes = "";
  if (board.dataset.hasPositions === "true") {
    // Both-name spellings start with a complete name for the same pitch.
    container.dataset.keyboardNotes = (board.dataset.note ?? "").match(/^[A-G][♯♭#b]?/)?.[0] ?? "";
  } else if (board.dataset.side === "back") {
    const tuning = (board.dataset.tuning ?? "").split(" ").filter(Boolean).map(Number);
    const pitch = tuning[Number(board.dataset.string) - 1] + Number(board.dataset.fret);
    if (Number.isFinite(pitch)) {
      container.dataset.keyboardNotes = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][((pitch % 12) + 12) % 12];
    }
  }
})();
</script>
${OPTIONAL_KEYBOARD_SCRIPT}
`.trim();
