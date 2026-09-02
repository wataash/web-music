<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    titleId,
    children,
    applyLabel = "APPLY",
    applyDisabled = false,
    applyTone = "primary",
    onapply,
    oncancel,
  }: {
    title: string;
    titleId: string;
    children: Snippet;
    applyLabel?: string;
    applyDisabled?: boolean;
    // "danger" for an action that destroys something.
    applyTone?: "primary" | "danger";
    onapply: () => void;
    oncancel: () => void;
  } = $props();
</script>

<!-- The chrome every deck's note settings share: only the table and the
     presets inside differ. -->
<div class="scrim" role="presentation" onclick={oncancel}>
  <dialog
    open
    class="panel"
    aria-labelledby={titleId}
    onclick={(event) => event.stopPropagation()}
  >
    <header>
      <h2 id={titleId}>{title}</h2>
      <button class="close" title="Cancel" onclick={oncancel}>✕</button>
    </header>

    <div class="content">{@render children()}</div>

    <footer>
      <button class="text-action" onclick={oncancel}>CANCEL</button>
      <button
        class="primary-action {applyTone}"
        disabled={applyDisabled}
        onclick={onapply}>{applyLabel}</button
      >
    </footer>
  </dialog>
</div>

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(0 0 0 / 0.55);
  }

  .panel {
    position: relative;
    inset: auto;
    width: min(100%, 680px);
    max-height: min(90vh, 760px);
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border: 0;
    border-radius: 12px;
    background: var(--surface);
    color: var(--on-surface);
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.4);
    overflow: hidden;
  }

  header,
  footer {
    flex: none;
    display: flex;
    align-items: center;
    padding: 12px 16px;
  }

  header {
    border-bottom: 1px solid var(--divider);
  }

  h2 {
    flex: 1;
    margin: 0;
    font-size: 19px;
    font-weight: 500;
  }

  .close {
    width: 40px;
    height: 40px;
    color: var(--on-surface-muted);
    border-radius: 50%;
    font-size: 18px;
  }

  .content {
    min-height: 0;
    padding: 16px;
    overflow-y: auto;
  }

  footer {
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid var(--divider);
  }

  .text-action,
  .primary-action {
    min-height: 42px;
    padding: 0 18px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  .text-action {
    color: var(--on-surface-muted);
  }

  .primary-action.primary {
    background: var(--count-new);
    color: #0b1720;
  }

  .primary-action.danger {
    background: var(--ease-again);
    color: #ffffff;
  }

  .primary-action:disabled {
    cursor: default;
    opacity: 0.4;
  }

  @media (max-width: 480px) {
    .scrim {
      padding: 0;
    }

    .panel {
      width: 100%;
      max-height: 100%;
      height: 100%;
      border-radius: 0;
    }
  }
</style>
