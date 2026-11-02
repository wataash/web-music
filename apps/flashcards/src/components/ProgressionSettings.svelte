<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0 -->
<script lang="ts">
  import RelativeMajorDegreeToggle from "./RelativeMajorDegreeToggle.svelte";
  import DiatonicNotationSelect from "./DiatonicNotationSelect.svelte";
  import type { MinorDegreeNotation, ChordNotation } from "../lib/diatonic-selection";
  import MovableDoKeySettings from "./MovableDoKeySettings.svelte";
  import { parseProgressionSelection, type ProgressionSelection } from "../lib/progression-selection";
  const modes = ["major", "minor"] as const;
  const defaults = parseProgressionSelection(null);
  let { selection, onchange, minorNotation = $bindable(), chordNotation = $bindable() }: { minorNotation: MinorDegreeNotation; chordNotation: ChordNotation; selection: ProgressionSelection; onchange: (value: ProgressionSelection) => void } = $props();
</script>
<section aria-label="II–V–I keys">
  <DiatonicNotationSelect bind:minorNotation bind:chordNotation />
  {#each modes as mode}
    {@const field = mode === "major" ? "majorKeys" : "minorKeys"}
    <section aria-label={mode === "major" ? "Major" : "Minor"}>
      <MovableDoKeySettings {mode} selection={selection[field]} defaultSelection={defaults[field]} showReference={false} onchange={keys => onchange({ ...selection, [field]: keys })}>
        {#snippet afterHeading()}
          {#if mode === "minor"}<RelativeMajorDegreeToggle defaultChecked={true} checked={selection.relativeMajor} onchange={value => onchange({ ...selection, relativeMajor:value })} />{/if}
        {/snippet}
      </MovableDoKeySettings>
    </section>
  {/each}
  <details><summary>Help</summary><p>Major: ii–V–I. Minor: iiø–V–i, ending on a minor seventh chord.</p></details>
</section>
<style>
  section section + section { margin-top:28px; padding-top:24px; border-top:1px solid var(--divider); }
  details { margin-top:24px; }
  summary { cursor:pointer; padding:8px 0; }
  p { color:var(--on-surface-muted); font-size: var(--ui-font-size-secondary); }
</style>
