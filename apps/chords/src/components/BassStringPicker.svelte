<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  let { value = $bindable<number[]>([]) }: { value: number[] } = $props();
</script>

<fieldset class="bass-strings">
  <legend>Strings for bass notes</legend>
  {#each [1, 2, 3, 4, 5, 6] as string}
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
