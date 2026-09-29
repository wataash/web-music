// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { renderKeyboardSvg } from "./keyboard-svg";
import { formatNoteName } from "@web-music/music-notation";

const BLANK_KEYBOARD = renderKeyboardSvg({ pitch: "C4", highlighted: false });

export const STAFF_BASE_WIDTH = "min(88vw, 26rem, 62vh)";

// Templates supply space-separated note spellings; the question leaves this
// empty when the pitch is the answer. Octaves fold onto the same twelve keys.
export const OPTIONAL_KEYBOARD_SCRIPT = `
<script>
(() => {
  const formatNoteName = ${formatNoteName.toString()};
  if (document.documentElement.dataset.showKeyboard !== "on") return;
  for (const [index, container] of [...document.querySelectorAll("[data-optional-keyboard]")].entries()) {
    const host = document.createElement("div");
    host.className = "diagram keyboard";
    host.dataset.cardPart = "keyboard";
    const frame = document.createElement("span");
    frame.className = "keyboard-frame keyboard-octave";
    frame.innerHTML = ${JSON.stringify(BLANK_KEYBOARD)};
    host.append(frame);
    container.append(host);
    const svg = frame.querySelector("svg");
    const title = svg.querySelector("title");
    const description = svg.querySelector("desc");
    title.id = "optional-keyboard-title-" + index;
    description.id = "optional-keyboard-description-" + index;
    svg.setAttribute("aria-labelledby", title.id + " " + description.id);
    const notes = (container.dataset.keyboardNotes ?? "").split(/\\s+/).filter(Boolean);
    const labelsByKey = new Map();
    for (const note of notes) {
      const parsed = note.match(/^([A-Ga-g])([♯♭#bx𝄪𝄫]*)(?:-?\\d+)?$/u);
      if (!parsed) continue;
      let pitch = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[parsed[1].toUpperCase()];
      for (const accidental of parsed[2]) {
        pitch += accidental === "♯" || accidental === "#" ? 1
          : accidental === "♭" || accidental === "b" ? -1
          : accidental === "𝄫" ? -2 : 2;
      }
      const key = svg.querySelector('[data-semitone="' + (60 + (pitch % 12 + 12) % 12) + '"]');
      key?.classList.add("is-highlighted");
      if (!key || !container.hasAttribute("data-keyboard-labels")) continue;
      const formatUpperNote = (value) => formatNoteName(value[0].toUpperCase() + value.slice(1));
      const label = formatUpperNote(parsed[1] + parsed[2]);
      const degreeNote = container.dataset.keyboardDegreeNote;
      const degree = degreeNote && label === formatUpperNote(degreeNote)
        ? container.dataset.keyboardDegree : "";
      const labels = labelsByKey.get(key) ?? [];
      if (degree && !labels.some((entry) => entry.text === degree)) {
        labels.push({ text: degree, className: "keyboard-degree" });
      }
      if (!labels.some((entry) => entry.text === label)) {
        labels.push({ text: label, className: "keyboard-note-name" });
      }
      labelsByKey.set(key, labels);
    }
    const whiteKeyWidth = Number(svg.querySelector(".keyboard__white-key").getAttribute("width"));
    const keyLabels = [...labelsByKey].map(([key, labels]) => {
      const keyX = Number(key.getAttribute("x"));
      const keyWidth = Number(key.getAttribute("width"));
      const x = keyX + keyWidth / 2;
      const bottom = Number(key.getAttribute("y")) + Number(key.getAttribute("height"));
      const blackKey = key.classList.contains("keyboard__black-key");
      const labelWidth = blackKey ? whiteKeyWidth * 1.2 : keyWidth;
      const maxFontSize = Math.min(
        labels.length > 2 ? 16 : 22,
        labelWidth * 1.4 / Math.max(...labels.map((entry) => [...entry.text].length)),
        (Number(key.getAttribute("height")) - 12) / (labels.length * 1.2),
      );
      return { key, labels, x, bottom, blackKey, labelWidth, maxFontSize };
    });
    const fontSize = Math.min(...keyLabels.map((group) => group.maxFontSize));
    for (const { key, labels, x, bottom, blackKey, labelWidth } of keyLabels) {
      // A tall stack uses the full key; its outline would box in the names.
      if (labels.length > 2) key.style.stroke = "none";
      if (labels.length > 1 || blackKey) {
        const top = bottom - 10 - (labels.length - 1) * fontSize * 1.2 - fontSize;
        const backdrop = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        backdrop.setAttribute("class", "keyboard-label-backdrop");
        backdrop.setAttribute("x", String(x - labelWidth / 2 + 1));
        backdrop.setAttribute("y", String(top));
        backdrop.setAttribute("width", String(labelWidth - 2));
        backdrop.setAttribute("height", String(bottom - 3 - top));
        backdrop.setAttribute("rx", "2");
        svg.append(backdrop);
      }
      for (const [index, { text, className }] of labels.entries()) {
        const element = document.createElementNS("http://www.w3.org/2000/svg", "text");
        element.setAttribute("class", className);
        element.setAttribute("x", String(x));
        element.setAttribute("y", String(bottom - 7 - (labels.length - 1 - index) * fontSize * 1.2));
        element.setAttribute("text-anchor", "middle");
        element.setAttribute("font-size", String(fontSize));
        element.textContent = text;
        svg.append(element);
      }
    }
    if (notes.length) description.textContent = "Piano keyboard: " + notes.join(", ") + ".";
  }
})();
</script>
`.trim();

export const OPTIONAL_KEYBOARD_CSS = `
.keyboard-frame {
  display: block;
  position: relative;
  left: 50%;
  translate: -50%;
  line-height: 0;
  width: var(--keyboard-width, calc(${STAFF_BASE_WIDTH} * var(--keyboard-scale, 1)));
}
.diagram.keyboard svg {
  width: 100%;
  height: auto;
}
.keyboard-label-backdrop {
  fill: #fcd34d;
  fill-opacity: 0.6;
  pointer-events: none;
}
.keyboard-note-name,
.keyboard-degree {
  fill: #111827;
  font-family: sans-serif;
  font-weight: 600;
  pointer-events: none;
}
`.trim();
