<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { NoteRow } from "../lib/db";
  import { MAX_FRET_REACH, type FretWindow } from "../lib/guitar-interval-selection";

  let { notes, selectedNotes, window, overrides, onoverrideschange, controlsHeight }: {
    notes: readonly NoteRow[]; selectedNotes: readonly NoteRow[]; window: FretWindow;
    overrides: Readonly<Record<string, boolean>>;
    onoverrideschange: (value: Readonly<Record<string, boolean>>) => void;
    controlsHeight: number;
  } = $props();
  const strings = [1, 2, 3, 4, 5, 6];
  const roots = [6, 5, 4, 3, 2, 1];
  const offsets = Array.from({ length: MAX_FRET_REACH * 2 + 1 }, (_, i) => i - MAX_FRET_REACH);
  let root = $state(6);
  let inspected = $state<string | null>(null);
  let expanded: HTMLDivElement;
  const allCells = $derived(new Map(notes.map((note) =>
    [`${note.fields[2]}:${note.fields[3]}:${note.fields[4]}`, note],
  )));
  const selectedIds = $derived(new Set(selectedNotes.map(({ id }) => id)));
  const included = (note: NoteRow) => selectedIds.has(note.id);
  const counts = $derived(roots.map((string) => selectedNotes.filter((note) => Number(note.fields[2]) === string).length));
  const detail = $derived(inspected ? allCells.get(`${root}:${inspected}`) : undefined);
  const offsetLabel = (offset: number) => offset > 0 ? `+${offset}` : String(offset);
</script>

<section class="map" aria-label="Question map">
  <strong>Question map</strong>
  <p>All root strings at a glance. Choose a fretboard to edit its positions.</p>
  <div class="roots" role="group" aria-label="Root string">
    {#each roots as string, index}
      <button class:active={root === string} aria-pressed={root === string}
        aria-label="Root string {string}, {counts[index]} included"
        onclick={() => { root = string; inspected = null; expanded.scrollIntoView({ block: "start" }); }}>
        <span class="overview-heading">String {string}<small>{counts[index]} cards</small></span>
        <svg viewBox="0 0 156 60" aria-hidden="true">
          {#each strings as targetString}
            {#each offsets as offset, column}
              {@const note = allCells.get(`${string}:${targetString}:${offset}`)}
              <rect x={column * 12 + 0.5} y={(targetString - 1) * 10 + 0.5} width="11" height="9"
                class:mini-included={note && included(note)}
                class:mini-root={targetString === string && offset === 0} />
              {#if targetString === string && offset === 0}
                <text x={column * 12 + 6} y={(targetString - 1) * 10 + 8}>1</text>
              {/if}
            {/each}
          {/each}
        </svg>
      </button>
    {/each}
  </div>
  <div class="legend"><span class="swatch included"></span>Included<span class="swatch"></span>Excluded<span class="swatch root"></span>Root 1</div>
  <div class="expanded" bind:this={expanded} style:scroll-margin-top="{controlsHeight + 12}px">
  <h3>Root on string {root}</h3>
  <table aria-label="Intervals from root string {root}">
    <thead><tr><th aria-label="Target string">Str.</th>{#each offsets as offset}<th scope="col">{offsetLabel(offset)}</th>{/each}</tr></thead>
    <tbody>
      {#each strings as string}
        <tr><th scope="row">{string}</th>
          {#each offsets as offset}
            {@const note = allCells.get(`${root}:${string}:${offset}`)}
            <td class:outside={offset < -window.left || offset > window.right}>
              {#if string === root && offset === 0}
                <span class="root-marker" aria-label="Root on string {root}">1</span>
              {:else if note}
                <button class="cell" class:included={included(note)} data-included={included(note)}
                  aria-pressed={included(note)}
                  disabled={offset < -window.left || offset > window.right}
                  aria-label="String {string}, fret {offsetLabel(offset)}: {note.fields[5]}, {included(note) ? 'included' : 'excluded'}"
                  onclick={() => { inspected = `${string}:${offset}`; onoverrideschange({ ...overrides, [note.fields[0]]: !included(note) }); }}>{note.fields[5].split(' ')[0]}</button>
              {:else}<span>—</span>{/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  </div>
  <p>Tap cells to toggle. Moving difficulty resets individual changes.</p>
  {#if Object.keys(overrides).length > 0}
    <button class="reset-individual" onclick={() => onoverrideschange({})}>RESET INDIVIDUAL CHANGES</button>
  {/if}
  <p class="detail" aria-live="polite">
    {#if detail}String {root} → string {detail.fields[3]} · fret {offsetLabel(Number(detail.fields[4]))} · <strong>{detail.fields[5]}</strong> · {included(detail) ? 'Included' : 'Excluded'}
    {:else}{counts[roots.indexOf(root)]} positions included from string {root}.{/if}
  </p>
</section>

<style>
  .map { margin: 16px 0; min-width: 0; }
  .map > strong { font-size: 14px; }
  p, .legend { font-size: 12px; color: var(--on-surface-muted); margin: 8px 0; }
  .roots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .roots button { padding: 8px; border: 1px solid var(--divider); border-radius: 6px; font-size: 12px; }
  .overview-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 4px; margin-bottom: 6px; }
  small { font-size: 10px; color: var(--on-surface-muted); }
  svg { display: block; width: 100%; }
  svg rect { fill: var(--divider); }
  svg .mini-included { fill: var(--count-new); }
  svg .mini-root { fill: var(--on-surface); }
  svg text { fill: var(--surface); font-size: 8px; text-anchor: middle; }
  h3 { font-size: 14px; font-weight: 500; margin: 12px 0 6px; }
  @media (max-width: 480px) { .roots { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .roots button.active { border-color: var(--count-new); box-shadow: inset 0 0 0 1px var(--count-new); }
  .legend { display: flex; gap: 6px; align-items: center; margin: 12px 0; }
  .swatch { width: 12px; height: 12px; border: 1px solid var(--divider); background: var(--surface); }
  .swatch:not(:first-child) { margin-left: 8px; }
  .included { background: color-mix(in srgb, var(--count-new) 24%, var(--surface)); }
  table { table-layout: fixed; border-collapse: collapse; width: 100%; font-size: 11px; }
  th { font-weight: 400; color: var(--on-surface-muted); height: 28px; }
  td { padding: 1px; border: 1px solid var(--divider); text-align: center; }
  .outside { background: var(--divider); }
  .cell, .root-marker { display: grid; place-items: center; width: 100%; min-height: 36px; font-size: 11px; border-radius: 2px; }
  .cell { color: var(--on-surface-muted); }
  .cell:disabled { cursor: default; opacity: 0.5; }
  .reset-individual { min-height: 44px; color: var(--count-new); font-size: 12px; }
  .cell.included { color: var(--on-surface); box-shadow: inset 0 0 0 1px var(--count-new); font-weight: 600; }
  .root, .root-marker { background: var(--on-surface); color: var(--surface); }
  .detail { min-height: 32px; color: var(--on-surface); }
</style>
