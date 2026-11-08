<!-- SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0 -->
<script lang="ts">
  import { onMount, untrack } from "svelte";
  import DiatonicNotationSelect from "./DiatonicNotationSelect.svelte";
  import RelativeMajorDegreeToggle from "./RelativeMajorDegreeToggle.svelte";
  import { db } from "../lib/db";
  import type { QueueItem } from "../lib/study";
  import { previewDocument, type DeckPreviewRow } from "../lib/deck-preview";
  import { mediaFilenamesIn } from "../lib/template";
  import { deckSettingsTarget, type NoteSelections } from "../lib/note-selection";
  import { diatonicNotationPreference, setDiatonicNotation, setChordNotation } from "../lib/diatonic-notation.svelte";
  import { CHORD_NOTATION_OPTIONS, type DiatonicSelections } from "../lib/diatonic-selection";
  import type { ProgressionSelection } from "../lib/progression-selection";
  import { deckPathLabel } from "../lib/deck-labels";

  let { deckName, preview = null, noteSelections, ondiatonicselectionchange, onprogressionselectionchange, onclose }: {
    deckName: string;
    preview?: QueueItem | null;
    noteSelections: NoteSelections;
    ondiatonicselectionchange: (value: DiatonicSelections) => void;
    onprogressionselectionchange: (value: ProgressionSelection) => void;
    onclose: () => void;
  } = $props();
  const target = $derived(deckSettingsTarget(deckName));
  const harmony = $derived(target?.kind === "diatonic" || target?.kind === "progression" || target?.kind === "chord-tones");
  const direction = $derived(target?.kind === "diatonic" ? target.setting.directions[0] : null);
  let minorNotation = $state(untrack(() => diatonicNotationPreference.value));
  let chordNotation = $state(untrack(() => ({ ...diatonicNotationPreference.chords })));
  let relativeMajor = $state(untrack(() => target?.kind === "progression"
    ? noteSelections.progressions.relativeMajor
    : direction ? noteSelections.diatonic[direction].relativeMajor : false));
  let back = $state(false);
  let row = $state<DeckPreviewRow | null>(null);
  let error = $state("");
  let dialog: HTMLDialogElement;

  onMount(() => {
    dialog.showModal();
    let active = true;
    async function load() {
      let sample = preview;
      if (!sample) {
        const decks = await db.decks.filter(d => d.name === deckName || d.name.startsWith(`${deckName}::`)).toArray();
        const card = await db.cards.where("did").anyOf(decks.map(d => d.did)).sortBy("newOrder").then(cards => cards[0]);
        if (!card) throw new Error("No cards available for preview.");
        const note = await db.notes.get(card.nid);
        const model = note && await db.models.get(note.mid);
        const template = model?.templates.find(t => t.ord === card.ord);
        if (!note || !model || !template) throw new Error("Card preview is unavailable.");
        sample = { card, note, model, template, deckName: decks.find(d => d.did === card.did)!.name, state: undefined, extraReview: false };
      }
      const media = (await db.media.bulkGet([...mediaFilenamesIn(sample.note.fields.join("\n"))])).filter(value => value !== undefined);
      if (active) row = { ...sample, media };
    }
    void load().catch(reason => { if (active) error = String(reason.message ?? reason); });
    return () => { active = false; };
  });

  const doc = $derived(row ? previewDocument({ ...row, model: { ...row.model, css: row.model.css + `
    :root { --diatonic-relative-display: ${relativeMajor ? "block" : "none"}; --progression-relative-display: ${relativeMajor ? "block" : "none"}; }
    html { height:100%; overflow:hidden; }
    body { height:100%; overflow:auto; overscroll-behavior:contain; }
    .diatonic-card { gap:12px; padding:12px 16px; }
    .diatonic-question, .diatonic-answer { font-size:30px; }
    .diatonic-key { margin-bottom:6px; }
    .diatonic-relative, .progression-relative, .diatonic-source { margin-top:4px; }
  ` } }, back, true, noteSelections.fretboardFretCount, minorNotation, chordNotation) : "");

  function apply() {
    if (harmony) {
      setDiatonicNotation(minorNotation);
      for (const option of CHORD_NOTATION_OPTIONS) setChordNotation(option.key, chordNotation[option.key]);
    }
    if (target?.kind === "progression") onprogressionselectionchange({ ...noteSelections.progressions, relativeMajor });
    if (direction) ondiatonicselectionchange({ ...noteSelections.diatonic, [direction]: { ...noteSelections.diatonic[direction], relativeMajor } });
    onclose();
  }
