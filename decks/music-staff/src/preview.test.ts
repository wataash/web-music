// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { describe, expect, test } from "vitest";

import { writeStaffPreview } from "./preview";

describe("staff preview", () => {
  test("writes a staff-to-note card front and back as SVG files", async () => {
    const directory = await mkdtemp(join(tmpdir(), "staff-preview-test-"));

    try {
      const summary = await writeStaffPreview({
        outputDirectory: directory,
        clef: "treble",
        pitch: "C4",
      });
      const frontSvg = await readFile(summary.frontPath, "utf8");
      const backSvg = await readFile(summary.backPath, "utf8");

      expect(basename(summary.frontPath)).toBe(
        "staff-to-note-treble-c4-front.svg",
      );
      expect(basename(summary.backPath)).toBe(
        "staff-to-note-treble-c4-back.svg",
      );
      expect(summary.pitch).toBe("C4");
      expect(frontSvg).toContain('data-clef="treble"');
      expect(frontSvg).toContain('<g class="staff__note"');
      expect(frontSvg).not.toContain('class="staff__answer"');
      expect(backSvg).toContain('<text class="staff__answer"');
      expect(backSvg).toContain(">C</text>");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("asks a note-to-staff card against an empty staff", async () => {
    const directory = await mkdtemp(join(tmpdir(), "staff-preview-test-"));

    try {
      const summary = await writeStaffPreview({
        outputDirectory: directory,
        direction: "note-to-staff",
        clef: "bass",
        pitch: "C4",
      });
      const frontSvg = await readFile(summary.frontPath, "utf8");
      const backSvg = await readFile(summary.backPath, "utf8");

      expect(basename(summary.frontPath)).toBe(
        "note-to-staff-bass-c4-front.svg",
      );
      expect(frontSvg).toContain('data-clef="bass"');
      expect(frontSvg).not.toContain('<g class="staff__note"');
      // The pitch is the question here, so the front names it.
      expect(frontSvg).toContain(">C4</text>");
      expect(backSvg).toContain('<g class="staff__note" data-step="10"');
      expect(backSvg).toContain(">C4</text>");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("moves middle C between the alto and tenor staves", async () => {
    const directory = await mkdtemp(join(tmpdir(), "staff-preview-test-"));

    try {
      const alto = await writeStaffPreview({
        outputDirectory: directory,
        clef: "alto",
        pitch: "C4",
      });
      const tenor = await writeStaffPreview({
        outputDirectory: directory,
        clef: "tenor",
        pitch: "C4",
      });

      expect(await readFile(alto.frontPath, "utf8")).toContain(
        '<g class="staff__note" data-step="4"',
      );
      expect(await readFile(tenor.frontPath, "utf8")).toContain(
        '<g class="staff__note" data-step="6"',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("rejects unknown directions and clefs", async () => {
    await expect(
      writeStaffPreview({ direction: "note-to-note" as never }),
    ).rejects.toThrow(
      "preview direction must be one of staff-to-note, note-to-staff",
    );
    await expect(
      writeStaffPreview({ clef: "soprano" as never }),
    ).rejects.toThrow("preview clef must be one of treble, bass, alto, tenor");
  });

  test("rejects pitches the selected clef does not cover", async () => {
    await expect(
      writeStaffPreview({ clef: "treble", pitch: "F2" }),
    ).rejects.toThrow(
      "preview pitch must be a natural note from G2 to D7 on the treble clef: F2",
    );
    await expect(
      writeStaffPreview({
        direction: "note-to-staff",
        clef: "bass",
        pitch: "C#3",
      }),
    ).rejects.toThrow("preview pitch must be a natural note from B0 to F5");
  });
});
