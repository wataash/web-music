<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  let { stringCount = 6, value = $bindable<number[]>([]) }: { value: number[]; stringCount?: number } = $props();
</script>

<fieldset class="bass-strings">
  <legend>Strings for bass notes</legend>
  {#each Array.from({ length: stringCount }, (_, i) => i + 1) as string}
    <label><input type="checkbox" bind:group={value} value={string} />String {string}</label>
  {/each}
</fieldset>

<style>
  fieldset {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 0;
    padding: 8px 12px;
    border: 1px solid var(--divider);
    border-radius: 8px;
  }
  label { display: flex; align-items: center; gap: 4px; }
</style>
