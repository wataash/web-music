// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import {
  angleForHour,
  createLabelPlacements,
  DEFAULT_LAYOUT,
  fifthsForMajorNote,
  formatNoteName,
  formatNumber,
  isBasicNote,
  pointAtClockAngle,
  POSITIONS,
  type DiagramLayout,
  type LabelPlacement,
} from "@circle-of-fifths/core";
import {
  KEY_SIGNATURE_FONT_FAMILY,
  keySignatureAccidentals,
  keySignatureAdvance,
  renderKeySignatureGlyph,
} from "@web-music/music-staff-core";
import { musicGlyphMetrics, renderMusicGlyphSvg, renderStaffMusicGlyph } from "@web-music/music-notation";

export { formatNumber } from "@circle-of-fifths/core";

export const DEFAULT_TITLE = "Circle of fifths";
export const DEFAULT_DESCRIPTION =
  "A monochrome circle of fifths with major keys on the outer ring, minor keys on the inner ring, and treble and bass key signatures outside the circle.";

const OUTER_NOTATION_VIEW_BOX = {
  x: -56.5,
  y: -81.5,
  width: 1113,
  height: 1149,
} as const;
const KEY_SIGNATURE_MIN_DISTANCE = 480;
// Clearance between neighbouring key signatures, beyond their staves.
const KEY_SIGNATURE_GAP = 4;
const STAFF_START_X = -150;
const STAFF_LINE_Y = [-12, -6, 0, 6, 12] as const;
const STAFF_Y = [-25, 25] as const;
const STAFF_HALF_HEIGHT =
  (STAFF_Y[1] +
    STAFF_LINE_Y[STAFF_LINE_Y.length - 1] -
    (STAFF_Y[0] + STAFF_LINE_Y[0])) /
  2;
const CLEF_X = -136;
const SIGNATURE_START_X = -110;
const SIGNATURE_GAP = 10;
const EMPTY_SIGNATURE_WIDTH = 18;
const ACCIDENTAL_WIDTH = 12;

/**
 * The face note names are set in. `faces` holds any `@font-face` rules the SVG
 * embeds, and `letterAdvances` the per-em widths of A–G (from the bold face)
 * and a–g (regular) that centre an enlarged single spelling.
 */
export type LabelFont = Readonly<{
  family: string;
  faces?: string;
  letterAdvances: Readonly<Record<string, number>>;
}>;

// Approximate Noto Sans advances.
export const DEFAULT_LABEL_FONT: LabelFont = {
  family: '"Noto Sans", "DejaVu Sans", "Noto Music", "Noto Sans Symbols2", sans-serif',
  letterAdvances: {
    A: 0.72, B: 0.88, C: 0.70, D: 0.75, E: 0.63, F: 0.59, G: 0.77,
    a: 0.61, b: 0.63, c: 0.55, d: 0.63, e: 0.61, f: 0.39, g: 0.63,
  },
};

function diagramStyles(font: LabelFont): string {
  return `${font.faces ?? ""}
  .circle-of-fifths__line {
    fill: none;
    stroke: #000;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }
  .circle-of-fifths__highlight {
    fill: #fff2a8;
  }
  .circle-of-fifths__basic-highlight {
    fill: #ddd;
  }
  .circle-of-fifths__label {
    fill: #000;
    color: #000;
    font-family: ${font.family};
    text-anchor: middle;
    dominant-baseline: central;
  }
  .circle-of-fifths__major {
    font-size: 30px;
    font-weight: 700;
  }
  .circle-of-fifths__minor {
    font-size: 30px;
    font-weight: 500;
  }
  .circle-of-fifths__accidental {
    text-anchor: start;
  }
  .circle-of-fifths__staff-line {
    stroke: #000;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .circle-of-fifths__key-signature {
    fill: #000;
    color: #000;
    font-family: ${KEY_SIGNATURE_FONT_FAMILY};
    dominant-baseline: central;
  }
  .circle-of-fifths__clef {
    color: #000;
  }
  .circle-of-fifths--single-note .circle-of-fifths__major {
    font-size: 88px;
  }
  .circle-of-fifths--single-note .circle-of-fifths__minor {
    font-size: 84px;
  }
`;
}

export const DIAGRAM_STYLES = diagramStyles(DEFAULT_LABEL_FONT);

