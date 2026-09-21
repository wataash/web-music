// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// Draws a staff with one whole note on it. The same renderer produces the
// card-sized images the deck ships and the thumbnails the app shows beside a
// note's name, so a diagram can never disagree with the card it describes.

import {
  CLEF_LABELS,
  CLEF_RANGES,
  CLEF_REFERENCES,
  CLEFS,
  diatonicIndex,
  formatPitch,
  HIGHEST_STAFF_STEP,
  isClef,
  ledgerSteps,
  LOWEST_STAFF_STEP,
  parsePitch,
  STAFF_LINE_COUNT,
  staffStep,
  type Clef,
  type Pitch,
} from "./model";
import {
  MAJOR_KEYS,
  keySignatureAccidentalForNote,
  keySignatureAccidentals,
  keySignatureAdvance,
  keySignatureGlyphCss,
} from "./key-signature";

export type StaffPalette = Readonly<{
  // null leaves the staff transparent, for a diagram drawn on a page that
  // already has a background.
  background: string | null;
  line: string;
  note: string;
  label: string;
}>;

export type StaffGeometry = Readonly<{
  lineCount: number;
  lineGap: number;
  lineWidth: number;
  topLineY: number;
  startX: number;
  endX: number;
  clefX: number;
  noteCenterX: number;
  noteHeadRadiusX: number;
  noteHeadRadiusY: number;
  noteHoleRadiusX: number;
  noteHoleRadiusY: number;
  noteHoleRotation: number;
  ledgerHalfWidth: number;
  width: number;
  // Blank space kept around whatever the staff ends up drawing.
  padding: number;
  answerHeight: number;
  answerFontSize: number;
  palette: StaffPalette;
}>;

// The staff itself. How tall an image ends up is decided per note, so a note
// on the staff is not framed by the empty space a six-ledger-line note needs.
export const CARD_STAFF_GEOMETRY = {
  lineCount: STAFF_LINE_COUNT,
  lineGap: 16,
  lineWidth: 2,
  topLineY: 120,
  startX: 16,
  endX: 244,
  clefX: 26,
  noteCenterX: 160,
  noteHeadRadiusX: 13,
  noteHeadRadiusY: 8,
  noteHoleRadiusX: 8.6,
  noteHoleRadiusY: 3.4,
  noteHoleRotation: -22,
  ledgerHalfWidth: 21,
  width: 260,
  padding: 16,
  answerHeight: 64,
  answerFontSize: 42,
  palette: {
    background: "#111827",
    line: "#d1d5db",
    note: "#f9fafb",
    label: "#fcd34d",
  },
} as const satisfies StaffGeometry;

// A row of every note a clef can carry, for choosing which of them to study.
// Drawn in the surrounding text colour, like a thumbnail, but at a size a
// finger can hit. The renderer places the notes itself, so the single-note
// geometry — where the staff starts and ends, where its one note goes — is
// not read from this.
export const ROW_STAFF_GEOMETRY = {
  lineCount: STAFF_LINE_COUNT,
  lineGap: 10,
  lineWidth: 1.2,
  topLineY: 80,
  startX: 0,
  endX: 0,
  clefX: 8,
  noteCenterX: 0,
  noteHeadRadiusX: 8.1,
  noteHeadRadiusY: 5,
  noteHoleRadiusX: 5.4,
  noteHoleRadiusY: 2.1,
  noteHoleRotation: -22,
  ledgerHalfWidth: 13,
  width: 0,
  padding: 10,
  answerHeight: 0,
  answerFontSize: 0,
  palette: {
    background: null,
    line: "currentColor",
    note: "currentColor",
    label: "currentColor",
  },
} as const satisfies StaffGeometry;

export const CLEF_GLYPHS = {
  treble: "\u{1D11E}",
  bass: "\u{1D122}",
  alto: "\u{1D121}",
  tenor: "\u{1D121}",
} as const satisfies Record<Clef, string>;

// Noto Music draws these Unicode clefs on a 1000-unit em that spans the four
// staff spaces, with the glyph baseline on the bottom staff line. Each clef's
// reference feature therefore sits this many staff spaces above the baseline:
// the G clef curl at one space, the F clef dots at three, the C clef centre at
// two.
const CLEF_ANCHOR_SPACES = {
  treble: 1,
  bass: 3,
  alto: 2,
  tenor: 2,
} as const satisfies Record<Clef, number>;

