<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0 -->
<script lang="ts">
  import MovableDoKeySettings from "./MovableDoKeySettings.svelte";
  import { parseProgressionSelection, type ProgressionSelection } from "../lib/progression-selection";
  const modes = ["major", "minor"] as const;
  const defaults = parseProgressionSelection(null);
  let { selection, onchange }: { selection: ProgressionSelection; onchange: (value: ProgressionSelection) => void } = $props();
</script>
<section aria-label="II–V–I keys">
  {#each modes as mode}
    {@const field = mode === "major" ? "majorKeys" : "minorKeys"}
    <section aria-label={mode === "major" ? "Major" : "Minor"}>
      <MovableDoKeySettings {mode} selection={selection[field]} defaultSelection={defaults[field]} showReference={false} onchange={keys => onchange({ ...selection, [field]: keys })}>
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
