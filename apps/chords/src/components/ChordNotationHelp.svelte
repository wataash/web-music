<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { CHORD_NOTATION_GROUPS } from '../lib/custom-chart';
  let details: HTMLDetailsElement;
  let summary: HTMLElement;
  export function show() {
    details.open = true;
    summary.focus();
    summary.scrollIntoView({ block: 'nearest' });
  }
  const common = [
    ['Major seventh', 'Amaj7 = AM7 = A^7 = A△7 = AΔ7 = A^'],
    ['Minor seventh', 'Am7 = A-7 = Amin7'],
    ['Dominant seventh', 'A7'],
    ['Half-diminished', 'Am7b5 = Am7-5 = Ah7 = Aø7 = Aø = Ah'],
    ['Diminished', 'Adim = Ao; Adim7 = Ao7'],
    ['Augmented', 'Aaug = A+'],
    ['Suspended', 'Asus2 = A2; Asus4 = Asus; A7sus4 = A7sus = Asus7'],
    ['iReal rewrites', 'A11 → A9sus; A7b5 → A7#11; A7b13 → A7#5'],
    ['Tensions', 'A9, A13, A7b9, A7#9, A^7#11'],
    ['Slash bass', 'A7/C#, Dm7/G'],
    ['No chord', 'n = N.C.'],
  ];
</script>

<details class="notation-help" bind:this={details}>
  <summary bind:this={summary}>Chord notation help</summary>
  <h3>Bars and lines</h3>
  <p>Spaces separate bars: <code>A7 D7 A7 A7</code> makes four bars. A new line starts a chart row.</p>
  <p>If a line contains <code>|</code>, barlines separate its bars: <code>Dm7 G7 | Cmaj7</code> puts Dm7 and G7 in the first bar and Cmaj7 in the second. Leading and trailing barlines are optional.</p>
  <p>Use up to 16 chords per line. Extra spaces, full-width spaces and blank lines are ignored. Keep each chord symbol together without spaces.</p>
  <h3>Common spellings</h3>
  <p>Chord shorthands follow <a href="https://www.irealpro.com/learn/chord-symbols/" target="_blank" rel="noreferrer">iReal Pro’s notation rules</a>. In particular, <code>A^</code> includes the major seventh and <code>Ah</code> includes the minor seventh. Rewrites also apply to saved custom charts. Your original input is kept for editing and text export.</p>
  <p>Examples use A. Replace it with any uppercase root A–G. Accidentals can be <code>b</code> / <code>♭</code> or <code>#</code> / <code>♯</code>, as in <code>Bbmaj7</code> and <code>F♯m7</code>. A minus sign <code>−</code> also works for minor chords.</p>
  <table><caption>Common chord notation</caption><tbody>
    {#each common as [label, examples]}<tr><th scope="row">{label}</th><td><code>{examples}</code></td></tr>{/each}
  </tbody></table>
  <p><code>=</code> and <code>→</code> above explain conversions; do not type them. Append a bass note such as <code>/C#</code> to any chord. <code>n</code> or <code>N.C.</code> stays silent.</p>
  <details class="all-notations">
    <summary>All supported chord spellings</summary>
    <p>Each entry is a complete example with root A. Use these spellings as written; arbitrary combinations of suffixes or parentheses may not be supported.</p>
    {#each CHORD_NOTATION_GROUPS as group}
      <h4>{group.label}</h4>
      <ul aria-label={group.label}>{#each group.symbols as symbol}<li><code>{symbol}</code></li>{/each}</ul>
    {/each}
    <h4>No chord</h4><code>n = N.C.</code>
  </details>
</details>

<style>
  .notation-help { margin: 12px 0; font-size: 13px; }
  summary { cursor: pointer; color: var(--text-accent); padding: 8px 0; }
  summary:focus-visible { outline: 2px solid var(--text-accent); outline-offset: 2px; }
  h3, h4 { font-size: 14px; margin: 14px 0 6px; }
  p { line-height: 1.5; color: var(--on-surface-muted); }
  code { font-family: ui-monospace, monospace; color: var(--on-surface); overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  caption { text-align: left; font-weight: bold; padding: 6px 0; }
  th, td { padding: 8px 4px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--divider); }
  th { width: 30%; overflow-wrap: anywhere; }
  ul { display: flex; flex-wrap: wrap; gap: 6px 12px; list-style: none; padding: 0; margin: 8px 0; }
  li { max-width: 100%; }
</style>