export type LabelLayout = "standard" | "single-note";
/**
 * How a cell's spellings line up: stacked upright, or along the radius with
 * the sharpest or the flattest spelling nearest the rim.
 */
export type LabelStacking = "vertical" | "sharps-outside" | "flats-outside";
export type DiagramRing = "outer" | "inner";

export type HighlightedCell = Readonly<{
  hour: number;
  ring: DiagramRing;
}>;

export type NoteLine = Readonly<{
  source: string;
  letter: string;
  accidental: string;
  accidentalX: number;
  basic: boolean;
  centerWholeNote: boolean;
  fontSize: number;
  x: number;
  y: number;
}>;

export type LabelModel = LabelPlacement &
  Readonly<{
    noteLines: readonly NoteLine[];
  }>;

export type SectorLine = Readonly<{
  inner: Readonly<{ x: number; y: number }>;
  outer: Readonly<{ x: number; y: number }>;
}>;

export type SectorModel = Readonly<{
  hour: number;
  labels: readonly [LabelModel, LabelModel];
}>;

export type KeyAccidentalModel = Readonly<{
  x: number;
  y: number;
}>;

export type KeySignatureModel = Readonly<{
  note: string;
  fifths: number;
  symbol: "♯" | "♭" | "";
  accidentals: readonly KeyAccidentalModel[];
}>;

export type StaffModel = Readonly<{
  clef: "treble" | "bass";
  clefGlyph: "𝄞" | "𝄢";
  lineEndX: number;
  y: number;
  signatures: readonly KeySignatureModel[];
}>;

export type KeySignatureGroupModel = Readonly<{
  hour: number;
  x: number;
  y: number;
  scale: number;
  staffs: readonly [StaffModel, StaffModel];
}>;

export type DiagramViewBox = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type HighlightedCellModel = HighlightedCell &
  Readonly<{
    path: string;
  }>;

export type DiagramModel = Readonly<{
  layout: DiagramLayout;
  viewBox: DiagramViewBox;
  highlightedCells: readonly HighlightedCellModel[];
  keySignatureGroups: readonly KeySignatureGroupModel[];
  sectorLines: readonly SectorLine[];
  sectors: readonly SectorModel[];
}>;

export type CreateDiagramModelOptions = Readonly<{
  visibleNotes?: readonly string[];
  labelLayout?: LabelLayout;
  /**
   * Note-name size in pixels for both rings. A cell holding one spelling then
   * centres it whole, accidental included, as the single-note layout does.
   */
  labelSize?: number;
  labelStacking?: LabelStacking;
  /**
   * With radial stacking, how far (0–1) each cell drifts along the radius by
   * its spellings' place on the line of fifths, 1 giving a spiral of fifths.
   */
  labelSpiral?: number;
  /** Size of the key signatures against their default, which keep clear of the rim. */
  keySignatureScale?: number;
  /** Radii of the rim, the circle between the rings and the hole; labels sit midway. */
  radii?: Readonly<{ outer: number; divider: number; inner: number }>;
  highlightedCells?: readonly HighlightedCell[];
  showKeySignatures?: boolean;
}>;

export type RenderCircleOfFifthsOptions = CreateDiagramModelOptions &
  Readonly<{
    title?: string;
    description?: string;
    glyphs?: "paths" | "text";
    labelFont?: LabelFont;
  }>;

