// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { getContext, tick } from "svelte";
import type { ChordView } from "./chord-progress";

export const CHORD_VIEW_CONTEXT = Symbol("chord-view");
export type ChordViewStore = {
  scope: () => string;
  views: () => Record<string, ChordView>;
  save: () => void;
  minorNotation?: () => '-' | 'm';
  setMinorNotation?: (value: '-' | 'm') => void;
  highlightAnnotations?: () => boolean;
  setHighlightAnnotations?: (value: boolean) => void;
  chartZoom?: () => number;
  setChartZoom?: (zoom: number) => void;
};

export function chordViewPersistence() {
  const store = getContext<ChordViewStore | undefined>(CHORD_VIEW_CONTEXT);
  const viewKey = (name: string) => `${store?.scope() ?? ""}:${name}`;
  const hasView = (key: string) => !!store?.views()[key];
  function remember(node: HTMLElement, initialKey: string) {
    const views = store?.views();
    let key = initialKey;
    let revision = 0;
    let restoring = true;
    let frame = 0;
    const save = () => {
      if (!store || !views || restoring) return;
      views[key] = node instanceof HTMLDetailsElement
        ? { open: node.open }
        : { x: node.scrollLeft, y: node.scrollTop };
      store.save();
    };
    const restore = async () => {
      const current = ++revision;
      restoring = true;
      const value = views?.[key];
      if (node instanceof HTMLDetailsElement) node.open = value?.open ?? false;
      await tick();
      if (current !== revision) return;
      // Lazy details and fretboards must settle before restoring scroll offsets.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (current !== revision) return;
          if (value && !(node instanceof HTMLDetailsElement)) {
            node.scrollLeft = value.x ?? 0;
            node.scrollTop = value.y ?? 0;
          }
          restoring = false;
        });
      });
    };
    node.addEventListener("scroll", save, { passive: true });
    node.addEventListener("toggle", save);
    void restore();
    return {
      update(next: string) { if (next !== key) { save(); key = next; void restore(); } },
      destroy() { save(); revision++; cancelAnimationFrame(frame); node.removeEventListener("scroll", save); node.removeEventListener("toggle", save); },
    };
  }
  return {
    remember, viewKey, hasView,
    minorNotation: () => store?.minorNotation?.() ?? '-',
    setMinorNotation: (value: '-' | 'm') => store?.setMinorNotation?.(value),
    highlightAnnotations: () => store?.highlightAnnotations?.() ?? false,
    setHighlightAnnotations: (value: boolean) => store?.setHighlightAnnotations?.(value),
    chartZoom: () => store?.chartZoom?.() ?? 1,
    setChartZoom: (zoom: number) => store?.setChartZoom?.(zoom),
  };
}
