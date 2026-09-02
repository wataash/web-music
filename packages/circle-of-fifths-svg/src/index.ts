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

export { formatNumber } from "@circle-of-fifths/core";

export const DEFAULT_TITLE = "Circle of fifths";
export const DEFAULT_DESCRIPTION =
  "A monochrome circle of fifths with major keys on the outer ring, minor keys on the inner ring, and treble and bass key signatures outside the circle.";

const OUTER_NOTATION_VIEW_BOX = {
  x: -56.5,
  y: -71.5,
  width: 1113,
  height: 1129,
} as const;
const KEY_SIGNATURE_MIN_DISTANCE = 480;
const STAFF_START_X = -150;
const STAFF_LINE_Y = [-12, -6, 0, 6, 12] as const;
const STAFF_Y = [-25, 25] as const;
const STAFF_HALF_HEIGHT =
  (STAFF_Y[1] +
    STAFF_LINE_Y[STAFF_LINE_Y.length - 1] -
    (STAFF_Y[0] + STAFF_LINE_Y[0])) /
  2;
const CLEF_X = -136;
const CLEF_Y = { treble: 12, bass: 18 } as const;
const SIGNATURE_START_X = -110;
const SIGNATURE_GAP = 10;
const ACCIDENTAL_STEP_X = 7;
const ACCIDENTAL_Y_OFFSET = -7;
const EMPTY_SIGNATURE_WIDTH = 18;
const ACCIDENTAL_WIDTH = 12;

const accidentalYByClef = {
  treble: {
    sharp: [-12, -3, -15, -6, 3, -9, 0],
    flat: [0, -9, 3, -6, 6, -3, 9],
  },
  bass: {
    sharp: [-6, 3, -9, 0, 9, -3, 6],
    flat: [6, -3, 9, 0, 12, 3, 15],
  },
} as const;

export const DIAGRAM_STYLES = `
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
    font-family: "Noto Sans", "DejaVu Sans", "Noto Music",
      "Noto Sans Symbols2", sans-serif;
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
    font-family: "Noto Music", "Noto Sans Symbols2", "DejaVu Sans",
      sans-serif;
    dominant-baseline: central;
  }
  .circle-of-fifths__clef {
    font-size: 46px;
    text-anchor: middle;
  }
  .circle-of-fifths__clef--bass {
    font-size: 40px;
  }
  .circle-of-fifths__key-accidental {
    font-size: 18px;
    text-anchor: middle;
  }
  .circle-of-fifths--single-note .circle-of-fifths__major {
    font-size: 88px;
  }
  .circle-of-fifths--single-note .circle-of-fifths__minor {
    font-size: 84px;
  }
`;

export type LabelLayout = "standard" | "single-note";
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
  clefY: number;
  lineEndX: number;
  y: number;
  signatures: readonly KeySignatureModel[];
}>;

export type KeySignatureGroupModel = Readonly<{
  hour: number;
  x: number;
  y: number;
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
  highlightedCells?: readonly HighlightedCell[];
  showKeySignatures?: boolean;
}>;

export type RenderCircleOfFifthsOptions = CreateDiagramModelOptions &
  Readonly<{
    title?: string;
    description?: string;
  }>;