// How far each glyph reaches from its baseline, in staff spaces, so a drawing
// can be cropped to what it actually covers. Measured from the same font.
const CLEF_GLYPH_REACH = {
  treble: { top: 5.34, bottom: -1.59 },
  bass: { top: 3.6, bottom: 0.4 },
  alto: { top: 4.05, bottom: -0.04 },
  tenor: { top: 4.05, bottom: -0.04 },
} as const satisfies Record<Clef, Readonly<{ top: number; bottom: number }>>;

export type StaffSvgInput = Readonly<{
  clef: Clef;
  // Omit to draw an empty staff, which is the question for note-to-staff
  // cards: the pitch to place is named by the card template instead.
  pitch?: string;
  // Draws the pitch large under the staff. Deck media never uses it — the
  // card template supplies the prompt and the answer — but it makes a preview
  // SVG readable on its own.
  label?: string;
  geometry?: StaffGeometry;
  // Hides the diagram from assistive technology, for when the surrounding
  // text already says what it shows.
  decorative?: boolean;
}>;

export function bottomLineY(geometry: StaffGeometry): number {
  return geometry.topLineY + geometry.lineGap * (geometry.lineCount - 1);
}

// Half a line gap: one staff step is one line-or-space, i.e. one diatonic step.
export function staffStepY(geometry: StaffGeometry, step: number): number {
  return bottomLineY(geometry) - (step * geometry.lineGap) / 2;
}

export function clefBaselineY(geometry: StaffGeometry, clef: Clef): number {
  const reference = CLEF_REFERENCES[clef];
  return (
    staffStepY(geometry, 2 * (reference.line - 1)) +
    CLEF_ANCHOR_SPACES[clef] * geometry.lineGap
  );
}

// The box a staff is drawn in: the staff itself, the clef glyph, and the room
// the given notes need above and below it. Given no notes it frames the whole
// range a clef can carry, which is what the deck media uses; given the notes a
// reader has chosen to study, it says how much of that image is worth showing.
export function staffFrame(
  clef: Clef,
  steps?: readonly number[],
  geometry: StaffGeometry = CARD_STAFF_GEOMETRY,
): Readonly<{ top: number; height: number }> {
  const clefBaseline = clefBaselineY(geometry, clef);
  const reach = CLEF_GLYPH_REACH[clef];
  const covered = steps ?? [LOWEST_STAFF_STEP, HIGHEST_STAFF_STEP];
  const noteTops = covered.map(
    (step) => staffStepY(geometry, step) - geometry.noteHeadRadiusY,
  );
  const noteBottoms = covered.map(
    (step) => staffStepY(geometry, step) + geometry.noteHeadRadiusY,
  );
  const top = Math.min(
    geometry.topLineY,
    clefBaseline - reach.top * geometry.lineGap,
    ...noteTops,
  );
  const bottom = Math.max(
    bottomLineY(geometry),
    clefBaseline - reach.bottom * geometry.lineGap,
    ...noteBottoms,
  );
  return {
    top: round(top - geometry.padding),
    height: round(bottom - top + 2 * geometry.padding),
  };
}

export type StaffRowSvgInput = Readonly<{
  clef: Clef;
  // In the order they are to be read, which is why the caller passes them:
  // low to high across the staff.
  pitches: readonly string[];
  // The ones that are on. The rest are drawn faint, so the row reads as a
  // choice rather than as a picture of a scale.
  selected?: readonly string[];
  geometry?: StaffGeometry;
  // How much room each note is given, which is also how large a target it is.
  columnWidth?: number;
  // Room under the staff for each note's name.
  nameHeight?: number;
  // Major-key signature; pitch positions remain natural staff positions.
  keyFifths?: number;
  // Add movable-do names below the pitch names (C major when key is omitted).
  showSolfege?: boolean;
  // Reference diagrams draw all notes at full opacity without controls.
  interactive?: boolean;
}>;