export function createDiagramModel({
  visibleNotes,
  labelLayout = "standard",
  labelSize,
  labelStacking = "vertical",
  labelSpiral = 0,
  radii,
  highlightedCells = [],
  showKeySignatures = false,
  keySignatureScale = 1,
}: CreateDiagramModelOptions = {}): DiagramModel {
  const visibleNoteSet = createVisibleNoteSet(visibleNotes);
  const layout: DiagramLayout = radii === undefined ? DEFAULT_LAYOUT : {
    ...DEFAULT_LAYOUT,
    outerRadius: radii.outer,
    dividerRadius: radii.divider,
    innerRadius: radii.inner,
    majorLabelRadius: (radii.outer + radii.divider) / 2,
    minorLabelRadius: (radii.divider + radii.inner) / 2,
  };
  const placements = createLabelPlacements(POSITIONS, layout);
  const sectorLines = Array.from({ length: 12 }, (_, index) => {
    const degrees = index * 30 + 15;
    return {
      inner: pointAtClockAngle(
        layout.center,
        layout.innerRadius,
        degrees,
      ),
      outer: pointAtClockAngle(
        layout.center,
        layout.outerRadius,
        degrees,
      ),
    };
  });

  const labelOptions = { labelLayout, labelSize, labelStacking, labelSpiral };
  const keySignatureGroups = showKeySignatures
    ? createKeySignatureGroups(keySignatureScale)
    : [];
  return {
    layout,
    viewBox: showKeySignatures
      ? keySignatureScale === 1
        ? OUTER_NOTATION_VIEW_BOX
        : viewBoxAround(keySignatureGroups)
      : {
          x: 0,
          y: 0,
          width: DEFAULT_LAYOUT.size,
          height: DEFAULT_LAYOUT.size,
        },
    highlightedCells: createHighlightedCellModels(highlightedCells, layout),
    keySignatureGroups,
    sectorLines,
    sectors: POSITIONS.map((position) => ({
      hour: position.hour,
      labels: [
        createLabelModel(findPlacement(placements, position.hour, "major"), visibleNoteSet, labelOptions),
        createLabelModel(findPlacement(placements, position.hour, "minor"), visibleNoteSet, labelOptions),
      ],
    })),
  };
}

export function renderCircleOfFifthsSvg(
  {
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    glyphs = "paths",
    labelFont = DEFAULT_LABEL_FONT,
    ...modelOptions
  }: RenderCircleOfFifthsOptions = {},
): string {
  const { labelLayout = "standard", labelSize } = modelOptions;
  const model = createDiagramModel(modelOptions);
  const { layout, viewBox } = model;
  const rootClass =
    labelLayout === "single-note"
      ? "circle-of-fifths circle-of-fifths--single-note"
      : "circle-of-fifths";

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" width="${viewBox.width}" height="${viewBox.height}" role="img" aria-labelledby="circle-of-fifths-title circle-of-fifths-description" class="${rootClass}">`,
    `  <title id="circle-of-fifths-title">${escapeText(title)}</title>`,
    `  <desc id="circle-of-fifths-description">${escapeText(description)}</desc>`,
    `  <style>${diagramStyles(labelFont)}${labelSize === undefined ? "" : `  .circle-of-fifths .circle-of-fifths__label {\n    font-size: ${formatNumber(labelSize)}px;\n  }\n`}</style>`,
    `  <rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="#fff"/>`,
    ...model.highlightedCells.map(renderHighlightedCell),
    ...model.keySignatureGroups.map(renderKeySignatureGroup),
    '  <g aria-hidden="true">',
    `    <circle class="circle-of-fifths__line" cx="${layout.center}" cy="${layout.center}" r="${layout.outerRadius}"/>`,
    `    <circle class="circle-of-fifths__line" cx="${layout.center}" cy="${layout.center}" r="${layout.dividerRadius}"/>`,
    `    <circle class="circle-of-fifths__line" cx="${layout.center}" cy="${layout.center}" r="${layout.innerRadius}"/>`,
    ...model.sectorLines.map(
      ({ inner, outer }) =>
        `    <line class="circle-of-fifths__line" x1="${formatNumber(inner.x)}" y1="${formatNumber(inner.y)}" x2="${formatNumber(outer.x)}" y2="${formatNumber(outer.y)}"/>`,
    ),
    "  </g>",
    ...model.sectors.map((sector) => renderSector(sector, glyphs, labelFont)),
    "</svg>",
    "",
  ].join("\n");
}

export function renderDarkCircleOfFifthsSvg(
  options: RenderCircleOfFifthsOptions = {},
): string {
  return renderCircleOfFifthsSvg(options)
    .replaceAll("stroke: #000;", "stroke: #d1d5db;")
    .replaceAll("fill: #000;", "fill: #f3f4f6;")
    .replaceAll("color: #000;", "color: #f3f4f6;")
    .replace("fill: #fff2a8;", "fill: #5b4f16;")
    .replace("fill: #ddd;", "fill: #374151;")
    .replace('fill="#fff"/>', 'fill="#111827"/>');
}