</script>

<dialog bind:this={dialog} aria-labelledby="appearance-title" onclose={onclose}>
  <header><h2 id="appearance-title">Appearance</h2><p>{deckPathLabel(deckName).replaceAll("::", " / ")}</p></header>
  <div class="preview">
    <div class="sides" role="group" aria-label="Preview side">
      <button aria-pressed={!back} onclick={() => back = false}>Front</button>
      <button aria-pressed={back} onclick={() => back = true}>Back</button>
    </div>
    {#if error}<p role="alert">{error}</p>
    {:else if row}{#key doc}<iframe title="Appearance preview" srcdoc={doc} sandbox="allow-scripts"></iframe>{/key}
    {:else}<p role="status">Loading preview…</p>{/if}
  </div>
  <div class="settings">
    {#if harmony}
      <p class="scope">Notation applies to all chord decks.</p>
      <DiatonicNotationSelect bind:minorNotation bind:chordNotation showDegrees={target?.kind !== "chord-tones"} triads={target?.kind === "chord-tones" && target.setting.triads} />
      {#if direction || target?.kind === "progression"}
        <p class="scope">Additional information for this deck</p>
        <RelativeMajorDegreeToggle checked={relativeMajor} defaultChecked={target?.kind === "progression"} onchange={value => relativeMajor = value} />
      {/if}
    {/if}
  </div>
  <footer><button onclick={onclose}>CANCEL</button><button class="apply" onclick={apply}>APPLY</button></footer>
</dialog>

<style>
  dialog { width:min(100% - 32px,680px); max-height:min(90dvh,900px); padding:0; border:0; border-radius:12px; background:var(--surface); color:var(--on-surface); overflow:hidden; }
  dialog[open] { display:flex; flex-direction:column; }
  dialog:modal { overscroll-behavior:contain; }
  dialog::backdrop { background:rgb(0 0 0 / .55); overflow:hidden; overscroll-behavior:contain; }
  header { padding:12px 16px; border-bottom:1px solid var(--divider); }
  h2 { margin:0; font-size:20px; font-weight:500; }
  header p { margin:4px 0 0; font-size:var(--ui-font-size-caption); color:var(--on-surface-muted); }
  .preview { flex:none; position:relative; height:250px; background:#111827; }
  iframe { display:block; border:0; width:100%; height:100%; }
  .sides { position:absolute; right:8px; top:8px; z-index:1; display:flex; gap:4px; }
  .sides button { min-height:40px; padding:0 12px; border:1px solid var(--divider); border-radius:6px; background:var(--surface); color:var(--on-surface); }
  .sides button[aria-pressed="true"] { border-color:var(--count-new); color:var(--count-new); }
  .settings { min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:16px; }
  .scope { margin:0 0 12px; color:var(--on-surface-muted); font-size:var(--ui-font-size-secondary); line-height:1.5; }
  .settings :global(.notation-settings) { margin-top:0; }
  footer { display:flex; flex:none; justify-content:flex-end; gap:8px; padding:12px 16px; border-top:1px solid var(--divider); }
  footer button { min-height:44px; padding:0 18px; border-radius:4px; }
  .apply { background:var(--count-new); color:#0b1720; }
  @media (max-width:480px) { dialog { width:100%; max-width:none; height:100dvh; max-height:100dvh; margin:0; border-radius:0; } .settings { flex:1; } .preview { height:240px; } }
  @media (max-height:550px) { .preview { height:160px; } }
</style>