export function createDiagramModel({
  visibleNotes,
  labelLayout = "standard",
  highlightedCells = [],
  showKeySignatures = false,
}: CreateDiagramModelOptions = {}): DiagramModel {
  const visibleNoteSet = createVisibleNoteSet(visibleNotes);
  const placements = createLabelPlacements();
  const sectorLines = Array.from({ length: 12 }, (_, index) => {
    const degrees = index * 30 + 15;
    return {
      inner: pointAtClockAngle(
        DEFAULT_LAYOUT.center,
        DEFAULT_LAYOUT.innerRadius,
        degrees,
      ),
      outer: pointAtClockAngle(
        DEFAULT_LAYOUT.center,
        DEFAULT_LAYOUT.outerRadius,
        degrees,
      ),
    };
  });

  return {
    layout: DEFAULT_LAYOUT,
    viewBox: showKeySignatures
      ? OUTER_NOTATION_VIEW_BOX
      : {
          x: 0,
          y: 0,
          width: DEFAULT_LAYOUT.size,
          height: DEFAULT_LAYOUT.size,
        },
    highlightedCells: createHighlightedCellModels(highlightedCells),
    keySignatureGroups: showKeySignatures
      ? createKeySignatureGroups()
      : [],
    sectorLines,
    sectors: POSITIONS.map((position) => ({
      hour: position.hour,
      labels: [
        createLabelModel(
          findPlacement(placements, position.hour, "major"),
          visibleNoteSet,
          labelLayout,
        ),
        createLabelModel(
          findPlacement(placements, position.hour, "minor"),
          visibleNoteSet,
          labelLayout,
        ),
      ],
    })),
  };
}

export function renderCircleOfFifthsSvg(
  {
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    visibleNotes,
    labelLayout = "standard",
    highlightedCells,
    showKeySignatures,
  }: RenderCircleOfFifthsOptions = {},
): string {
  const model = createDiagramModel({
    visibleNotes,
    labelLayout,
    highlightedCells,
    showKeySignatures,
  });
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
    `  <style>${DIAGRAM_STYLES}</style>`,
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
    ...model.sectors.map(renderSector),
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
    .replace("fill: #fff2a8;", "fill: #5b4f16;")
    .replace("fill: #ddd;", "fill: #374151;")
    .replace('fill="#fff"/>', 'fill="#111827"/>');
}