function createKeySignatureGroups(scale: number): readonly KeySignatureGroupModel[] {
  // Larger staves keep clear of the rim and of each other: all of them move
  // out together until no two neighbours, padded by a gap, overlap.
  for (let distance = KEY_SIGNATURE_MIN_DISTANCE; ; distance += 4) {
    const groups = keySignatureGroupsAt(scale, distance);
    const boxes = groups.map(({ x, y, staffs }) => ({
      left: x + STAFF_START_X * scale,
      right: x + staffs[0].lineEndX * scale,
      top: y - (STAFF_HALF_HEIGHT + KEY_SIGNATURE_GAP) * scale,
      bottom: y + (STAFF_HALF_HEIGHT + KEY_SIGNATURE_GAP) * scale,
    }));
    const overlaps = boxes.some((box, index) => {
      const next = boxes[(index + 1) % boxes.length];
      return box.left < next.right && next.left < box.right && box.top < next.bottom && next.top < box.bottom;
    });
    if (!overlaps) return groups;
  }
}

function keySignatureGroupsAt(scale: number, distance: number): readonly KeySignatureGroupModel[] {
  return POSITIONS.map(({ hour, major }) => {
    const staffs = [
      createStaffModel("treble", STAFF_Y[0], major),
      createStaffModel("bass", STAFF_Y[1], major),
    ] as const;
    const staffHalfWidth =
      (staffs[0].lineEndX - STAFF_START_X) / 2;
    const centeringOffset =
      -(STAFF_START_X + staffs[0].lineEndX) / 2;
    const radius = radiusForMinimumRectangleDistance(
      angleForHour(hour),
      staffHalfWidth * scale,
      STAFF_HALF_HEIGHT * scale,
      distance,
    );
    const point = pointAtClockAngle(
      DEFAULT_LAYOUT.center,
      radius,
      angleForHour(hour),
    );

    return {
      hour,
      x: point.x + centeringOffset * scale,
      y: point.y,
      scale,
      staffs,
    };
  });
}

// The default box was fitted by hand; another size takes the staves' extent,
// with the clefs' overhang and a margin, and the circle.
function viewBoxAround(groups: readonly KeySignatureGroupModel[]): Readonly<{ x: number; y: number; width: number; height: number }> {
  const margin = 3;
  const xs = groups.flatMap(({ x, scale, staffs }) => [x + STAFF_START_X * scale, x + staffs[0].lineEndX * scale]);
  const ys = groups.flatMap(({ y, scale }) => [y - (STAFF_HALF_HEIGHT + 24.5) * scale, y + (STAFF_HALF_HEIGHT + 24.5) * scale]);
  const left = Math.min(0, ...xs) - margin;
  const top = Math.min(0, ...ys) - margin;
  const right = Math.max(DEFAULT_LAYOUT.size, ...xs) + margin;
  const bottom = Math.max(DEFAULT_LAYOUT.size, ...ys) + margin;
  return {
    x: Number(formatNumber(left)),
    y: Number(formatNumber(top)),
    width: Number(formatNumber(right - left)),
    height: Number(formatNumber(bottom - top)),
  };
}

function radiusForMinimumRectangleDistance(
  degrees: number,
  halfWidth: number,
  halfHeight: number,
  minimumDistance: number,
): number {
  const radians = (degrees * Math.PI) / 180;
  const horizontal = Math.abs(Math.sin(radians));
  const vertical = Math.abs(Math.cos(radians));
  let lower = 0;
  let upper =
    minimumDistance + Math.hypot(halfWidth, halfHeight) * 2;

  for (let iteration = 0; iteration < 60; iteration += 1) {
    const radius = (lower + upper) / 2;
    const dx = Math.max(radius * horizontal - halfWidth, 0);
    const dy = Math.max(radius * vertical - halfHeight, 0);

    if (Math.hypot(dx, dy) < minimumDistance) {
      lower = radius;
    } else {
      upper = radius;
    }
  }

  return upper;
}

function createStaffModel(
  clef: "treble" | "bass",
  y: number,
  notes: readonly string[],
): StaffModel {
  let x = SIGNATURE_START_X;
  const signatures = notes
    .map((note) => ({ note, fifths: fifthsForMajorNote(note) }))
    .filter(({ fifths }) => Math.abs(fifths) < 8)
    .map(({ note, fifths }) => {
      const count = Math.abs(fifths);
      const signature = {
        note,
        fifths,
        ...keySignatureAccidentals(
          clef,
          fifths,
          x + ACCIDENTAL_WIDTH / 2,
          STAFF_LINE_Y[0],
          STAFF_LINE_Y[1] - STAFF_LINE_Y[0],
          "reading",
        ),
      } as const;
      const width =
        count === 0
          ? EMPTY_SIGNATURE_WIDTH
          : (count - 1) * keySignatureAdvance(6, "reading", fifths < 0 ? "flat" : "sharp") + ACCIDENTAL_WIDTH;
      x += width + SIGNATURE_GAP;
      return signature;
    });

  return {
    clef,
    clefGlyph: clef === "treble" ? "𝄞" : "𝄢",
    lineEndX: x,
    y,
    signatures,
  };
}