// Every note of a clef on one staff, each in a column of its own that carries
// its name and answers a tap. The same geometry as the card draws, so a note
// is in the place the card will put it.
export function renderStaffRowSvg({
  clef,
  pitches,
  selected = [],
  geometry = ROW_STAFF_GEOMETRY,
  columnWidth = 30,
  nameHeight = 22,
  keyFifths,
  showSolfege = false,
  interactive = true,
}: StaffRowSvgInput): string {
  if (!isClef(clef)) {
    throw new RangeError(
      `clef must be one of ${CLEFS.join(", ")}: ${String(clef)}`,
    );
  }
  const key = MAJOR_KEYS.find(
    (item) => item.fifths === (keyFifths ?? (showSolfege ? 0 : undefined)),
  );
  if (keyFifths !== undefined && !key) {
    throw new RangeError(
      `keyFifths must be an integer from -7 to 7: ${keyFifths}`,
    );
  }
  const clefColumnWidth = clefWidth(geometry);
  const signatureWidth = keyFifths === undefined || keyFifths === 0
    ? 0
    : geometry.lineGap * 1.5 +
      Math.abs(keyFifths) * keySignatureAdvance(geometry.lineGap, "reading");
  const on = new Set(selected);
  const notes = pitches.map((pitch, index) => ({
    pitch,
    step: staffStep(clef, validatePitch(clef, pitch)),
    centerX:
      clefColumnWidth + signatureWidth + (index + 0.5) * columnWidth,
    on: on.has(pitch),
  }));
  const frame = staffFrame(
    clef,
    notes.map(({ step }) => step),
    geometry,
  );
  const width = clefColumnWidth + signatureWidth + pitches.length * columnWidth;
  const height = frame.height + nameHeight;
  const nameBaselineY = frame.top + frame.height + nameHeight - geometry.padding;

  const lines = Array.from({ length: geometry.lineCount }, (_, lineIndex) => {
    const y = staffStepY(geometry, 2 * lineIndex);
    return `<line class="staff__line" data-line="${lineIndex + 1}" x1="0" y1="${y}" x2="${round(width)}" y2="${y}"/>`;
  }).join("");

  const columns = notes
    .map(({ pitch, step, centerX, on: isOn }) => {
      const ledgers = ledgerSteps(step)
        .map((ledgerStep) => {
          const y = staffStepY(geometry, ledgerStep);
          return `<line class="staff__ledger-line" x1="${round(centerX - geometry.ledgerHalfWidth)}" y1="${y}" x2="${round(centerX + geometry.ledgerHalfWidth)}" y2="${y}"/>`;
        })
        .join("");
      const noteY = staffStepY(geometry, step);
      const parsed = parsePitch(pitch);
      const spelledPitch = keyFifths === undefined
        ? pitch
        : `${parsed.note}${keySignatureAccidentalForNote(parsed.note, keyFifths)}${parsed.octave}`;
      const tonic = key === undefined ? undefined : key.tonic[0];
      const solfege = tonic === undefined
        ? undefined
        : ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"][
            (diatonicIndex(parsed) -
              diatonicIndex({ note: tonic as Pitch["note"], octave: parsed.octave }) +
              7) % 7
          ];
      return [
        `<g class="staff__note" data-pitch="${escapeXml(pitch)}"${interactive ? ` data-selected="${isOn}" role="checkbox" aria-checked="${isOn}" aria-label="${escapeXml(spelledPitch)}" tabindex="0"` : ""}>`,
        interactive
          ? `<rect class="staff__column" x="${round(centerX - columnWidth / 2)}" y="${frame.top}" width="${columnWidth}" height="${round(height)}"/>`
          : "",
        ledgers,
        `<path class="staff__note-head" fill-rule="evenodd" d="${noteHeadPath(geometry, centerX, noteY)}"/>`,
        `<text class="staff__name" x="${round(centerX)}" y="${round(showSolfege ? nameBaselineY - geometry.lineGap * 1.5 : nameBaselineY)}">${escapeXml(spelledPitch)}</text>`,
        showSolfege && solfege
          ? `<text class="staff__solfege" x="${round(centerX)}" y="${round(nameBaselineY)}">${solfege}</text>`
          : "",
        "</g>",
      ].join("");
    })
    .join("");

  return [
    `<svg class="staff staff-row${interactive ? "" : " staff-row--reference"}" xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}"`,
    ` viewBox="0 ${frame.top} ${round(width)} ${round(height)}" role="group"`,
    ` aria-label="${CLEF_LABELS[clef]} clef${key ? `, ${escapeXml(key.tonic)} major` : ""} notes">`,
    `<style>${staffStyles(geometry)}${staffRowStyles(geometry, interactive)}</style>`,
    lines,
    `<text class="staff__clef" data-clef="${clef}" x="${geometry.clefX}" y="${clefBaselineY(geometry, clef)}">${CLEF_GLYPHS[clef]}</text>`,
    keyFifths === undefined ? "" : renderRowKeySignature(clef, keyFifths, geometry, clefColumnWidth),
    columns,
    "</svg>",
  ].join("");
}

