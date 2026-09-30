<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { renderCircleOfFifthsSvg } from "@circle-of-fifths/svg";

  import ReferenceSection from "./ReferenceSection.svelte";

  // Every spelling of every cell, both rings: what Cell → All Notes asks for.
  const circle = renderCircleOfFifthsSvg({
    title: "Circle of fifths reference",
    description: "Every spelling of each cell of the circle of fifths.",
  }).replace(/^<\?xml[^>]*>\s*/, "");
</script>

<ReferenceSection title="Circle reference">
  <div class="circle">
    {@html circle}
  </div>
</ReferenceSection>

<style>
  .circle {
    padding: 8px 12px 14px;
    border-top: 1px solid var(--divider);
  }

  .circle :global(svg) {
    display: block;
    width: 100%;
    max-width: 420px;
    height: auto;
    margin: 0 auto;
  }

  /* The diagram is drawn black on white for the cards; here it takes the
     dialog's own colours. */
  .circle :global(svg > rect) {
    fill: transparent;
  }

  .circle :global(.circle-of-fifths__line) {
    stroke: var(--on-surface-muted);
  }

  /* The spellings a reader meets first, shaded as on the cards. */
  .circle :global(.circle-of-fifths__basic-highlight) {
    fill: color-mix(in srgb, var(--on-surface) 14%, transparent);
  }

  .circle :global(.circle-of-fifths__label) {
    fill: var(--on-surface);
    color: var(--on-surface);
  }
</style>