function createKeySignatureGroups(): readonly KeySignatureGroupModel[] {
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
      staffHalfWidth,
      STAFF_HALF_HEIGHT,
      KEY_SIGNATURE_MIN_DISTANCE,
    );
    const point = pointAtClockAngle(
      DEFAULT_LAYOUT.center,
      radius,
      angleForHour(hour),
    );

    return {
      hour,
      x: point.x + centeringOffset,
      y: point.y,
      staffs,
    };
  });
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
      const symbol = fifths > 0 ? "♯" : fifths < 0 ? "♭" : "";
      const count = Math.abs(fifths);
      const pattern =
        accidentalYByClef[clef][fifths >= 0 ? "sharp" : "flat"];
      const signature = {
        note,
        fifths,
        symbol,
        accidentals: Array.from({ length: count }, (_, index) => ({
          x:
            x +
            ACCIDENTAL_WIDTH / 2 +
            index * ACCIDENTAL_STEP_X,
          y:
            pattern[index % pattern.length] +
            ACCIDENTAL_Y_OFFSET,
        })),
      } as const;
      const width =
        count === 0
          ? EMPTY_SIGNATURE_WIDTH
          : (count - 1) * ACCIDENTAL_STEP_X + ACCIDENTAL_WIDTH;
      x += width + SIGNATURE_GAP;
      return signature;
    });

  return {
    clef,
    clefGlyph: clef === "treble" ? "𝄞" : "𝄢",
    clefY: CLEF_Y[clef],
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
        ? DEFAULT_LAYOUT.outerRadius
        : DEFAULT_LAYOUT.dividerRadius;
    const innerRadius =
      ring === "outer"
        ? DEFAULT_LAYOUT.dividerRadius
        : DEFAULT_LAYOUT.innerRadius;
    const outerStart = pointAtClockAngle(
      DEFAULT_LAYOUT.center,
      outerRadius,
      centerDegrees - 15,
    );
    const outerEnd = pointAtClockAngle(
      DEFAULT_LAYOUT.center,
      outerRadius,
      centerDegrees + 15,
    );
    const innerEnd = pointAtClockAngle(
      DEFAULT_LAYOUT.center,
      innerRadius,
      centerDegrees + 15,
    );
    const innerStart = pointAtClockAngle(
      DEFAULT_LAYOUT.center,
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
  labelLayout: LabelLayout,
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

  const lineHeight = 38;
  const accidentalX = 13;
  const firstLineY = -((notes.length - 1) * lineHeight) / 2;

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
        basic: isBasicNote(placement.role, note),
        centerWholeNote: labelLayout === "single-note",
        y: firstLineY + index * lineHeight,
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

function renderSector(sector: SectorModel): string {
  return [
    `  <g class="circle-of-fifths__sector" data-hour="${sector.hour}">`,
    ...sector.labels.map(renderLabel),
    "  </g>",
  ].join("\n");
}

function renderHighlightedCell(cell: HighlightedCellModel): string {
  return `  <path class="circle-of-fifths__highlight" data-hour="${cell.hour}" data-ring="${cell.ring}" d="${cell.path}" aria-hidden="true"/>`;
}

function renderKeySignatureGroup(group: KeySignatureGroupModel): string {
  return [
    `  <g class="circle-of-fifths__key-signature-group" data-hour="${group.hour}" transform="translate(${formatNumber(group.x)} ${formatNumber(group.y)})" aria-hidden="true">`,
    ...group.staffs.map(renderStaff),
    "  </g>",
  ].join("\n");
}

function renderStaff(staff: StaffModel): string {
  const clefClass =
    staff.clef === "bass"
      ? "circle-of-fifths__clef circle-of-fifths__clef--bass"
      : "circle-of-fifths__clef circle-of-fifths__clef--treble";

  return [
    `    <g class="circle-of-fifths__staff" data-clef="${staff.clef}" transform="translate(0 ${staff.y})">`,
    ...STAFF_LINE_Y.map(
      (y) =>
        `      <line class="circle-of-fifths__staff-line" x1="${STAFF_START_X}" y1="${y}" x2="${formatNumber(staff.lineEndX)}" y2="${y}"/>`,
    ),
    `      <text class="${clefClass}" x="${CLEF_X}" y="${staff.clefY}">${staff.clefGlyph}</text>`,
    ...staff.signatures.map(renderKeySignature),
    "    </g>",
  ].join("\n");
}

function renderKeySignature(signature: KeySignatureModel): string {
  return [
    `      <g class="circle-of-fifths__key-signature" data-note="${escapeAttribute(signature.note)}" data-fifths="${signature.fifths}">`,
    ...signature.accidentals.map(
      ({ x, y }) =>
        `        <text class="circle-of-fifths__key-accidental" x="${formatNumber(x)}" y="${formatNumber(y)}">${signature.symbol}</text>`,
    ),
    "      </g>",
  ].join("\n");
}

function renderLabel(label: LabelModel): string {
  return [
    `    <g class="circle-of-fifths__label circle-of-fifths__${label.role}" data-role="${label.role}" data-notes="${escapeAttribute(label.notes.join(" "))}" transform="translate(${formatNumber(label.x)} ${formatNumber(label.y)})">`,
    ...label.noteLines.map(renderNoteLine),
    "    </g>",
  ].join("\n");
}

function renderNoteLine(note: NoteLine): string {
  const basicHighlight = note.basic
    ? `        <rect class="circle-of-fifths__basic-highlight" x="${note.centerWholeNote ? -75 : -35}" y="${formatNumber(note.y - (note.centerWholeNote ? 52.5 : 17))}" width="${note.centerWholeNote ? 150 : 70}" height="${note.centerWholeNote ? 105 : 34}" rx="${note.centerWholeNote ? 8 : 3}" aria-hidden="true"/>`
    : undefined;

  if (note.centerWholeNote) {
    return [
      `      <g class="circle-of-fifths__note" data-note="${escapeAttribute(note.source)}">`,
      basicHighlight,
      `        <text class="circle-of-fifths__spelling" x="0" y="${formatNumber(note.y)}">${escapeText(note.letter + note.accidental)}</text>`,
      "      </g>",
    ]
      .filter((line) => line !== undefined)
      .join("\n");
  }

  const accidental = note.accidental
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