function renderRowKeySignature(clef: Clef, fifths: number, geometry: StaffGeometry, clefColumnWidth: number): string {
  const signature = keySignatureAccidentals(
    clef, fifths, clefColumnWidth + geometry.lineGap * 0.7,
    geometry.topLineY, geometry.lineGap, "reading",
  );
  const glyphCss = escapeXml(keySignatureGlyphCss(
    geometry.lineGap, "reading", fifths > 0 ? "sharp" : "flat",
  ));
  const glyphs = signature.accidentals.map(({ x, y }) =>
    `<text x="${round(x)}" y="${round(y)}" style="${glyphCss}">${signature.symbol}</text>`,
  ).join("");
  return `<g class="staff__key-signature" aria-hidden="true" fill="${geometry.palette.note}">${glyphs}</g>`;
}

// The clef glyph's own column, which no note is placed in.
function clefWidth(geometry: StaffGeometry): number {
  return geometry.clefX + geometry.lineGap * 3.4;
}

function staffRowStyles(geometry: StaffGeometry, interactive = true): string {
  const selector = interactive ? ".staff-row:not(.staff-row--reference)" : ".staff-row--reference";
  const inactive = `${selector} .staff__note[data-selected="false"]`;
  return [
    interactive ? [
      `${selector} .staff__note{cursor:pointer}`,
      `${selector} .staff__column{fill:currentColor;opacity:0.1}`,
      `${inactive} .staff__column{opacity:0}`,
      `${inactive} .staff__note-head,${inactive} .staff__ledger-line,${inactive} .staff__name{opacity:0.3}`,
    ].join("") : "",
    `${selector} .staff__name,${selector} .staff__solfege{fill:currentColor;font-family:"Noto Sans","DejaVu Sans",sans-serif;font-size:${geometry.lineGap * 1.3}px;text-anchor:middle}`,
  ].join("");
}

export function renderStaffSvg({
  clef,
  pitch,
  label,
  geometry = CARD_STAFF_GEOMETRY,
  decorative = false,
}: StaffSvgInput): string {
  if (!isClef(clef)) {
    throw new RangeError(
      `clef must be one of ${CLEFS.join(", ")}: ${String(clef)}`,
    );
  }
  const parsed = pitch === undefined ? undefined : validatePitch(clef, pitch);
  const step = parsed === undefined ? undefined : staffStep(clef, parsed);
  // Deck media is drawn without a label, so a staff carrying a note never
  // names it and the same image can serve both sides of a card.
  const title =
    parsed !== undefined && label !== undefined
      ? `${formatPitch(parsed)} on the ${clef} clef staff`
      : `${CLEF_LABELS[clef]} clef staff`;
  const description =
    parsed === undefined
      ? `An empty ${clef} clef staff.`
      : label === undefined
        ? `A ${clef} clef staff with a single whole note.`
        : `A ${clef} clef staff with a whole note on ${formatPitch(parsed)}.`;

  // The frame holds every note the clef can carry, whether or not this one
  // needs the room: trimming it to the note drawn would slide the staff up and
  // down the card as the answer changed.
  const frame = staffFrame(clef, undefined, geometry);
  const viewTop = frame.top;
  const labelBaselineY = round(
    frame.top + frame.height + geometry.answerHeight - 16,
  );
  const height = round(
    frame.height + (label === undefined ? 0 : geometry.answerHeight),
  );

  const lines = Array.from({ length: geometry.lineCount }, (_, lineIndex) => {
    const line = lineIndex + 1;
    const y = staffStepY(geometry, 2 * lineIndex);
    return `<line class="staff__line" data-line="${line}" x1="${geometry.startX}" y1="${y}" x2="${geometry.endX}" y2="${y}"/>`;
  }).join("");
  const ledgerLines =
    step === undefined
      ? ""
      : ledgerSteps(step)
          .map((ledgerStep) => {
            const y = staffStepY(geometry, ledgerStep);
            return `<line class="staff__ledger-line" data-step="${ledgerStep}" x1="${geometry.noteCenterX - geometry.ledgerHalfWidth}" y1="${y}" x2="${geometry.noteCenterX + geometry.ledgerHalfWidth}" y2="${y}"/>`;
          })
          .join("");
  const noteHead =
    step === undefined
      ? ""
      : `<g class="staff__note" data-step="${step}" data-x="${geometry.noteCenterX}" data-y="${staffStepY(geometry, step)}"><path class="staff__note-head" fill-rule="evenodd" d="${noteHeadPath(geometry, geometry.noteCenterX, staffStepY(geometry, step))}"/></g>`;
  const labelText =
    label === undefined
      ? ""
      : `<text class="staff__answer" x="${geometry.width / 2}" y="${labelBaselineY}">${escapeXml(label)}</text>`;
  const background =
    geometry.palette.background === null
      ? ""
      : `<rect x="0" y="${viewTop}" width="${geometry.width}" height="${height}" fill="${geometry.palette.background}"/>`;
  const accessibility = decorative
    ? 'role="presentation" aria-hidden="true"'
    : 'role="img" aria-labelledby="title description"';
  const labels = decorative
    ? ""
    : `<title id="title">${escapeXml(title)}</title><desc id="description">${escapeXml(description)}</desc>`;

  return [
    `<svg class="staff" xmlns="http://www.w3.org/2000/svg" width="${geometry.width}" height="${height}" viewBox="0 ${viewTop} ${geometry.width} ${height}" ${accessibility}>`,
    labels,
    `<style>${staffStyles(geometry)}</style>`,
    background,
    lines,
    `<text class="staff__clef" data-clef="${clef}" x="${geometry.clefX}" y="${clefBaselineY(geometry, clef)}">${CLEF_GLYPHS[clef]}</text>`,
    ledgerLines,
    noteHead,
    labelText,
    "</svg>",
  ].join("");
}

