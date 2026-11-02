<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0 -->
<script lang="ts">
  import type { Snippet } from "svelte";
  let { modified, settingName, onreset, heading, children }: {
    modified: boolean;
    settingName: string;
    onreset: () => void;
    heading: Snippet;
    children?: Snippet;
  } = $props();
</script>
<div class="setting-change" class:modified>
  <div class="setting-heading">{@render heading()}</div>
  {#if modified}
    <button type="button" class="reset-setting" aria-label={`Reset ${settingName} to default`} title="Reset to default" onclick={onreset}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.5 8M4 4v6h6" /></svg>
    </button>
  {/if}
  {#if children}<div class="setting-content">{@render children()}</div>{/if}
</div>
<style>
  .setting-change { position:relative; display:grid; grid-template-columns:minmax(0,1fr) 44px; align-items:center; column-gap:4px; padding-left:12px; }
  .setting-change.modified::before { content:""; position:absolute; left:0; top:8px; bottom:8px; width:3px; border-radius:2px; background:var(--count-new); }
  .setting-heading { grid-column:1; min-width:0; min-height:44px; display:flex; align-items:center; }
  .reset-setting { grid-column:2; grid-row:1; display:grid; place-items:center; width:44px; height:44px; border-radius:6px; color:var(--count-new); }
  .reset-setting:hover { background:color-mix(in srgb,var(--count-new) 12%,transparent); }
  .reset-setting:focus-visible { outline:2px solid var(--count-new); outline-offset:2px; }
  svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
  .setting-content { grid-column:1/-1; min-width:0; margin-top:4px; }
</style>
