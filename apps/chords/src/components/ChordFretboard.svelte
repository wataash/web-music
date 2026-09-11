<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey } = chordViewPersistence();
  import {
    clampFretCount,
    DEFAULT_BASS_STRINGS,
    fretboardMarkers,
    CHORD_BOARD_NUT_X as NUT_X,
    CHORD_BOARD_FRET_WIDTH as FRET_WIDTH,
    CHORD_BOARD_HEIGHT as CANVAS_HEIGHT,
  } from "../lib/chord-fretboard";
  import { SCREEN_WIDTH, type CardScale } from "@web-music/practice-ui/card-scale";
  import { omittedChordIntervals, type ChordDescription } from "../lib/chords";

  let {
    chord,
    fretCount,
    bassStrings = DEFAULT_BASS_STRINGS,
    revealed,
    scale = 1,
    interactive = true,
    onplay,
  }: {
    chord: ChordDescription;
    fretCount: number;
    bassStrings?: readonly number[];
    revealed: boolean;
    scale?: CardScale;
    interactive?: boolean;
    onplay?: (string: number, fret: number) => void;
  } = $props();

  const STRING_TOP = 46;
  const omitted = $derived(omittedChordIntervals(chord));
  const STRING_GAP = 38;
  const visibleFretCount = $derived(clampFretCount(fretCount));
  const boardRight = $derived(NUT_X + visibleFretCount * FRET_WIDTH);
  const boardWidth = $derived(
    scale === SCREEN_WIDTH
      ? "100%"
      : `${Number((boardRight * scale).toFixed(2))}px`,
  );
  const boardHeight = $derived(
    scale === SCREEN_WIDTH
      ? "auto"
      : `${Number((CANVAS_HEIGHT * scale).toFixed(2))}px`,
  );
  const inlays = $derived(
    [3, 5, 7, 9, 12, 15, 17, 19, 21, 24].filter(
      (fret) => fret <= visibleFretCount,
    ),
  );
  const markers = $derived(
    revealed ? fretboardMarkers(chord, visibleFretCount, bassStrings) : [],
  );
  const markerDescription = $derived(
    chord.tones.map(({ interval, note }) => `${interval} ${note}`).join(", "),
  );

  function fretCenter(fret: number): number {
    return fret === 0
      ? NUT_X / 2
      : NUT_X + (fret - 0.5) * FRET_WIDTH;
  }

  function stringY(string: number): number {
    return STRING_TOP + (string - 1) * STRING_GAP;
  }

  let lastCell: Element | null = null;
  let suppressMouseClick = false;

  function playAtPointer(event: PointerEvent): void {
    const board = event.currentTarget as SVGSVGElement;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-fret-cell]") ?? null;
    if (!cell || !board.contains(cell)) { lastCell = null; return; }
    if (cell === lastCell) return;
    lastCell = cell;
    onplay?.(Number(cell.getAttribute("data-string")), Number(cell.getAttribute("data-fret")));
  }

  function startDrag(event: PointerEvent): void {
    suppressMouseClick = false;
    if (!interactive || !onplay || event.pointerType !== "mouse" || event.button !== 0) return;
    suppressMouseClick = true;
    lastCell = null;
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
    event.preventDefault();
    playAtPointer(event);
  }

  function drag(event: PointerEvent): void {
    if (!interactive || !(event.buttons & 1) || !(event.currentTarget as SVGSVGElement).hasPointerCapture(event.pointerId)) return;
    playAtPointer(event);
  }
</script>

<div
  class="board-scroll"
  use:remember={viewKey(`board:${chord.symbol}`)}
  role="region"
  aria-label="Guitar fretboard"
