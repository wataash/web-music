<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  // A folded view of every answer a deck can ask for, to read before or
  // between reviews. It changes nothing the deck asks.
  let { title, children }: { title: string; children: Snippet } = $props();
</script>

<details class="reference">
  <summary>{title}</summary>
  {@render children()}
</details>

<style>
  .reference {
    margin-top: 16px;
    border: 1px solid var(--divider);
    border-radius: 8px;
    overflow: hidden;
  }

  summary {
    padding: 14px;
    cursor: pointer;
    font-weight: 500;
  }
</style>
