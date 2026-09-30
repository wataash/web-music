<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { NOTE_NAMES, positionToNoteCards } from "guitar-fretboard-anki/cards";
  import { renderFretboardSvg } from "guitar-fretboard-anki/fretboard";

  import ReferenceSection from "./ReferenceSection.svelte";
  import type { Tuning } from "../lib/guitar-tuning";

  // Every position on the instrument being set, named on the same neck the
  // cards draw. With a selection, the notes Note → Positions does not ask for
  // are drawn faint.
  let { tuning, selection }: {
    tuning: Tuning;
    selection?: readonly string[];
  } = $props();

  const board = $derived.by(() => {
    const positions = positionToNoteCards(tuning);
    const svg = renderFretboardSvg({
      targets: positions.map(({ string, fret, note }) => ({ string, fret, label: note })),
      stringCount: tuning.length,
      title: "Fretboard reference",
      description: "Every position on the fretboard with its note name.",
    });
    if (selection === undefined) return svg;
    // A pitch is asked under its sharp name, its flat name or both at once.
    const off = new Set(positions
      .filter(({ pitchClass, note }) =>
        ![NOTE_NAMES.sharps[pitchClass], NOTE_NAMES.flats[pitchClass], note]
          .some((name) => selection.includes(name)))
      .map(({ string, fret }) => `${string}:${fret}`));
    // A position's dot and the name written on it, faded together.
    return svg.replace(
      /<circle class="fretboard__target" data-string="(\d+)" data-fret="(\d+)"[^>]*\/>(?:<text[^>]*>.*?<\/text>)?/g,
      (dot, string: string, fret: string) => off.has(`${string}:${fret}`) ? `<g class="off">${dot}</g>` : dot,
    );
  });
</script>

<ReferenceSection title="Fretboard reference">
  <div class="board-scroll">
    {@html board}
  </div>
</ReferenceSection>

<style>
  .board-scroll {
    overflow-x: auto;
    border-top: 1px solid var(--divider);
    background: #111827;
  }

  .board-scroll :global(svg) {
    display: block;
    width: auto;
    height: 220px;
  }

  .board-scroll :global(.off) {
    opacity: 0.3;
  }
</style>
