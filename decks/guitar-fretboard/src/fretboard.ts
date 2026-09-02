// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { FRET_COUNT, STRING_COUNT } from "./cards";

export const CANVAS = {
  fretLabelFontSize: 14,
  fretLineWidth: 5,
  nutWidth: 40,
  boardWidth: 1400,
  stringGap: 40,
  noteRadius: 16,
} as const;

export type FretboardTarget = Readonly<{
  string: number;
  fret: number;
  label?: string;
  labelKind?: "cue" | "answer";
}>;

export type FretboardSvgInput = Readonly<{
  string?: number;
  fret?: number;
  cue?: "♭" | "♯";
  note?: string;
  targets?: readonly FretboardTarget[];
  highlightedString?: number;
  title?: string;
  description?: string;
}>;

export function calcNormalizedFretPositions(fretCount: number): number[] {
  return Array.from(
    { length: fretCount + 2 },
    (_, n) => Number((n / (fretCount + 1)).toFixed(12)),
  );
}

export function renderFretboardSvg({
  string,
  fret,
  cue,
  note,
  targets,
  highlightedString,
  title: explicitTitle,
  description: explicitDescription,
}: FretboardSvgInput): string {
  if (
    highlightedString !== undefined &&
    (!Number.isInteger(highlightedString) ||
      highlightedString < 1 ||
      highlightedString > STRING_COUNT)
  ) {
    throw new RangeError(
      `highlightedString must be from 1 to ${STRING_COUNT}`,
    );
  }

  if (
    targets !== undefined &&
    (string !== undefined ||
      fret !== undefined ||
      cue !== undefined ||
      note !== undefined)
  ) {
    throw new TypeError(
      "targets cannot be combined with string, fret, cue, or note",
    );
  }

  const normalizedTargets =
    targets ??
    (string !== undefined || fret !== undefined
      ? [
          {
            string: validateString(string),
            fret: validateFret(fret),
            label: note ?? cue,
            labelKind: note ? ("answer" as const) : cue ? ("cue" as const) : undefined,
          },
        ]
      : []);

  for (const target of normalizedTargets) {
    validateString(target.string);
    validateFret(target.fret);
  }

  if (normalizedTargets.length === 0 && highlightedString === undefined) {
    throw new TypeError(
      "a fretboard needs at least one target or a highlighted string",
    );
  }

  const boardHeight = CANVAS.stringGap * (STRING_COUNT - 1);
  const nutHeight = boardHeight + 30;
  const labelHeight = CANVAS.fretLabelFontSize + CANVAS.noteRadius;
  const canvasHeight = labelHeight + boardHeight + labelHeight;
  const fretXs = calcNormalizedFretPositions(FRET_COUNT).map(
    (position) => CANVAS.nutWidth + CANVAS.boardWidth * position,
  );
  const canvasWidth = fretXs[fretXs.length - 2];
  const stringYs = Array.from(
    { length: STRING_COUNT },
    (_, index) => labelHeight + CANVAS.stringGap * index,
  );
  const inlayY = stringYs[0] + (stringYs[1] - stringYs[0]) * 0.2;
  const inlayBottom =
    stringYs[STRING_COUNT - 2] +
    (stringYs[STRING_COUNT - 1] - stringYs[STRING_COUNT - 2]) * 0.8;
  const inlayHeight = inlayBottom - inlayY;
  const title =
    explicitTitle ??
    (note
      ? `${note} on string ${string}, fret ${fret}`
      : cue
        ? `${cue === "♭" ? "Flat" : "Sharp"} note-name question on string ${string}, fret ${fret}`
        : highlightedString !== undefined
          ? `Highlighted string ${highlightedString}`
          : normalizedTargets.length === 1
            ? `String ${normalizedTargets[0].string}, fret ${normalizedTargets[0].fret}`
            : "Marked guitar fretboard positions");
  const description =
    explicitDescription ??
    (note
      ? `A guitar fretboard with ${note} marked on string ${string} at fret ${fret}.`
      : cue
        ? `A guitar fretboard asking for the ${cue === "♭" ? "flat" : "sharp"} note name on string ${string} at fret ${fret}.`
        : highlightedString !== undefined
          ? `A guitar fretboard with string ${highlightedString} highlighted.`
          : `A guitar fretboard with ${normalizedTargets.length} marked positions.`);

  const fretLines = fretXs
    .slice(0, -1)
    .map(
      (x, fretIndex) =>
        `<line data-fret="${fretIndex}" x1="${x}" y1="${stringYs[0]}" x2="${x}" y2="${stringYs[STRING_COUNT - 1]}" stroke="#9ca3af" stroke-width="${CANVAS.fretLineWidth}"/>`,
    )
    .join("");
  const fretLabels = fretXs
    .slice(0, -1)
    .map((_, fretIndex) => {
      const x =
        fretIndex === 0
          ? fretXs[0] - CANVAS.nutWidth / 2
          : (fretXs[fretIndex - 1] + fretXs[fretIndex]) / 2;

      return `<g class="fretboard__fret-label" data-fret="${fretIndex}"><text x="${x}" y="${labelHeight / 2 - CANVAS.noteRadius / 2}" text-anchor="middle" dominant-baseline="middle">${fretIndex}</text><text x="${x}" y="${labelHeight + boardHeight + labelHeight / 2 + CANVAS.noteRadius / 2}" text-anchor="middle" dominant-baseline="middle">${fretIndex}</text></g>`;
    })
    .join("");
  const strings = stringYs
    .map(
      (y, index) =>
        `<line class="fretboard__string" data-string="${index + 1}" x1="${fretXs[0]}" y1="${y}" x2="${fretXs[fretXs.length - 2]}" y2="${y}" stroke-width="${1 + index * 0.25}"/>`,
    )
    .join("");
  const stringHighlight =
    highlightedString === undefined
      ? ""
      : `<line class="fretboard__string-highlight" data-string="${highlightedString}" x1="${fretXs[0]}" y1="${stringYs[highlightedString - 1]}" x2="${fretXs[fretXs.length - 2]}" y2="${stringYs[highlightedString - 1]}"/>`;
  const regularInlays = [3, 5, 7, 9, 15, 17, 19, 21]
    .map((inlayFret) =>
      renderBlockInlay(fretXs, inlayFret, inlayY, inlayHeight),
    )
    .join("");
  const octaveInlays = [12, 24]
    .map((inlayFret) =>
      renderBlockInlay(
        fretXs,
        inlayFret,
        inlayY,
        inlayHeight,
        " fretboard__inlay--octave",
      ),
    )
    .join("");
  const targetMarkup = normalizedTargets
    .map((target) => {
      const targetX =
        target.fret === 0
          ? fretXs[0] - CANVAS.nutWidth / 2
          : (fretXs[target.fret - 1] + fretXs[target.fret]) / 2;
      const targetY = stringYs[target.string - 1];
      const label = target.label
        ? `<text class="fretboard__label" data-label-kind="${target.labelKind ?? "answer"}" x="${targetX}" y="${targetY}" text-anchor="middle" dominant-baseline="central">${escapeXml(target.label)}</text>`
        : "";

      return `<circle class="fretboard__target" data-string="${target.string}" data-fret="${target.fret}" cx="${targetX}" cy="${targetY}" r="${CANVAS.noteRadius}"/>${label}`;
    })
    .join("");

  return [
    `<svg class="fretboard" xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-labelledby="title description">`,
    `<title id="title">${escapeXml(title)}</title>`,
    `<desc id="description">${escapeXml(description)}</desc>`,
    `<style>text{font-family:Arial,"Noto Sans",sans-serif}.fretboard__fret-label{fill:#a8b0bc;font-size:${CANVAS.fretLabelFontSize}px;font-weight:600}.fretboard__string-highlight{stroke:#fde68a;stroke-width:14;stroke-linecap:round}.fretboard__string{stroke:#cbd5e1}.fretboard__inlay{fill:#52606d}.fretboard__target{fill:#fde68a;stroke:#a16207;stroke-width:1.5}.fretboard__label{fill:#111827;font-size:17px;font-weight:700}</style>`,
    `<rect width="100%" height="100%" fill="#111827"/>`,
    `<rect x="0" y="${(stringYs[0] + stringYs[STRING_COUNT - 1] - nutHeight) / 2}" width="${CANVAS.nutWidth}" height="${nutHeight}" fill="#d1d5db"/>`,
    fretLines,
    fretLabels,
    stringHighlight,
    strings,
    regularInlays,
    octaveInlays,
    targetMarkup,
    "</svg>",
  ].join("");
}

