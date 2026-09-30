<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import ReferenceSection from "./ReferenceSection.svelte";
  import {
    INTERVAL_DEGREE_ROWS,
    INTERVAL_PAIR_CELLS,
    INTERVAL_ROOT_ROWS,
  } from "../lib/interval-pair-selection";

  // The same grid the pairs are picked on, each cell holding its answer; the
  // pairs not being asked are drawn faint.
  let { selection }: { selection: ReadonlySet<string> } = $props();
</script>

<ReferenceSection title="Answer table">
  <div class="table-scroll">
    <table aria-label="Interval answers">
      <thead>
        <tr>
          <th class="corner" scope="col">Note</th>
          {#each INTERVAL_DEGREE_ROWS as degree (degree.id)}
            <th scope="col">{degree.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each INTERVAL_PAIR_CELLS as row, rowIndex (INTERVAL_ROOT_ROWS[rowIndex].note)}
          <tr>
            <th class="root" scope="row">{INTERVAL_ROOT_ROWS[rowIndex].label}</th>
            {#each row as cell (cell.key)}
              <td class:off={!selection.has(cell.key)}>
                {cell.available ? cell.answer : "—"}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</ReferenceSection>

<style>
  .table-scroll {
    max-height: 52vh;
    overflow: auto;
    border-top: 1px solid var(--divider);
  }

  table {
    border-collapse: separate;
    border-spacing: 0;
    font-size: 14px;
  }

  th,
  td {
    min-width: 44px;
    height: 32px;
    padding: 0 4px;
    border-bottom: 1px solid var(--divider);
    border-inline-end: 1px solid var(--divider);
    text-align: center;
    white-space: nowrap;
  }

  /* The headings stay put so a cell deep in the grid still names itself. */
  thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--surface);
    color: var(--on-surface-muted);
    font-size: 12px;
  }

  .root {
    position: sticky;
    inset-inline-start: 0;
    z-index: 1;
    background: var(--surface);
    font-weight: 500;
  }

  .corner {
    z-index: 3;
    inset-inline-start: 0;
  }

  .off {
    color: var(--on-surface-muted);
    opacity: 0.55;
  }
</style>
