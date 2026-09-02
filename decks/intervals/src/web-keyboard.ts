// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

export type WebIntervalKeyboardLabel = Readonly<{
  text: string;
  x: number;
  y: number;
  size: number;
}>;

export type WebIntervalKeyboard = Readonly<{
  id: string;
  svg: string;
  labels: readonly WebIntervalKeyboardLabel[];
}>;

// This function is deliberately self-contained. Its source is embedded in the
// web card templates below, while the TypeScript version is also used by
// the Anki generator. Keeping one drawing implementation prevents the static
// and dynamic keyboards from drifting apart.
export function drawIntervalKeyboard(
  rootName: string,
  answerName: string | null,
  physicalKeyCount: number,
  // The root is what the question names, so it is marked unless a reader who
  // wants a bare keyboard in front of them says otherwise.
  markRoot = true,
  // The front marks the answer keys for a reader who asked to see them, but
  // leaves the naming to them: the keys say where, the question mark says the
  // rest is theirs.
  nameAnswer = true,
): WebIntervalKeyboard {
  type Key = Readonly<{ index: number; black: boolean }>;
  type Mark = Readonly<{
    key: Key;
    text: string;
    tone: "answer" | "given";
  }>;
  type Range = Readonly<{
    firstSemitone: number;
    lastSemitone: number;
    x: number;
    width: number;
  }>;

  const allowedKeyCounts = [25, 27, 29, 31, 33, 35, 37];
  if (!allowedKeyCounts.includes(physicalKeyCount)) {
    throw new RangeError("keyCount must be an odd number from 25 through 37");
  }

  const notes = ["C", "D", "E", "F", "G", "A", "B"];
  const naturalSemitones = [0, 2, 4, 5, 7, 9, 11];
  const blackKeyAfter = new Set(["C", "D", "F", "G", "A"]);
  const accidentalByName: Readonly<Record<string, number>> = {
    bb: -2,
    b: -1,
    "": 0,
    "#": 1,
    "##": 2,
  };
  const geometry = {
    width: 260,
    whiteKeyAspect: 145 / 23.5,
    maxWhiteKeyHeight: 96,
    blackKeyWidthRatio: 0.58,
    blackKeyHeightRatio: 0.62,
    outlineWidth: 2,
    cornerRadius: 3,
    padding: 11,
    labelFontSize: 17,
  };

  function normalizeName(value: string): string {
    return value
      .replaceAll("𝄫", "bb")
      .replaceAll("𝄪", "##")
      .replaceAll("♭", "b")
      .replaceAll("♯", "#");
  }

  function formatName(value: string): string {
    return normalizeName(value)
      .replaceAll("bb", "𝄫")
      .replaceAll("##", "𝄪")
      .replaceAll("b", "♭")
      .replaceAll("#", "♯");
  }

  function notePitchClass(value: string): number {
    const match = /^([A-G])(bb|##|b|#)?$/.exec(normalizeName(value));
    if (match === null) throw new TypeError(`invalid note: ${value}`);
    const natural = naturalSemitones[notes.indexOf(match[1])];
    const accidental = accidentalByName[match[2] ?? ""];
    return pitchClass(natural + accidental);
  }

  function pitchClass(value: number): number {
    return ((value % 12) + 12) % 12;
  }

  function pitchAtIndex(index: number): Readonly<{
    note: string;
    octave: number;
  }> {
    const noteIndex = ((index % 7) + 7) % 7;
    return { note: notes[noteIndex], octave: Math.floor(index / 7) };
  }

  function formatPitch(index: number): string {
    const pitch = pitchAtIndex(index);
    return `${pitch.note}${pitch.octave}`;
  }

  function formatSemitone(semitone: number): string {
    const pitchNames = [
      "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
    ];
    return `${pitchNames[pitchClass(semitone)]}${Math.floor(semitone / 12) - 1}`;
  }

  function pitchSemitoneAtIndex(index: number): number {
    const pitch = pitchAtIndex(index);
    return (pitch.octave + 1) * 12 + naturalSemitones[notes.indexOf(pitch.note)];
  }

  function keyAtSemitone(semitone: number): Key {
    const octave = Math.floor(semitone / 12) - 1;
    const within = semitone - (octave + 1) * 12;
    const white = naturalSemitones.indexOf(within);
    if (white >= 0) return { index: octave * 7 + white, black: false };
    return {
      index: octave * 7 + naturalSemitones.indexOf(within - 1),
      black: true,
    };
  }

  function keyId(key: Key): string {
    return `${key.index}${key.black ? "#" : ""}`;
  }

  function round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  function clamp(value: number, lowest: number, highest: number): number {
    return Math.min(Math.max(value, lowest), highest);
  }

  function escapeXml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // Middle C through the B above it, which is where every root is placed.
  const rootOctaveFirstSemitone = 60;
  const rootOctaveLastSemitone = 71;
  const rootSemitone = rootOctaveFirstSemitone + notePitchClass(rootName);
  const rootMark: Mark = {
    key: keyAtSemitone(rootSemitone),
    text: formatName(rootName),
    tone: "given",
  };
  const marks: Mark[] = [];
  if (answerName !== null) {
    const answerPitchClass = notePitchClass(answerName);
    const below = pitchClass(rootSemitone - answerPitchClass) || 12;
    const above = pitchClass(answerPitchClass - rootSemitone) || 12;
    const answerText = nameAnswer ? formatName(answerName) : "?";
    marks.push(
      {
        key: keyAtSemitone(rootSemitone - below),
        text: answerText,
        tone: "answer",
      },
      {
        key: keyAtSemitone(rootSemitone + above),
        text: answerText,
        tone: "answer",
      },
    );
  }
  if (markRoot) marks.push(rootMark);

  // Every selectable board is a crop of the same underlying keyboard. Its
  // centre is the boundary between E4 and F4, matching an 88-key piano. The
  // question and its hidden answer therefore cannot move the board.
  const fullFirstIndex = 2 * 7 + 5; // A2
  const fullWhiteKeyCount = 24; // A2 through C6
  const centerLeftSemitone = 64; // E4
  const centerRightSemitone = 65; // F4
  const radius = (physicalKeyCount - 1) / 2;
  const whiteKeyWidth = (geometry.width - 2 * geometry.padding) / 7;
  const fullWidth =
    2 * geometry.padding + fullWhiteKeyCount * whiteKeyWidth;
  const drawnWhiteKeyWidth = whiteKeyWidth;
  const whiteKeyHeight = Math.min(
    geometry.maxWhiteKeyHeight,
    drawnWhiteKeyWidth * geometry.whiteKeyAspect,
  );
  const blackKeyWidth = drawnWhiteKeyWidth * geometry.blackKeyWidthRatio;
  const blackKeyHeight = whiteKeyHeight * geometry.blackKeyHeightRatio;
  const height = 2 * geometry.padding + whiteKeyHeight;
  const keyCenter = (semitone: number): number => {
    const key = keyAtSemitone(semitone);
    return (
      geometry.padding +
      (key.index - fullFirstIndex + (key.black ? 1 : 0.5)) *
        drawnWhiteKeyWidth
    );
  };
  const firstSemitone = centerRightSemitone - radius;
  const lastSemitone = centerRightSemitone + radius;
  const naturalLeft =
    (keyCenter(firstSemitone - 1) + keyCenter(firstSemitone)) / 2;
  const naturalRight =
    (keyCenter(lastSemitone) + keyCenter(lastSemitone + 1)) / 2;
  const centerX =
    (keyCenter(centerLeftSemitone) + keyCenter(centerRightSemitone)) / 2;
  // Piano key centres are not evenly spaced because black keys overlay white
  // keys. Use the longer side for both halves so the E4/F4 boundary stays at
  // the exact visual centre; the shorter edge retains a neighbouring sliver.
  const halfWidth = Math.max(
    centerX - naturalLeft,
    naturalRight - centerX,
  );
  const range: Range = {
    firstSemitone,
    lastSemitone,
    x: centerX - halfWidth,
    width: 2 * halfWidth,
  };
  const visibleMarks = marks.filter(({ key }) => {
    const semitone = pitchSemitoneAtIndex(key.index) + (key.black ? 1 : 0);
    return semitone >= range.firstSemitone && semitone <= range.lastSemitone;
  });
  const toneByKey = new Map(
    visibleMarks.map((mark) => [keyId(mark.key), mark.tone]),
  );
  // Every root is drawn in the octave from middle C up, whichever note it is,
  // so that octave is shaded: a reader who has turned the marks off is
  // otherwise looking at a bare keyboard with nothing to say which C is the C
  // the card means, and reads the answer an octave from where they expected.
  const inRootOctave = (key: Key): boolean => {
    const semitone = pitchSemitoneAtIndex(key.index) + (key.black ? 1 : 0);
    return (
      semitone >= rootOctaveFirstSemitone &&
      semitone <= rootOctaveLastSemitone
    );
  };
  const modifier = (key: Key): string => {
    const tone = toneByKey.get(keyId(key));
    if (tone === undefined) return inRootOctave(key) ? " is-root-octave" : "";
    return tone === "given" ? " is-given" : " is-highlighted";
  };
  const keyX = (index: number): number =>
    geometry.padding + index * drawnWhiteKeyWidth;

  const whiteKeys = Array.from({ length: fullWhiteKeyCount }, (_, index) => {
    const key = { index: fullFirstIndex + index, black: false };
    return [
      `<rect class="keyboard__white-key${modifier(key)}"`,
      ` data-note="${formatPitch(key.index)}" x="${round(keyX(index))}"`,
      ` y="${geometry.padding}" width="${round(drawnWhiteKeyWidth)}"`,
      ` height="${round(whiteKeyHeight)}" rx="${geometry.cornerRadius}"/>`,
    ].join("");
  }).join("");
  const blackKeys = Array.from(
    { length: fullWhiteKeyCount - 1 },
    (_, index) => index,
  )
    .filter((index) =>
      blackKeyAfter.has(pitchAtIndex(fullFirstIndex + index).note),
    )
    .map((index) => {
      const below = pitchAtIndex(fullFirstIndex + index);
      const key = { index: fullFirstIndex + index, black: true };
      return [
        `<rect class="keyboard__black-key${modifier(key)}"`,
        ` data-key="${below.note}#${below.octave}"`,
        ` x="${round(keyX(index + 1) - blackKeyWidth / 2)}"`,
        ` y="${geometry.padding}" width="${round(blackKeyWidth)}"`,
        ` height="${round(blackKeyHeight)}" rx="${geometry.cornerRadius}"/>`,
      ].join("");
    })
    .join("");

  const description =
    visibleMarks.length === 0
      ? "with no keys marked"
      : answerName === null
        ? "with the given note marked"
        : markRoot
          ? "with the given note and visible answer keys marked"
          : "with the visible answer keys marked";
  const svg = [
    `<svg class="keyboard-svg" xmlns="http://www.w3.org/2000/svg"`,
    ` width="${round(range.width)}" height="${round(height)}"`,
    ` viewBox="${round(range.x)} 0 ${round(range.width)} ${round(height)}"`,
    ` data-key-count="${physicalKeyCount}" data-center-between="E4/F4"`,
    ` data-first-key="${formatSemitone(range.firstSemitone)}"`,
    ` data-last-key="${formatSemitone(range.lastSemitone)}"`,
    ' role="img" aria-labelledby="title description">',
    `<title id="title">${physicalKeyCount}-key piano keyboard</title>`,
    `<desc id="description">A ${physicalKeyCount}-key piano keyboard ${description}.</desc>`,
    "<style>",
    `.keyboard__white-key{fill:#e5e7eb;stroke:#4b5563;stroke-width:${geometry.outlineWidth}}`,
    `.keyboard__black-key{fill:#111827;stroke:#4b5563;stroke-width:${geometry.outlineWidth}}`,
    ".keyboard__white-key.is-highlighted,.keyboard__black-key.is-highlighted{fill:#fcd34d}",
    ".keyboard__white-key.is-given,.keyboard__black-key.is-given{fill:#8ab4f8}",
    // The same blue as a marked key, faint enough to read as ground rather
    // than as an answer.
    ".keyboard__white-key.is-root-octave{fill:#cbd9ef}",
    ".keyboard__black-key.is-root-octave{fill:#293751}",
    "</style>",
    `<rect x="0" y="0" width="${round(fullWidth)}" height="${round(height)}" fill="#111827"/>`,
    `<g class="keyboard__keys">${whiteKeys}${blackKeys}</g>`,
    "</svg>",
  ].join("");

  const labels = visibleMarks.map(({ key, text }) => {
    const size = Math.min(
      geometry.labelFontSize,
      (drawnWhiteKeyWidth * 1.5) / Math.max(1, [...text].length),
    );
    const halfWidth = (size * 0.6 * [...text].length) / 2;
    const center =
      geometry.padding +
      (key.index - fullFirstIndex + (key.black ? 1 : 0.5)) *
        drawnWhiteKeyWidth;
    const depth = key.black ? geometry.blackKeyHeightRatio * 0.78 : 0.86;
    return {
      text: escapeXml(text),
      x:
        (clamp(
          center,
          range.x + geometry.padding + halfWidth,
          range.x + range.width - geometry.padding - halfWidth,
        ) - range.x) /
        range.width,
      y: (geometry.padding + whiteKeyHeight * depth) / height,
      size: size / range.width,
    };
  });
  const ids = visibleMarks
    .map(({ key, tone }) => `${key.index}${key.black ? "s" : "n"}-${tone}`)
    .join("-");
  return {
    id: `E4-F4-${physicalKeyCount}k-${ids}`,
    svg,
    labels,
  };
}

function roundCardValue(value: number): number {
  return Math.round(value * 100) / 100;
}

const DRAW_INTERVAL_KEYBOARD_SOURCE = drawIntervalKeyboard.toString();

// The selected count lives on <html>, and so does what the front marks: the
// root unless the reader turned it off, and the answer note only when they
// asked to see it. The answer is absent from the front template altogether, so
// a card the reader has not asked cannot reveal it however it is read.
export const WEB_INTERVAL_KEYBOARD_SCRIPT = `
<script>
(() => {
  // tsx preserves nested function names through this tiny helper when the
  // drawing function is converted to source code.
  const __name = (target) => target;
  const drawIntervalKeyboard = ${DRAW_INTERVAL_KEYBOARD_SOURCE};
  const roundCardValue = ${roundCardValue.toString()};
  const host = document.querySelector("[data-interval-keyboard]");
  if (!(host instanceof HTMLElement)) return;
  const selected = Number(document.documentElement.dataset.keyboardKeys);
  const allowed = [25, 27, 29, 31, 33, 35, 37];
  const keyCount = allowed.includes(selected) ? selected : 37;
  // Only the back names the answer in its own markup; the front is handed one
  // by the app when the reader asked for it.
  const back = host.dataset.answer !== undefined;
  const settings = document.documentElement.dataset;
  const drawing = drawIntervalKeyboard(
    host.dataset.root ?? "",
    back ? host.dataset.answer ?? null : settings.intervalAnswerNote ?? null,
    keyCount,
    back || settings.intervalRoot !== "off",
    back,
  );
  const names = drawing.labels.map(({ text, x, y, size }) =>
    '<span class="key-name" style="--key-x:' +
      roundCardValue(x * 100) +
      '%;--key-y:' + roundCardValue(y * 100) +
      '%;--key-size:' + roundCardValue(size * 100) +
      'cqw">' + text + '</span>',
  ).join("");
  host.innerHTML =
    '<span class="keyboard-frame keyboard-interval">' +
    drawing.svg + names + '</span>';
})();
</script>
`.trim();