function validateString(string: number | undefined): number {
  if (!Number.isInteger(string) || string! < 1 || string! > STRING_COUNT) {
    throw new RangeError(`string must be from 1 to ${STRING_COUNT}`);
  }
  return string!;
}

function validateFret(fret: number | undefined): number {
  if (!Number.isInteger(fret) || fret! < 0 || fret! > FRET_COUNT) {
    throw new RangeError(`fret must be from 0 to ${FRET_COUNT}`);
  }
  return fret!;
}

function renderBlockInlay(
  fretXs: readonly number[],
  fret: number,
  y: number,
  height: number,
  extraClass = "",
): string {
  const innerLeftX = fretXs[fret - 1] + CANVAS.fretLineWidth / 2;
  const innerWidth =
    fretXs[fret] - fretXs[fret - 1] - CANVAS.fretLineWidth;

  return `<rect class="fretboard__inlay${extraClass}" data-fret="${fret}" x="${innerLeftX + innerWidth * 0.15}" y="${y}" width="${innerWidth * 0.7}" height="${height}" rx="2"/>`;
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

const WEB_FRETBOARD_RENDERER_SOURCE = [
  `const FRET_COUNT = ${FRET_COUNT};`,
  `const STRING_COUNT = ${STRING_COUNT};`,
  `const CANVAS = ${JSON.stringify(CANVAS)};`,
  calcNormalizedFretPositions.toString(),
  validateString.toString(),
  validateFret.toString(),
  renderBlockInlay.toString(),
  escapeXml.toString(),
  renderFretboardSvg.toString(),
].join("\n");

export const WEB_FRETBOARD_SCRIPT = `
<script>
(() => {
  const __name = (target) => target;
  ${WEB_FRETBOARD_RENDERER_SOURCE}
  const host = document.querySelector("[data-fretboard]");
  if (!(host instanceof HTMLElement)) return;
  const string = Number(host.dataset.string);
  const noteToPositions = host.dataset.hasPositions === "true";
  const back = host.dataset.side === "back";
  let input;
  if (noteToPositions) {
    const note = host.dataset.note ?? "";
    if (back) {
      const targets = (host.dataset.positions ?? "")
        .split(" ")
        .filter(Boolean)
        .map((position) => ({
          string,
          fret: Number(position.split("-")[1]),
          label: note,
          labelKind: "answer",
        }));
      input = {
        targets,
        title: note + " positions on string " + string,
        description:
          "The note " + note + " appears at " +
          host.dataset.positions + " on string " + string + ".",
      };
    } else {
      input = {
        highlightedString: string,
        title: note + " positions on string " + string,
        description:
          "A guitar fretboard with string " + string +
          " highlighted, asking for every " + note + " position.",
      };
    }
  } else {
    const fret = Number(host.dataset.fret);
    input = back
      ? { string, fret, note: host.dataset.note ?? "" }
      : {
          string,
          fret,
          cue:
            host.dataset.system === "flats" ? "♭" :
            host.dataset.system === "sharps" ? "♯" : undefined,
        };
  }
  host.innerHTML = renderFretboardSvg(input);
})();
</script>
`.trim();
