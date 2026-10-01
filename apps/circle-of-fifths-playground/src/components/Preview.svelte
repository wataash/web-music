<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  let {
    svg,
    error,
    editing = false,
    shown,
    ontoggle,
    ontap,
  }: {
    svg: string;
    error: string | null;
    // While editing, every spelling is drawn and those not shown are faint.
    // A tap on a spelling toggles it; anywhere else passes the point, in
    // diagram units, on.
    editing?: boolean;
    shown?: ReadonlySet<string>;
    ontoggle?: (note: string) => void;
    ontap?: (x: number, y: number) => void;
  } = $props();

  let frame = $state<HTMLDivElement>();

  $effect(() => {
    void svg;
    for (const note of frame?.querySelectorAll<SVGGElement>(".circle-of-fifths__note") ?? []) {
      note.classList.toggle("off", editing && shown !== undefined && !shown.has(note.dataset.note ?? ""));
    }
  });

  function tap(event: MouseEvent): void {
    if (!editing || frame === undefined) return;
    // A glyph is a small target, so its box counts with a little to spare.
    const pad = frame.getBoundingClientRect().width * 0.008;
    for (const note of frame.querySelectorAll<SVGGElement>(".circle-of-fifths__note")) {
      const box = note.getBoundingClientRect();
      if (event.clientX >= box.left - pad && event.clientX <= box.right + pad &&
        event.clientY >= box.top - pad && event.clientY <= box.bottom + pad) {
        ontoggle?.(note.dataset.note ?? "");
        return;
      }
    }
    const matrix = frame.querySelector<SVGSVGElement>(":scope > svg")?.getScreenCTM()?.inverse();
    if (matrix === undefined) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    ontap?.(point.x, point.y);
  }
</script>

<div class="preview" class:has-error={error !== null}>
  {#if error}
    <div class="error" role="alert">
      <strong>Cannot render this combination</strong>
      <span>{error}</span>
    </div>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="svg-frame" class:editing bind:this={frame} onclick={tap}>{@html svg}</div>
  {/if}
</div>
