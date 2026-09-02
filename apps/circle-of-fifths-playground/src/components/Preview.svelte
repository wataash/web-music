<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  let {
    svg,
    error,
  }: {
    svg: string;
    error: string | null;
  } = $props();
</script>

<div class="preview" class:has-error={error !== null}>
  {#if error}
    <div class="error" role="alert">
      <strong>Cannot render this combination</strong>
      <span>{error}</span>
    </div>
  {:else}
    <div class="svg-frame">{@html svg}</div>
  {/if}
</div>
