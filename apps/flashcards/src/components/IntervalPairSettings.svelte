<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { untrack } from "svelte";

  import {
    ALL_INTERVAL_PAIRS,
    INTERVAL_DEGREE_ROWS,
    INTERVAL_PAIR_CELLS,
    INTERVAL_PAIR_THRESHOLDS,
    INTERVAL_HEAT_BUCKETS,
    INTERVAL_ROOT_ROWS,
    heatLevel,
    pairsAtLeast,
    thresholdForPairs,
  } from "../lib/interval-pair-selection";

  let {
    deckLabel,
    selection,
    onchange,
  }: {
    deckLabel: string;
    selection: readonly string[];
    onchange: (selection: readonly string[]) => void;
  } = $props();

  const draft = $derived<ReadonlySet<string>>(new Set(selection));
  // The slider indexes the counts that pairs actually have, so every step
  // moves the selection instead of scrolling through unused numbers.
  let thresholdIndex = $state(
    untrack(() => {
      const threshold = thresholdForPairs(new Set(selection));
      const index =
        threshold === null
          ? -1
          : INTERVAL_PAIR_THRESHOLDS.indexOf(threshold);
      return index < 0 ? 0 : index;
    }),
  );
  const threshold = $derived(INTERVAL_PAIR_THRESHOLDS[thresholdIndex]);

  function applyThreshold(index: number): void {
    thresholdIndex = index;
    onchange(pairsAtLeast(INTERVAL_PAIR_THRESHOLDS[index]));
  }

  function toggle(keys: readonly string[]): void {
    const next = new Set(draft);
    // A header turns its whole line on unless it is already fully on.
    const turnOff = keys.every((key) => next.has(key));
    for (const key of keys) {
      if (turnOff) next.delete(key);
      else next.add(key);
    }
    onchange([...next]);
  }

  function columnKeys(degree: string): readonly string[] {
    return INTERVAL_PAIR_CELLS.flat()
      .filter((cell) => cell.available && cell.degree === degree)
      .map(({ key }) => key);
  }

  function rowKeys(rowIndex: number): readonly string[] {
    return INTERVAL_PAIR_CELLS[rowIndex]
      .filter(({ available }) => available)
      .map(({ key }) => key);
  }

  function formatCount(count: number): string {
    return `(${count.toLocaleString("en-US")})`;
  }
</script>

<section class="threshold">
  <label for="interval-pair-threshold">
    Turn on pairs named at least
    <strong>{threshold.toLocaleString("en-US")}</strong> times in Jazz 1460
  </label>
  <input
    id="interval-pair-threshold"
    type="range"
    min="0"
    max={INTERVAL_PAIR_THRESHOLDS.length - 1}
    step="1"
    value={thresholdIndex}
    oninput={(event) => applyThreshold(Number(event.currentTarget.value))}
  />
</section>