function createVisibleNoteSet(
  visibleNotes: readonly string[] | undefined,
): ReadonlySet<string> | undefined {
  if (visibleNotes === undefined) {
    return undefined;
  }

  const availableNotes = new Set<string>(
    POSITIONS.flatMap(({ major, minor }) => [...major, ...minor]),
  );

  for (const note of visibleNotes) {
    formatNoteName(note);
    if (!availableNotes.has(note)) {
      throw new RangeError(`note is not present in the diagram: ${note}`);
    }
  }

  return new Set(visibleNotes);
}

function createHighlightedCellModels(
  highlightedCells: readonly HighlightedCell[],
  layout: DiagramLayout,
): readonly HighlightedCellModel[] {
  const seen = new Set<string>();

  return highlightedCells.map(({ hour, ring }) => {
    const key = `${ring}:${hour}`;
    if (seen.has(key)) {
      throw new RangeError(`duplicate highlighted cell: ${key}`);
    }
    seen.add(key);

    const centerDegrees = angleForHour(hour);
    const outerRadius =
      ring === "outer"
        ? layout.outerRadius
        : layout.dividerRadius;
    const innerRadius =
      ring === "outer"
        ? layout.dividerRadius
        : layout.innerRadius;
    const outerStart = pointAtClockAngle(
      layout.center,
      outerRadius,
      centerDegrees - 15,
    );
    const outerEnd = pointAtClockAngle(
      layout.center,
      outerRadius,
      centerDegrees + 15,
    );
    const innerEnd = pointAtClockAngle(
      layout.center,
      innerRadius,
      centerDegrees + 15,
    );
    const innerStart = pointAtClockAngle(
      layout.center,
      innerRadius,
      centerDegrees - 15,
    );

    return {
      hour,
      ring,
      path: [
        `M ${formatNumber(outerStart.x)} ${formatNumber(outerStart.y)}`,
        `A ${outerRadius} ${outerRadius} 0 0 1 ${formatNumber(outerEnd.x)} ${formatNumber(outerEnd.y)}`,
        `L ${formatNumber(innerEnd.x)} ${formatNumber(innerEnd.y)}`,
        `A ${innerRadius} ${innerRadius} 0 0 0 ${formatNumber(innerStart.x)} ${formatNumber(innerStart.y)}`,
        "Z",
      ].join(" "),
    };
  });
}