function validatePitch(clef: Clef, pitch: string): Pitch {
  const parsed = parsePitch(pitch);
  const range = CLEF_RANGES[clef];
  const pitchIndex = diatonicIndex(parsed);
  if (
    pitchIndex < diatonicIndex(parsePitch(range.lowest)) ||
    pitchIndex > diatonicIndex(parsePitch(range.highest))
  ) {
    throw new RangeError(
      `${formatPitch(parsed)} is outside the ${clef} clef range ${range.lowest}-${range.highest}`,
    );
  }
  return parsed;
}

function staffStyles(geometry: StaffGeometry): string {
  const { palette } = geometry;
  return [
    `.staff__line,.staff__ledger-line{stroke:${palette.line};stroke-width:${geometry.lineWidth};stroke-linecap:round}`,
    `.staff__clef{fill:${palette.note};font-family:"Noto Music","Noto Sans Symbols2","DejaVu Sans",sans-serif;font-size:${geometry.lineGap * 4}px}`,
    `.staff__note-head{fill:${palette.note}}`,
    `.staff__answer{fill:${palette.label};font-family:"Noto Sans","DejaVu Sans",sans-serif;font-size:${geometry.answerFontSize}px;font-weight:700;text-anchor:middle}`,
  ].join("");
}

// A whole note: a wide outer oval with a slanted hole punched out by the
// even-odd fill rule, so the staff or ledger line stays visible through it.
function noteHeadPath(
  geometry: StaffGeometry,
  cx: number,
  cy: number,
): string {
  return [
    ellipseSubPath(
      cx,
      cy,
      geometry.noteHeadRadiusX,
      geometry.noteHeadRadiusY,
      0,
    ),
    ellipseSubPath(
      cx,
      cy,
      geometry.noteHoleRadiusX,
      geometry.noteHoleRadiusY,
      geometry.noteHoleRotation,
    ),
  ].join(" ");
}

function ellipseSubPath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
): string {
  const radians = (rotation * Math.PI) / 180;
  const dx = rx * Math.cos(radians);
  const dy = rx * Math.sin(radians);
  const startX = round(cx - dx);
  const startY = round(cy - dy);
  const endX = round(cx + dx);
  const endY = round(cy + dy);

  return `M ${startX} ${startY} A ${rx} ${ry} ${rotation} 0 1 ${endX} ${endY} A ${rx} ${ry} ${rotation} 0 1 ${startX} ${startY} Z`;
}

function round(value: number): number {
  return Number(value.toFixed(3));
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
