<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import SettingChange from "./SettingChange.svelte";
  import type { NoteRow } from "../lib/db";
  import { includesGuitarIntervalCard, MAX_FRET_REACH, type FretWindow } from "../lib/guitar-interval-selection";
  import { parseGuitarOverrides } from "../lib/guitar-interval-selection";
  import { guitarShapeId, guitarShapeIds } from "../lib/guitar-shapes";

  import { noteTuning } from "../lib/guitar-tuning";

  let { notes, selectedNotes, window, stringCount, difficulty, overrides, onoverrideschange }: {
    notes: readonly NoteRow[]; selectedNotes: readonly NoteRow[]; window: FretWindow;
    stringCount: number; difficulty: number;
    overrides: Readonly<Record<string, boolean>>;
    onoverrideschange: (value: Readonly<Record<string, boolean>>) => void;
  } = $props();
  // String 1 first down each board; the boards run from the lowest root up.
  const strings = $derived(Array.from({ length: stringCount }, (_, i) => i + 1));
  const roots = $derived([...strings].reverse());
  const tuning = $derived(notes.length > 0 ? noteTuning(notes[0]) : []);
  const offsets = Array.from({ length: MAX_FRET_REACH * 2 + 1 }, (_, i) => i - MAX_FRET_REACH);
  let inspected = $state<string | null>(null);
  const allCells = $derived(new Map(notes.map((note) =>
    [`${note.fields[2]}:${note.fields[3]}:${note.fields[4]}`, note],
  )));
  const selectedIds = $derived(new Set(selectedNotes.map(({ id }) => id)));
  const included = (note: NoteRow) => selectedIds.has(note.id);
  const counts = $derived(roots.map((string) => selectedNotes.filter((note) => Number(note.fields[2]) === string).length));
  const modified = $derived(notes.some(note => included(note) !== includesGuitarIntervalCard(note, window, difficulty, {})));
  const detail = $derived(inspected ? allCells.get(inspected) : undefined);
  const offsetLabel = (offset: number) => offset > 0 ? `+${offset}` : String(offset);
</script>

<section class="map" aria-label="Question map">
  <SettingChange {modified} settingName="Question map" onreset={() => onoverrideschange({})}>
  {#snippet heading()}<strong>Question map</strong>{/snippet}
  <p>Tap an interval to change all equivalent shapes.</p>
  <div class="roots">
    {#each roots as root, index}
      <section class="board" aria-label="Root string {root}">
        <div class="overview-heading"><strong>String {root}</strong><small>{counts[index]} positions</small></div>
        <div class="table-scroll" tabindex="0" role="region" aria-label="Intervals for string {root}">
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
                        onclick={() => { inspected = `${root}:${string}:${offset}`; onoverrideschange({ ...parseGuitarOverrides(overrides, tuning), [guitarShapeId(note)]: !included(note) }); }}>{note.fields[5].split(/[( ]/)[0]}</button>
                    {:else}<span>—</span>{/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
        </div>
      </section>
    {/each}
  </div>
  <div class="legend"><span class="swatch included"></span>Included<span class="swatch"></span>Excluded<span class="swatch root"></span>Root 1</div>
  <p class="detail" aria-live="polite">
    {#if detail}String {detail.fields[2]} → string {detail.fields[3]} · fret {offsetLabel(Number(detail.fields[4]))} · <strong>{detail.fields[5]}</strong> · {included(detail) ? 'Included' : 'Excluded'}
      · {guitarShapeIds(detail).length} equivalent positions
    {/if}
  </p>
  </SettingChange>
</section>

<style>
  .map { margin: 16px 0; min-width: 0; }
  strong { font-size: var(--ui-font-size-label); }
  p, .legend { font-size: var(--ui-font-size-secondary); color: var(--on-surface-muted); margin: 8px 0; }
  .roots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .board { min-width: 0; padding: 6px; border: 1px solid var(--divider); border-radius: 6px; }
  .overview-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 4px; margin-bottom: 6px; font-size: var(--ui-font-size-secondary); }
  small { font-size: var(--ui-font-size-caption); color: var(--on-surface-muted); }
  @media (max-width: 600px) { .roots { grid-template-columns: 1fr; } }
  .legend { display: flex; flex-wrap:wrap; gap: 6px; align-items: center; margin: 12px 0; }
  .swatch { width: 12px; height: 12px; border: 1px solid var(--divider); background: var(--surface); }
  .swatch:not(:first-child) { margin-left: 8px; }
  .included { background: color-mix(in srgb, var(--count-new) 24%, var(--surface)); }
  .table-scroll { overflow-x:auto; }
  table { min-width:28rem; table-layout: fixed; border-collapse: collapse; width: 100%; font-size: var(--ui-font-size-caption); }
  th { font-weight: 400; color: var(--on-surface-muted); height: 24px; }
  td { padding: 0; border: 1px solid var(--divider); text-align: center; }
  .outside { background: var(--divider); }
  .cell, .root-marker { display: grid; place-items: center; width: 100%; min-height: 26px; font-size: var(--ui-font-size-caption); border-radius: 2px; }
  .cell { color: var(--on-surface-muted); }
  .cell:disabled { cursor: default; opacity: 0.5; }
  .cell.included { color: var(--on-surface); box-shadow: inset 0 0 0 1px var(--count-new); font-weight: 600; }
  .root, .root-marker { background: var(--on-surface); color: var(--surface); }
  .detail { min-height: 32px; color: var(--on-surface); }
</style>