>
  <svg
    class="fretboard"
    width={boardRight}
    height={CANVAS_HEIGHT}
    style:width={boardWidth}
    style:height={boardHeight}
    viewBox={`0 0 ${boardRight} ${CANVAS_HEIGHT}`}
    role="img"
    onpointerdown={startDrag}
    onpointermove={drag}
    onlostpointercapture={() => lastCell = null}
    aria-label={revealed
      ? `${chord.symbol} chord tones: ${markerDescription || "No chord tones"}`
      : `Empty guitar fretboard for ${chord.symbol}`}
  >
    <rect class="background" width={boardRight} height={CANVAS_HEIGHT} />

    {#each inlays as fret}
      <rect
        class="inlay"
        data-fret={fret}
        x={fretCenter(fret) - 15}
        y={STRING_TOP + 8}
        width="30"
        height={STRING_GAP * 5 - 16}
        rx="3"
      />
    {/each}

    <line
      class="nut"
      x1={NUT_X}
      y1={STRING_TOP - 8}
      x2={NUT_X}
      y2={STRING_TOP + STRING_GAP * 5 + 8}
    />
    {#each Array.from({ length: visibleFretCount }, (_, index) => index + 1) as fret}
      <line
        class="fret"
        data-fret={fret}
        x1={NUT_X + fret * FRET_WIDTH}
        y1={STRING_TOP}
        x2={NUT_X + fret * FRET_WIDTH}
        y2={STRING_TOP + STRING_GAP * 5}
      />
    {/each}
    {#each Array.from({ length: 6 }, (_, index) => index + 1) as string}
      <line
        class="string"
        data-string={string}
        x1="10"
        y1={stringY(string)}
        x2={boardRight}
        y2={stringY(string)}
        stroke-width={0.8 + string * 0.28}
      />
    {/each}

    {#each Array.from({ length: visibleFretCount + 1 }, (_, fret) => fret) as fret}
      <text class="fret-number top" x={fretCenter(fret)} y="20">{fret}</text>
      <text class="fret-number bottom" x={fretCenter(fret)} y="270">
        {fret}
      </text>
    {/each}

    {#each markers as marker (`${marker.string}-${marker.fret}`)}
      <g
        class:root={marker.role === "root"}
        class:tone={marker.role === "tone"}
        class:bass={marker.role === "bass"}
        class:omitted={omitted.has(marker.label)}
        data-marker
        data-interval={marker.label}
        data-string={marker.string}
        data-fret={marker.fret}
      >
        <circle
          cx={fretCenter(marker.fret)}
          cy={stringY(marker.string)}
          r="15"
        />
        <text x={fretCenter(marker.fret)} y={stringY(marker.string)}>
          {marker.label}
        </text>
      </g>
    {/each}
    {#if interactive && onplay}
      {#each [1, 2, 3, 4, 5, 6] as string}
        {#each Array.from({ length: visibleFretCount + 1 }, (_, fret) => fret) as fret}
          <rect
            class="fret-cell"
            data-fret-cell
            data-string={string}
            data-fret={fret}
            x={fret === 0 ? 0 : NUT_X + (fret - 1) * FRET_WIDTH}
            y={stringY(string) - STRING_GAP / 2}
            width={fret === 0 ? NUT_X : FRET_WIDTH}
            height={STRING_GAP}
            role="button"
            tabindex="0"
            aria-label={`Play string ${string}, fret ${fret}`}
            onclick={(event) => {
              if (!suppressMouseClick || event.detail === 0) onplay?.(string, fret);
              suppressMouseClick = false;
            }}
            onkeydown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onplay?.(string, fret);
            }}
          />
        {/each}
      {/each}
    {/if}
  </svg>
</div>

<style>
  .fret-cell { fill: transparent; cursor: pointer; }
  .fret-cell:focus-visible { outline: none; stroke: #fff; stroke-width: 2; fill: #ffffff30; }
  .board-scroll {
    overflow-x: auto;
    border: 1px solid #374151;
    border-radius: 8px;
    background: #111827;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.22);
    scrollbar-color: #6b7280 #111827;
  }

  .fretboard {
    display: block;
    max-width: none;
  }

  .background {
    fill: #111827;
  }

  .inlay {
    fill: #465363;
  }

  .nut {
    stroke: #e5e7eb;
    stroke-width: 8;
  }

  .fret {
    stroke: #6b7280;
    stroke-width: 2;
  }

  .string {
    stroke: #d1d5db;
  }

  .fret-number {
    fill: #9ca3af;
    font-size: 12px;
    font-weight: 600;
    text-anchor: middle;
  }

  [data-marker] circle {
    stroke-width: 1.5;
  }

  [data-marker] text {
    fill: #111827;
    font-size: 10px;
    font-weight: 800;
    text-anchor: middle;
    dominant-baseline: central;
  }

  .omitted { opacity: 0.35; }

  .root circle {
    fill: #64b5f6;
    stroke: #0d47a1;
  }

  .tone circle {
    fill: #fde68a;
    stroke: #a16207;
  }

  .bass circle {
    fill: #fca5a5;
    stroke: #991b1b;
  }
</style>