function createLabelModel(
  placement: LabelPlacement,
  visibleNotes: ReadonlySet<string> | undefined,
  { labelLayout, labelSize, labelStacking, labelSpiral }: Readonly<{
    labelLayout: LabelLayout;
    labelSize: number | undefined;
    labelStacking: LabelStacking;
    labelSpiral: number;
  }>,
): LabelModel {
  const notes =
    visibleNotes === undefined
      ? placement.notes
      : placement.notes.filter((note) => visibleNotes.has(note));
  if (labelLayout === "single-note" && notes.length > 1) {
    throw new RangeError(
      `single-note layout cannot display ${notes.length} notes in one cell`,
    );
  }

  const size = labelSize ?? 30;
  const scale = size / 30;
  const lineHeight = 38 * scale;
  const accidentalX = 13 * scale;
  const spiral = labelStacking !== "vertical" && labelSpiral > 0 && notes.length > 0;
  const radial = spiral || (labelStacking !== "vertical" && notes.length > 1);
  const centerWholeNote = labelLayout === "single-note" || radial ||
    (labelSize !== undefined && notes.length === 1);
  const firstLineY = -((notes.length - 1) * lineHeight) / 2;
  // Along the radius, neighbours sit far enough apart for their boxes, about
  // 1.55 × 1.15 em, not to meet in that direction.
  const fromCenter = { x: placement.x - DEFAULT_LAYOUT.center, y: placement.y - DEFAULT_LAYOUT.center };
  const distance = Math.hypot(fromCenter.x, fromCenter.y);
  const outward = { x: fromCenter.x / distance, y: fromCenter.y / distance };
  const radialStep = Math.min(
    (1.55 * size) / Math.max(Math.abs(outward.x), 1e-9),
    (1.15 * size) / Math.max(Math.abs(outward.y), 1e-9),
  );
  // A step out is twelve fifths sharper, so the cell drifts a twelfth of a
  // step per fifth its spellings average; C sits at the middle of its ring.
  const fifths = (note: string) =>
    placement.role === "major" ? fifthsForMajorNote(note) : fifthsForMajorNote(note[0].toUpperCase() + note.slice(1)) - 3;
  const drift = spiral
    ? (labelSpiral * radialStep * notes.reduce((sum, note) => sum + fifths(note), 0)) / notes.length / 12
    : 0;

  return {
    ...placement,
    notes,
    noteLines: notes.map((note, index) => {
      const formattedNote = formatNoteName(note);
      return {
        source: note,
        letter: formattedNote[0],
        accidental: formattedNote.slice(1),
        accidentalX,
        // The highlight tells the basic spelling from its neighbours.
        basic: notes.length > 1 && isBasicNote(placement.role, note),
        centerWholeNote,
        fontSize: labelSize ?? (labelLayout === "standard" ? 30 : formattedNote[0] === formattedNote[0].toUpperCase() ? 88 : 84),
        ...radial
          ? (() => {
            // The cell lists its spellings sharpest first.
            const fromCenter = (labelStacking === "sharps-outside" ? 1 : -1) *
              (((notes.length - 1) / 2 - index) * radialStep + drift);
            return { x: outward.x * fromCenter, y: outward.y * fromCenter };
          })()
          : { x: 0, y: firstLineY + index * lineHeight },
      };
    }),
  };
}

function findPlacement(
  placements: readonly LabelPlacement[],
  hour: number,
  role: "major" | "minor",
): LabelPlacement {
  const placement = placements.find(
    (candidate) => candidate.hour === hour && candidate.role === role,
  );
  if (!placement) {
    throw new Error(`missing ${role} placement at ${hour} o'clock`);
  }
  return placement;
}

function renderSector(sector: SectorModel, glyphs: "paths" | "text", font: LabelFont): string {
  return [
    `  <g class="circle-of-fifths__sector" data-hour="${sector.hour}">`,
    ...sector.labels.map((label) => renderLabel(label, glyphs, font)),
    "  </g>",
  ].join("\n");
}

function renderHighlightedCell(cell: HighlightedCellModel): string {
  return `  <path class="circle-of-fifths__highlight" data-hour="${cell.hour}" data-ring="${cell.ring}" d="${cell.path}" aria-hidden="true"/>`;
}

function renderKeySignatureGroup(group: KeySignatureGroupModel): string {
  return [
    `  <g class="circle-of-fifths__key-signature-group" data-hour="${group.hour}" transform="translate(${formatNumber(group.x)} ${formatNumber(group.y)})${group.scale === 1 ? "" : ` scale(${formatNumber(group.scale)})`}" aria-hidden="true">`,
    ...group.staffs.map(renderStaff),
    "  </g>",
  ].join("\n");
}

function renderStaff(staff: StaffModel): string {
  return [
    `    <g class="circle-of-fifths__staff" data-clef="${staff.clef}" transform="translate(0 ${staff.y})">`,
    ...STAFF_LINE_Y.map(
      (y) =>
        `      <line class="circle-of-fifths__staff-line" x1="${STAFF_START_X}" y1="${y}" x2="${formatNumber(staff.lineEndX)}" y2="${y}"/>`,
    ),
    `      <g class="circle-of-fifths__clef">${renderStaffMusicGlyph(staff.clefGlyph, CLEF_X, STAFF_LINE_Y[staff.clef === "bass" ? 1 : 3], 6)}</g>`,
    ...staff.signatures.map(renderKeySignature),
    "    </g>",
  ].join("\n");
}

function renderKeySignature(signature: KeySignatureModel): string {
  return [
    `      <g class="circle-of-fifths__key-signature" data-note="${escapeAttribute(signature.note)}" data-fifths="${signature.fifths}">`,
    ...signature.accidentals.map(({ x, y }) =>
      `        ${renderKeySignatureGlyph(signature.symbol as "♯" | "♭", x, y, 6)}`,
    ),
    "      </g>",
  ].join("\n");
}

