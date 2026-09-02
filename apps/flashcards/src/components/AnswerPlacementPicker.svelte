<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  // Where the answer buttons go, pointed at rather than stepped through:
  // eleven places is a long way round a stepper, and every one of them is
  // somewhere on this screen. So the screen is the control — each dotted cell
  // stands where the buttons it names would stand, an end of an edge or the
  // whole of one.
  //
  // A tap moves the buttons and leaves the picker up, because one place is
  // rarely settled on without seeing another: the chosen cell is left empty
  // and unpainted, so what shows through it is the buttons themselves, in
  // their new place, on the card being studied.

  import {
    ANSWER_ANCHOR_LABELS,
    answerAnchorParts,
    type AnswerAnchor,
  } from "../lib/card-scale";

  let {
    current,
    onpick,
    onclose,
  }: {
    current: AnswerAnchor;
    onpick: (anchor: AnswerAnchor) => void;
    onclose: () => void;
  } = $props();

  const TOP: readonly AnswerAnchor[] = ["top-left", "top-right"];
  const LEFT: readonly AnswerAnchor[] = ["left-top", "left", "left-bottom"];
  const RIGHT: readonly AnswerAnchor[] = ["right-top", "right", "right-bottom"];
  const BOTTOM: readonly AnswerAnchor[] = [
    "bottom-left",
    "bottom",
    "bottom-right",
  ];

  // What the buttons are standing on right now, and so what the picker must
  // leave unpainted for them to be seen. A whole edge is under all three of
  // that edge's cells, not just the one that names it.
  const place = $derived(answerAnchorParts(current));

  function showsThrough(anchor: AnswerAnchor): boolean {
    if (anchor === current) return true;
    return (
      place.end === undefined && answerAnchorParts(anchor).edge === place.edge
    );
  }

  function handleKey(event: KeyboardEvent): void {
    if (event.key === "Escape") onclose();
  }
</script>

<svelte:window onkeydown={handleKey} />

<!-- The card keeps the screen; this only lies over it, dimmed enough to say
     so and no more. Taps stop here either way: the card is not to be answered
     while it is being laid out. -->
<div class="screen" role="radiogroup" aria-label="Answer buttons">
  <header class="bar">
    <p><strong>{ANSWER_ANCHOR_LABELS[current]}</strong> — tap to move</p>
    <button class="close" title="Done" aria-label="Done" onclick={onclose}
      ><span aria-hidden="true">✓</span></button
    >
  </header>

  <div class="lane across">
    {#each TOP as anchor (anchor)}
      <button
        class="cell"
        class:here={current === anchor}
        class:clear={showsThrough(anchor)}
        role="radio"
        aria-checked={current === anchor}
        aria-label={ANSWER_ANCHOR_LABELS[anchor]}
        onclick={() => onpick(anchor)}
        >{showsThrough(anchor) ? "" : ANSWER_ANCHOR_LABELS[anchor]}</button
      >
    {/each}
  </div>

  <div class="middle">
    <div class="lane down">
      {#each LEFT as anchor (anchor)}
        <button
          class="cell"
          class:here={current === anchor}
          class:clear={showsThrough(anchor)}
          role="radio"
          aria-checked={current === anchor}
          aria-label={ANSWER_ANCHOR_LABELS[anchor]}
          onclick={() => onpick(anchor)}
          >{showsThrough(anchor) ? "" : ANSWER_ANCHOR_LABELS[anchor]}</button
        >
      {/each}
    </div>
    <!-- The middle is the card's, and says so by being the one part of the
         frame that takes no tap. -->
    <p class="card-here">card</p>
    <div class="lane down">
      {#each RIGHT as anchor (anchor)}
        <button
          class="cell"
          class:here={current === anchor}
          class:clear={showsThrough(anchor)}
          role="radio"
          aria-checked={current === anchor}
          aria-label={ANSWER_ANCHOR_LABELS[anchor]}
          onclick={() => onpick(anchor)}
          >{showsThrough(anchor) ? "" : ANSWER_ANCHOR_LABELS[anchor]}</button
        >
      {/each}
    </div>
  </div>

  <div class="lane across">
    {#each BOTTOM as anchor (anchor)}
      <button
        class="cell"
        class:here={current === anchor}
        class:clear={showsThrough(anchor)}
        role="radio"
        aria-checked={current === anchor}
        aria-label={ANSWER_ANCHOR_LABELS[anchor]}
        onclick={() => onpick(anchor)}
        >{showsThrough(anchor) ? "" : ANSWER_ANCHOR_LABELS[anchor]}</button
      >
    {/each}
  </div>
</div>

<style>
  .screen {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background: rgb(0 0 0 / 0.2);
    color: #fff;
  }

  .bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 20px;
    padding: 0 4px 0 12px;
    background: rgb(0 0 0 / 0.55);
  }

  .bar p {
    flex: 1;
    margin: 0;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgb(255 255 255 / 0.15);
    color: #fff;
    font-size: 17px;
  }

  .lane {
    display: flex;
    gap: 8px;
  }

  /* Along the foot or the head of the screen: the cells share its width, as
     the buttons they stand for would. */
  .lane.across {
    flex: none;
    height: 64px;
  }

  .middle {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 8px;
  }

  /* Down a side, between the two across lanes, so no two cells overlap and
     each corner belongs to one of them. */
  .lane.down {
    flex: none;
    flex-direction: column;
    width: 76px;
  }

  .cell {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border: 1px dashed rgb(255 255 255 / 0.55);
    border-radius: 10px;
    background: rgb(0 0 0 / 0.35);
    color: #fff;
    font-size: 12px;
    line-height: 1.2;
    text-align: center;
  }

  /* The buttons are under here: nothing is painted over them, and nothing is
     written across them, so what shows is the answer to the question the
     picker asks. */
  .cell.clear {
    background: none;
  }

  /* And of those, the one that names where they are. */
  .cell.here {
    border-style: solid;
    border-color: var(--primary);
    border-width: 2px;
  }

  .cell:active {
    background: rgb(0 0 0 / 0.55);
  }

  .card-here {
    flex: 1;
    margin: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    color: rgb(255 255 255 / 0.4);
    font-size: 12px;
    letter-spacing: 0.08em;
  }
</style>
