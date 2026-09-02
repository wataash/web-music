// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { describe, expect, test } from "vitest";

import { writeFretboardPreview } from "./preview";

describe("fretboard preview", () => {
  test("writes the selected card front and back as SVG files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fretboard-preview-test-"));

    try {
      const summary = await writeFretboardPreview({
        outputDirectory: directory,
        system: "sharps",
        string: 2,
        fret: 4,
      });
      const frontSvg = await readFile(summary.frontPath, "utf8");
      const backSvg = await readFile(summary.backPath, "utf8");

      expect(basename(summary.frontPath)).toBe(
        "sharps-string-2-fret-4-front.svg",
      );
      expect(basename(summary.backPath)).toBe(
        "sharps-string-2-fret-4-back.svg",
      );
      expect(frontSvg).toContain(">♯</text>");
      expect(backSvg).toContain(">D♯</text>");
      expect(summary.note).toBe("D♯");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("rejects positions outside the deck", async () => {
    await expect(
      writeFretboardPreview({ string: 7 }),
    ).rejects.toThrow("string 1-6");
  });

  test("writes a natural-note question without an accidental cue", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fretboard-preview-test-"));

    try {
      const summary = await writeFretboardPreview({
        outputDirectory: directory,
        system: "naturals",
        string: 3,
        fret: 0,
      });
      const frontSvg = await readFile(summary.frontPath, "utf8");
      const backSvg = await readFile(summary.backPath, "utf8");

      expect(frontSvg).toContain(
        'class="fretboard__target" data-string="3" data-fret="0"',
      );
      expect(frontSvg).not.toContain('class="fretboard__label"');
      expect(backSvg).toContain(">G</text>");
      expect(summary.note).toBe("G");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("writes a note-to-positions preview with ASCII accidental input", async () => {
    const directory = await mkdtemp(join(tmpdir(), "fretboard-preview-test-"));

    try {
      const summary = await writeFretboardPreview({
        outputDirectory: directory,
        kind: "note",
        system: "flats",
        string: 3,
        note: "Ab",
      });
      const frontSvg = await readFile(summary.frontPath, "utf8");
      const backSvg = await readFile(summary.backPath, "utf8");

      expect(basename(summary.frontPath)).toBe(
        "flats-string-3-note-A-flat-front.svg",
      );
      expect(frontSvg).toContain(
        'class="fretboard__string-highlight" data-string="3"',
      );
      expect(frontSvg).not.toContain('class="fretboard__target"');
      expect(backSvg.match(/class="fretboard__target"/g)).toHaveLength(2);
      expect(backSvg).toContain('data-string="3" data-fret="1"');
      expect(backSvg).toContain('data-string="3" data-fret="13"');
      expect(summary.note).toBe("A♭");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("rejects a note outside the selected spelling system", async () => {
    await expect(
      writeFretboardPreview({
        kind: "note",
        system: "flats",
        note: "A#",
      }),
    ).rejects.toThrow("selected system");
  });
});