function renderLabel(label: LabelModel, glyphs: "paths" | "text", font: LabelFont): string {
  return [
    `    <g class="circle-of-fifths__label circle-of-fifths__${label.role}" data-role="${label.role}" data-notes="${escapeAttribute(label.notes.join(" "))}" transform="translate(${formatNumber(label.x)} ${formatNumber(label.y)})">`,
    ...label.noteLines.map((note) => renderNoteLine(note, glyphs, font)),
    "    </g>",
  ].join("\n");
}

function renderNoteLine(note: NoteLine, glyphs: "paths" | "text", font: LabelFont): string {
  const metrics = glyphs === "paths" ? musicGlyphMetrics(note.accidental, "engraved") : undefined;
  if (note.centerWholeNote) {
    // A spelling beside others along the radius keeps the basic one marked.
    const highlight = (width: number) => note.basic
      ? `        <rect class="circle-of-fifths__basic-highlight" x="${formatNumber(note.x - width / 2)}" y="${formatNumber(note.y - (17 / 30) * note.fontSize)}" width="${formatNumber(width)}" height="${formatNumber((34 / 30) * note.fontSize)}" rx="${formatNumber(note.fontSize / 10)}" aria-hidden="true"/>`
      : undefined;
    if (metrics) {
      const { fontSize } = note;
      const glyphWidth = fontSize * metrics.width;
      const letterWidth = fontSize * (font.letterAdvances[note.letter] ?? 0.62);
      const start = note.x - (letterWidth + glyphWidth) / 2;
      return [
        `      <g class="circle-of-fifths__note" data-note="${escapeAttribute(note.source)}">`,
        highlight(letterWidth + glyphWidth + fontSize * 0.3),
        `        <text class="circle-of-fifths__spelling" x="${formatNumber(start)}" y="${formatNumber(note.y)}" text-anchor="start" data-music-glyph="${note.accidental}" data-music-glyph-enhanced="">${escapeText(note.letter)}<tspan fill-opacity="0">${note.accidental}</tspan></text>`,
        `        ${renderMusicGlyphSvg(note.accidental, { glyphStyle: "engraved", x: start + letterWidth, y: note.y, fontSize, alignY: "center", decorative: true })}`,
        "      </g>",
      ].filter((line) => line !== undefined).join("\n");
    }
    return [
      `      <g class="circle-of-fifths__note" data-note="${escapeAttribute(note.source)}">`,
      highlight(note.fontSize * 1.5),
      `        <text class="circle-of-fifths__spelling" x="${formatNumber(note.x)}" y="${formatNumber(note.y)}">${escapeText(note.letter + note.accidental)}</text>`,
      "      </g>",
    ].filter((line) => line !== undefined).join("\n");
  }

  const scale = note.fontSize / 30;
  const basicHighlight = note.basic
    ? `        <rect class="circle-of-fifths__basic-highlight" x="${formatNumber(-35 * scale)}" y="${formatNumber(note.y - 17 * scale)}" width="${formatNumber(70 * scale)}" height="${formatNumber(34 * scale)}" rx="${formatNumber(3 * scale)}" aria-hidden="true"/>`
    : undefined;
  const accidental = metrics
    ? `\n        <text class="circle-of-fifths__accidental" x="${note.accidentalX}" y="${formatNumber(note.y)}" data-music-glyph="${note.accidental}" data-music-glyph-enhanced="" fill-opacity="0">${note.accidental}</text>\n        ${renderMusicGlyphSvg(note.accidental, { glyphStyle: "engraved", x: note.accidentalX, y: note.y, fontSize: note.fontSize, alignY: "center", decorative: true })}`
    : note.accidental
      ? `\n        <text class="circle-of-fifths__accidental" x="${note.accidentalX}" y="${formatNumber(note.y)}">${escapeText(note.accidental)}</text>`
      : "";
  return [
    `      <g class="circle-of-fifths__note" data-note="${escapeAttribute(note.source)}">`,
    basicHighlight,
    `        <text class="circle-of-fifths__letter" x="0" y="${formatNumber(note.y)}">${escapeText(note.letter)}</text>${accidental}`,
    "      </g>",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
