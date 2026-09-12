<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { NoteRow } from "../lib/db";
  import { MAX_FRET_REACH, type FretWindow } from "../lib/guitar-interval-selection";

  let { notes, selectedNotes, window, overrides, onoverrideschange }: {
    notes: readonly NoteRow[]; selectedNotes: readonly NoteRow[]; window: FretWindow;
    overrides: Readonly<Record<string, boolean>>;
    onoverrideschange: (value: Readonly<Record<string, boolean>>) => void;
  } = $props();
  const strings = [1, 2, 3, 4, 5, 6];
  const roots = [6, 5, 4, 3, 2, 1];
  const offsets = Array.from({ length: MAX_FRET_REACH * 2 + 1 }, (_, i) => i - MAX_FRET_REACH);
  let inspected = $state<string | null>(null);
  const allCells = $derived(new Map(notes.map((note) =>
    [`${note.fields[2]}:${note.fields[3]}:${note.fields[4]}`, note],
  )));
  const selectedIds = $derived(new Set(selectedNotes.map(({ id }) => id)));
  const included = (note: NoteRow) => selectedIds.has(note.id);
  const counts = $derived(roots.map((string) => selectedNotes.filter((note) => Number(note.fields[2]) === string).length));
  const detail = $derived(inspected ? allCells.get(inspected) : undefined);
  const offsetLabel = (offset: number) => offset > 0 ? `+${offset}` : String(offset);
</script>

<section class="map" aria-label="Question map">
  <strong>Question map</strong>
  <p>Tap intervals to include or exclude them.</p>
  <div class="roots">
    {#each roots as root, index}
      <section class="board" aria-label="Root string {root}">
        <div class="overview-heading"><strong>String {root}</strong><small>{counts[index]} cards</small></div>
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
                        onclick={() => { inspected = `${root}:${string}:${offset}`; onoverrideschange({ ...overrides, [note.fields[0]]: !included(note) }); }}>{note.fields[5].split(' ')[0]}</button>
                    {:else}<span>—</span>{/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/each}
  </div>
  <div class="legend"><span class="swatch included"></span>Included<span class="swatch"></span>Excluded<span class="swatch root"></span>Root 1</div>
  <p>Moving the learning range resets individual changes.</p>
  {#if Object.keys(overrides).length > 0}
    <button class="reset-individual" onclick={() => onoverrideschange({})}>RESET INDIVIDUAL CHANGES</button>
  {/if}
  <p class="detail" aria-live="polite">
    {#if detail}String {detail.fields[2]} → string {detail.fields[3]} · fret {offsetLabel(Number(detail.fields[4]))} · <strong>{detail.fields[5]}</strong> · {included(detail) ? 'Included' : 'Excluded'}
    {/if}
  </p>
</section>

<style>
  .map { margin: 16px 0; min-width: 0; }
  .map > strong { font-size: 14px; }
  p, .legend { font-size: 12px; color: var(--on-surface-muted); margin: 8px 0; }
  .roots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .board { min-width: 0; padding: 6px; border: 1px solid var(--divider); border-radius: 6px; }
  .overview-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 4px; margin-bottom: 6px; font-size: 12px; }
  small { font-size: 10px; color: var(--on-surface-muted); }
  @media (max-width: 600px) { .roots { grid-template-columns: 1fr; } }
  .legend { display: flex; gap: 6px; align-items: center; margin: 12px 0; }
  .swatch { width: 12px; height: 12px; border: 1px solid var(--divider); background: var(--surface); }
  .swatch:not(:first-child) { margin-left: 8px; }
  .included { background: color-mix(in srgb, var(--count-new) 24%, var(--surface)); }
  table { table-layout: fixed; border-collapse: collapse; width: 100%; font-size: 11px; }
  th { font-weight: 400; color: var(--on-surface-muted); height: 24px; }
  td { padding: 0; border: 1px solid var(--divider); text-align: center; }
  .outside { background: var(--divider); }
  .cell, .root-marker { display: grid; place-items: center; width: 100%; min-height: 26px; font-size: 11px; border-radius: 2px; }
  .cell { color: var(--on-surface-muted); }
  .cell:disabled { cursor: default; opacity: 0.5; }
  .reset-individual { min-height: 44px; color: var(--count-new); font-size: 12px; }
  .cell.included { color: var(--on-surface); box-shadow: inset 0 0 0 1px var(--count-new); font-weight: 600; }
  .root, .root-marker { background: var(--on-surface); color: var(--surface); }
  .detail { min-height: 32px; color: var(--on-surface); }
</style>
