<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { pointAtClockAngle } from "@circle-of-fifths/core";
  import {
    CLEF_GLYPHS,
    MAJOR_KEYS_BY_SIGNATURE,
    ROW_STAFF_GEOMETRY,
    clefBaselineY,
    keySignatureAccidentals,
    keySignatureGlyphCss,
  } from "@web-music/music-staff-core";
  import StaffScaleReference from "./StaffScaleReference.svelte";

  const CENTER = 200;
  const OUTER_RADIUS = 190;
  const INNER_RADIUS = 56;
  const SPLIT_RADIUS = 118;
  const TOP_LINE = 18;
  const LINE_GAP = 8;
  const STAFF_LINES = [0, 1, 2, 3, 4].map((index) => TOP_LINE + index * LINE_GAP);
  const TREBLE_BASELINE = clefBaselineY(
    { ...ROW_STAFF_GEOMETRY, topLineY: TOP_LINE, lineGap: LINE_GAP },
    "treble",
  );

  function sectorPath(hour: number, inner: number, outer: number): string {
    const angle = hour * 30;
    const innerStart = pointAtClockAngle(CENTER, inner, angle - 15);
    const outerStart = pointAtClockAngle(CENTER, outer, angle - 15);
    const outerEnd = pointAtClockAngle(CENTER, outer, angle + 15);
    const innerEnd = pointAtClockAngle(CENTER, inner, angle + 15);
    return `M ${innerStart.x} ${innerStart.y} L ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 0 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${inner} ${inner} 0 0 0 ${innerStart.x} ${innerStart.y} Z`;
  }

  const keys = MAJOR_KEYS_BY_SIGNATURE.map((key) => {
    const hour = (key.fifths + 12) % 12;
    const paired = hour >= 5 && hour <= 7;
    const inner = paired && key.fifths > 0 ? SPLIT_RADIUS : INNER_RADIUS;
    const outer = paired && key.fifths < 0 ? SPLIT_RADIUS : OUTER_RADIUS;
    // Lead into the inner flat keys and out toward the outer sharp keys.
    const spiralOffset = key.fifths === -4 ? -18 : key.fifths === 4 ? 18 : 0;
    const point = pointAtClockAngle(CENTER, (inner + outer) / 2 + spiralOffset, hour * 30);
    const compact = outer === SPLIT_RADIUS;
    return {
      ...key,
      path: sectorPath(hour, inner, outer),
      x: point.x,
      y: point.y,
      scale: compact ? 0.32 : 0.4,
      signature: keySignatureAccidentals("treble", key.fifths, 65, TOP_LINE, LINE_GAP, "reading"),
      glyphCss: keySignatureGlyphCss(LINE_GAP, "reading", key.fifths > 0 ? "sharp" : "flat"),
    };
  });

  let {
    selection,
    onchange,
  }: {
    selection: readonly number[];
    onchange: (selection: readonly number[]) => void;
  } = $props();

  function toggle(fifths: number): void {
    const next = new Set(selection);
    if (next.has(fifths)) next.delete(fifths);
    else next.add(fifths);
    onchange(MAJOR_KEYS_BY_SIGNATURE.map((key) => key.fifths).filter((value) => next.has(value)));
  }

  function handleKeydown(event: KeyboardEvent, fifths: number): void {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle(fifths);
  }
</script>

<section>
  <div class="summary">
    <span>Major keys</span>
  </div>
  <div class="actions">
    <button type="button" onclick={() => onchange(MAJOR_KEYS_BY_SIGNATURE.map(({ fifths }) => fifths))}>Select all</button>
    <button type="button" onclick={() => onchange([])}>Clear</button>
  </div>
  <svg class="wheel" viewBox="0 0 400 400" aria-label="Major keys in circle of fifths order">
    {#each keys as key (key.fifths)}
      {@const selected = selection.includes(key.fifths)}
      <g
        class="key-cell"
        class:selected
        role="button"
        tabindex="0"
        aria-label={`${key.tonic} major`}
        aria-pressed={selected}
        onclick={() => toggle(key.fifths)}
        onkeydown={(event) => handleKeydown(event, key.fifths)}
      >
        <path class="sector" d={key.path} />
        <text class="tonic" x={key.x} y={key.y - 13} text-anchor="middle">{key.tonic}</text>
        <g fill="currentColor" aria-hidden="true" transform={`translate(${key.x - 130 * key.scale / 2} ${key.y - 5}) scale(${key.scale})`}>
          {#each STAFF_LINES as y}
            <line x1="7" x2="123" y1={y} y2={y} stroke="currentColor" stroke-width="1" />
          {/each}
          <text x="24" y={TREBLE_BASELINE} class="clef">{CLEF_GLYPHS.treble}</text>
          {#each key.signature.accidentals as accidental}
            <text x={accidental.x} y={accidental.y} style={key.glyphCss}>{key.signature.symbol}</text>
          {/each}
        </g>
      </g>
    {/each}
    <g class="selected-outlines" aria-hidden="true">
      {#each keys.filter((key) => selection.includes(key.fifths)) as key (key.fifths)}
        <path d={key.path} />
      {/each}
    </g>
    <circle class="hub" cx={CENTER} cy={CENTER} r={INNER_RADIUS - 2} />
    <text class="count" x={CENTER} y={CENTER - 2} text-anchor="middle">{selection.length} / 15</text>
    <text class="count-label" x={CENTER} y={CENTER + 17} text-anchor="middle">selected</text>
  </svg>
  <StaffScaleReference />
</section>

<style>
  @font-face { font-family: "Noto Music"; src: url("/fonts/NotoMusic-Regular.ttf") format("truetype"); font-weight: 400; font-style: normal; font-display: block; }
  .summary, .actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .actions { justify-content: flex-start; margin: 12px 0; }
  button { border: 1px solid var(--divider); border-radius: 6px; background: transparent; color: inherit; padding: 6px 10px; cursor: pointer; }
  .wheel { display: block; width: min(100%, 440px); height: auto; margin: 0 auto; overflow: visible; }
  .key-cell { color: var(--on-surface); cursor: pointer; }
  .key-cell:focus { outline: none; }
  .sector { fill: transparent; stroke: var(--divider); stroke-width: 1.5; }
  .key-cell.selected .sector { fill: color-mix(in srgb, var(--count-new) 18%, transparent); stroke: var(--count-new); stroke-width: 2.5; }
  .key-cell:focus-visible .sector { stroke: var(--count-new); stroke-width: 4; }
  .selected-outlines { fill: none; stroke: var(--count-new); stroke-width: 2.5; pointer-events: none; }
  .tonic { fill: currentColor; font-size: 15px; font-weight: 700; }
  .clef { font-family: "Noto Music", "Noto Sans Symbols2", "DejaVu Sans", sans-serif; font-size: 32px; }
  .hub { fill: var(--surface); stroke: var(--divider); stroke-width: 1.5; }
  .count { fill: currentColor; font-size: 20px; font-weight: 700; }
  .count-label { fill: var(--on-surface-muted); font-size: 12px; }
</style>
