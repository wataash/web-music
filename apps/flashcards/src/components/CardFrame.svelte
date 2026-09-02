<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onDestroy } from "svelte";

  let {
    doc,
    ondiagramtap,
    oncardkeydown,
    onbackground,
  }: {
    doc: string;
    ondiagramtap?: () => void;
    oncardkeydown?: (event: KeyboardEvent) => void;
    // The colour the deck paints its card, for whatever the app leaves empty
    // around it: only the card document knows it.
    onbackground?: (color: string) => void;
  } = $props();

  let cardDocument: Document | null = null;
  // A card can hold more than one picture — a staff and a keyboard — and
  // tapping any of them means the same thing.
  let diagrams: readonly Element[] = [];

  function handleDiagramTap(): void {
    ondiagramtap?.();
  }

  function handleCardKeyDown(event: KeyboardEvent): void {
    oncardkeydown?.(event);
  }

  function stopListening(): void {
    for (const diagram of diagrams) {
      diagram.removeEventListener("click", handleDiagramTap);
    }
    diagrams = [];
    cardDocument?.removeEventListener("keydown", handleCardKeyDown);
  }

  function handleLoad(event: Event): void {
    stopListening();
    const frame = event.currentTarget as HTMLIFrameElement;
    cardDocument = frame.contentDocument;
    diagrams = [...(cardDocument?.querySelectorAll(".diagram") ?? [])];
    for (const diagram of diagrams) {
      diagram.addEventListener("click", handleDiagramTap);
    }
    cardDocument?.addEventListener("keydown", handleCardKeyDown);
    const body = cardDocument?.body;
    if (body) onbackground?.(getComputedStyle(body).backgroundColor);
  }

  onDestroy(stopListening);
</script>

<!-- Mimics the AnkiDroid WebView: the card is a full document so the deck's
     own CSS applies untouched, isolated from the app chrome. -->
<iframe title="card" srcdoc={doc} onload={handleLoad}></iframe>

<style>
  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
  }
</style>