<ol class="legend" aria-label="Cell shade by how often a pair is named">
  {#each INTERVAL_HEAT_BUCKETS as bucket}
    <li>
      <span class="swatch heat-{bucket.level}"></span>{bucket.label}
    </li>
  {/each}
</ol>

<section class="grid-section">
  <div class="table-summary">
    <span>{deckLabel}</span>
    <span>{draft.size} / {ALL_INTERVAL_PAIRS.length} selected</span>
  </div>
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th class="corner" scope="col">Note</th>
          {#each INTERVAL_DEGREE_ROWS as degree}
            <th scope="col">
              <button onclick={() => toggle(columnKeys(degree.id))}>
                {degree.label}
              </button>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each INTERVAL_PAIR_CELLS as row, rowIndex}
          <tr>
            <th class="root" scope="row">
              <button onclick={() => toggle(rowKeys(rowIndex))}>
                {INTERVAL_ROOT_ROWS[rowIndex].label}
              </button>
            </th>
            {#each row as cell}
              <td>
                {#if cell.available}
                  <button
                    class="cell heat-{heatLevel(cell.count)}"
                    class:on={draft.has(cell.key)}
                    aria-pressed={draft.has(cell.key)}
                    onclick={() => toggle([cell.key])}
                  >
                    {formatCount(cell.count)}
                  </button>
                {:else}
                  <span class="gap" title="No card: the answer would need a
                    triple accidental">—</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<p class="hint">
  Each cell is one card of <code>{deckLabel}</code>, showing how often iReal
  Pro's Jazz 1460 playlist names that degree above that root, which is also
  what its shade says once it is on. Tap a cell to turn it on or off, or a
  heading to turn its whole row or column.
</p>

<style>
  .threshold {
    display: grid;
    gap: 8px;
    margin-bottom: 16px;
  }

  .threshold label {
    font-size: 13px;
    color: var(--on-surface-muted);
  }

  .threshold strong {
    color: var(--on-surface);
    font-variant-numeric: tabular-nums;
  }

  .threshold input {
    width: 100%;
    accent-color: var(--count-new);
  }

  .grid-section {
    border: 1px solid var(--divider);
    border-radius: 8px;
    overflow: hidden;
  }

  .table-summary {
    display: flex;
    justify-content: space-between;
    padding: 14px;
    border-bottom: 1px solid var(--divider);
    font-weight: 500;
  }

  .table-summary span:last-child,
  .hint {
    color: var(--on-surface-muted);
  }

  .table-summary span:last-child {
    font-size: 13px;
    font-weight: 400;
  }

  .table-scroll {
    max-height: 52vh;
    overflow: auto;
  }

  table {
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12px;
  }

  th,
  td {
    padding: 0;
    border-bottom: 1px solid var(--divider);
    border-inline-end: 1px solid var(--divider);
  }

  /* The headings stay put so a cell deep in the grid still names itself. */
  thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--surface);
    color: var(--on-surface-muted);
  }

  .root {
    position: sticky;
    inset-inline-start: 0;
    z-index: 1;
    background: var(--surface);
  }

  .corner {
    z-index: 3;
    inset-inline-start: 0;
  }

  th button,
  .cell,
  .gap {
    display: block;
    width: 100%;
    min-width: 56px;
    min-height: 34px;
    padding: 0 6px;
    color: inherit;
    font-size: inherit;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .root button,
  .corner {
    min-width: 44px;
    font-weight: 500;
  }

  /* One blue ramp, five steps, pale for a pair jazz standards barely name and
     deep for one they lean on. The dark theme keeps that direction but starts
     further down the ramp, so its deepest step still clears its own surface.
     Each step carries the ink that step can hold. */
  .grid-section,
  .legend {
    --heat-0: #86b6ef;
    --heat-1: #5598e7;
    --heat-2: #256abf;
    --heat-3: #184f95;
    --heat-4: #0d366b;
    --heat-ink-0: #0b0b0b;
    --heat-ink-1: #0b0b0b;
    --heat-ink-2: #ffffff;
    --heat-ink-3: #ffffff;
    --heat-ink-4: #ffffff;
  }

  @media (prefers-color-scheme: dark) {
    .grid-section,
    .legend {
      --heat-0: #9ec5f4;
      --heat-1: #6da7ec;
      --heat-2: #3987e5;
      --heat-3: #256abf;
      --heat-4: #184f95;
      --heat-ink-0: #0b0b0b;
      --heat-ink-1: #0b0b0b;
      --heat-ink-2: #0b0b0b;
      --heat-ink-3: #ffffff;
      --heat-ink-4: #ffffff;
    }
  }

  .cell {
    color: var(--on-surface-muted);
  }

  /* Off is the absence of a fill, not another colour, so shade is left to
     mean frequency and nothing else. */
  .cell.on.heat-0 {
    background: var(--heat-0);
    color: var(--heat-ink-0);
  }

  .cell.on.heat-1 {
    background: var(--heat-1);
    color: var(--heat-ink-1);
  }

  .cell.on.heat-2 {
    background: var(--heat-2);
    color: var(--heat-ink-2);
  }

  .cell.on.heat-3 {
    background: var(--heat-3);
    color: var(--heat-ink-3);
  }

  .cell.on.heat-4 {
    background: var(--heat-4);
    color: var(--heat-ink-4);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
    color: var(--on-surface-muted);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .swatch {
    width: 18px;
    height: 12px;
    border-radius: 2px;
  }

  .swatch.heat-0 {
    background: var(--heat-0);
  }

  .swatch.heat-1 {
    background: var(--heat-1);
  }

  .swatch.heat-2 {
    background: var(--heat-2);
  }

  .swatch.heat-3 {
    background: var(--heat-3);
  }

  .swatch.heat-4 {
    background: var(--heat-4);
  }

  .gap {
    color: var(--divider);
  }

  .hint {
    margin: 16px 0 0;
    font-size: 13px;
  }

  .hint code {
    padding: 2px 5px;
    border-radius: 4px;
    background: var(--divider);
    color: var(--on-surface);
    font-family: inherit;
  }
</style>
