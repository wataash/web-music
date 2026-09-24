<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  // Draw device-independent marks while preserving their Unicode text.
  let { text }: { text: string } = $props();
  const drawn = new Set(["♭", "♯", "△"]);
</script>

{#each [...text] as glyph}{#if drawn.has(glyph)}{#if glyph === "♭"}<svg class="glyph flat" viewBox="0 0 10 16" preserveAspectRatio="none" aria-hidden="true"><path class="stem" d="M3.3 1L2.2 15" /><path class="bowl" d="M2.8 8.3C9.2 3.4 11.2 8.7 2.2 15C8.2 8.9 8 6.2 2.9 9.6Z" /></svg>{:else if glyph === "♯"}<svg class="glyph sharp" viewBox="0 0 10 16" preserveAspectRatio="none" aria-hidden="true"><path d="M3.4 2.2V14.8" /><path d="M6.8 1.2V13.8" /><path d="M1 7.4L9.2 6" /><path d="M1 11.6L9.2 10.2" /></svg>{:else}<svg class="glyph triangle" viewBox="0 0 10 14" preserveAspectRatio="none" aria-hidden="true"><path d="M5 1.2L9 12.8H1Z" /></svg>{/if}<span class="reading">{glyph}</span>{:else}{glyph}{/if}{/each}

<style>
  .glyph { display: inline-block; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; overflow: visible; }
  .flat { width: 0.44em; height: 0.96em; stroke-width: 1.3; vertical-align: -0.06em; }
  /* A written flat: a thin upright, and a bowl that carries the weight of the
     stroke at its top right and runs out to nothing at the foot. */
  .flat .stem { stroke-width: 0.75; }
  .flat .bowl { fill: currentColor; stroke: none; }
  .sharp { width: 0.52em; height: 0.96em; stroke-width: 1.3; vertical-align: -0.06em; }
  /* Tall and narrow, and close enough to the figure to read as one symbol. */
  .triangle { width: 0.5em; height: 0.78em; stroke-width: 1.5; vertical-align: -0.02em; margin-right: 0.02em; }
  .reading { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
