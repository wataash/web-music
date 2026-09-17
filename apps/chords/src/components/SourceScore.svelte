<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { tick } from "svelte";
  import IrealScore from "./IrealScore.svelte";
  import { chordViewPersistence } from "../lib/chord-view";
  const { remember, viewKey, hasView, chartZoom, minorNotation } = chordViewPersistence();
  import { irealChordParts } from "../lib/ireal-layout";
  import type { ScoreToken } from "../lib/chord-metadata";
  let { blocks, format = "ireal", symbols, sublabels, selected = [], storageId = "score", contextIndex, onselect }: {
    blocks: ScoreToken[][]; format?: string; symbols: string[];
    // A second, smaller name under each chord, such as its degree.
    sublabels?: string[];
    selected?: number[]; storageId?: string; contextIndex?: number; onselect?: (index: number) => void;
  } = $props();
  let element: HTMLDivElement;
  let width = $state(0);
  // ChordWiki prints every bracketed token above the text that follows it, so a
  // line becomes columns that each carry one chord or rhythm mark and its lyric.
  type ScoreColumn = { head?: ScoreToken; body: ScoreToken[] };
  const lines = $derived(blocks.map(block => {
    const content = block.filter(token => token.kind !== "break");
    const columns: ScoreColumn[] = [];
    for (const token of content) {
      if (token.chordIndex !== undefined || token.kind === "marker") columns.push({ head: token, body: [] });
      else {
        if (!columns.length) columns.push({ body: [] });
        columns.at(-1)!.body.push(token);
      }
    }
    return {
      columns,
      hasHead: columns.some(column => column.head),
      center: content.length === 1 && ["title", "subtitle"].includes(content[0].name ?? ""),
    };
  }));
  function displayText(token: ScoreToken): string {
    if (token.kind !== "field" || !token.name) return token.text ?? "";
    if (token.name === "key") return `Key: ${token.text}`;
    return ["title", "subtitle"].includes(token.name) ? token.text ?? "" : `${token.label}: ${token.text}`;
  }
  $effect(() => {
    selected; blocks;
    let active = true;
    void tick().then(() => {
      if (format !== "chordwiki" || !active || !element || hasView(viewKey(storageId))) return;
      const target = element.querySelector<HTMLElement>(".selected");
      if (target) element.scrollLeft += target.getBoundingClientRect().left - element.getBoundingClientRect().left - element.clientWidth / 2 + target.clientWidth / 2;
    });
    return () => { active = false; };
  });
</script>

{#snippet chord(token: ScoreToken)}
  {@const parts = irealChordParts(symbols[token.chordIndex!], minorNotation())}
  <button type="button" onclick={() => onselect?.(token.chordIndex!)} class="chord" class:narrow={token.narrow} class:selected={selected.includes(token.chordIndex!)} aria-label={symbols[token.chordIndex!]} title={`Original notation: ${token.raw}`}>{parts.root}{parts.accidental}{parts.quality}{#if parts.bass}/{parts.bass}{/if}{#if sublabels?.[token.chordIndex!]}<span class="sublabel">{sublabels[token.chordIndex!]}</span>{/if}</button>
{/snippet}

{#snippet plain(token: ScoreToken)}
  <span class={token.kind} class:italic={token.italic} class:title={token.name === "title"} class:subtitle={token.name === "subtitle"} class:key={token.name === "key"}
    title={token.label ? `${token.label} (${token.raw})` : undefined}>{displayText(token)}{#if token.position !== undefined}<small>〈Height {token.position}〉</small>{/if}</span>
{/snippet}

<div class="score" class:ireal={format === "ireal"} class:chordwiki={format === "chordwiki"} aria-label="Source chart" bind:this={element} bind:clientWidth={width} use:remember={viewKey(storageId)}>
  <div style:width={width ? width + "px" : "100%"} style:zoom={chartZoom()}>
  {#if format === "chordwiki"}
    {#each lines as line}
      <div class="line" class:center={line.center} class:blank={!line.columns.length}>
        {#each line.columns as column}
          <span class="col">
            {#if line.hasHead}
              <span class="head">{#if column.head?.chordIndex !== undefined}{@render chord(column.head)}{:else if column.head}{@render plain(column.head)}{/if}</span>
            {/if}
            <span class="body">{#each column.body as token}{@render plain(token)}{/each}</span>
          </span>
        {/each}
      </div>
    {/each}
  {:else}
    <IrealScore {blocks} {symbols} {sublabels} {selected} {contextIndex} {onselect} />
  {/if}
  </div>
</div>

<style>
  .score { font: 14px/1.9 ui-monospace, monospace; overflow-x: auto; max-width: 100%; text-align: left; color: var(--on-surface); }
  .chord { font: inherit; border: 0; padding: 0; background: transparent; cursor: pointer; color: var(--text-accent); font-weight: 600; }
  .selected { background: color-mix(in srgb, var(--text-accent) 22%, transparent); outline: 1px solid var(--text-accent); border-radius: 3px; }
  .bar, .symbol { padding: 0 4px; }
  .bar { font-size: 20px; }
  .section { border: 1px solid var(--text-accent); border-radius: 3px; margin: 0 6px; padding: 0 5px; }
  .comment, .field { color: var(--on-surface-muted); }
  .italic { font-style: italic; }
  .size { font-size: 10px; color: var(--on-surface-muted); }
  .divider { width: 2px; }
  .break { display: block; }
  small { font-size: 10px; color: var(--on-surface-muted); }

  /* ChordWiki stacks the chord row over the lyric row and stretches the lyrics
     to fit the chord above them. */
  .chordwiki { line-height: 1.5; }
  .chordwiki .line { white-space: nowrap; }
  .chordwiki .line.blank { height: 1.5em; }
  .chordwiki .line.center { text-align: center; }
  .chordwiki .col { display: inline-block; vertical-align: bottom; }
  .chordwiki .head, .chordwiki .body { display: block; min-height: 1.5em; white-space: pre; }
  .chordwiki .head { padding-right: 1ch; color: var(--text-accent); font-weight: 600; }
  .chordwiki .sublabel { display: block; font-size: 10px; font-weight: 400; line-height: 1.2; color: var(--on-surface-muted); }
  .chordwiki .comment, .chordwiki .field { color: var(--on-surface); font-weight: 700; }
  .chordwiki .title { display: inline-block; padding: 4px 40px; border: 1px solid var(--divider); font-size: 17px; }
  .chordwiki .subtitle { font-weight: 400; }
  .chordwiki .key { color: #c62828; }

  @media (prefers-color-scheme: dark) {
    .chordwiki .key { color: #ef9a9a; }
  }
</style>
