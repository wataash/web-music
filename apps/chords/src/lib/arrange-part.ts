// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { clampCardOffsetPoint, clampCardScale, type CardOffset } from "@web-music/practice-ui/card-scale";

type Options = {
  enabled: boolean;
  rotation: number;
  offset: CardOffset;
  scale: number;
  area: HTMLElement | undefined;
  onmove: (offset: CardOffset) => void;
  onscale: (scale: number) => void;
  onturn: (steps: 1 | -1) => void;
  onsettle: () => void;
};

// Native card parts use the same offsets and scales as the iframe cards.
// Pointer deltas are turned back into the card's coordinates before saving.
export function arrangePart(node: HTMLElement, options: Options) {
  function updateTabStop() {
    if (options.enabled) node.tabIndex = 0;
    else node.removeAttribute("tabindex");
  }
  updateTabStop();
  const points = new Map<number, { x: number; y: number }>();
  let origin = { x: 0, y: 0 };
  let offset = options.offset;
  let pinch: { span: number; angle: number; scale: number } | null = null;

  function measure() {
    const [a, b] = [...points.values()];
    return {
      span: Math.hypot(b.x - a.x, b.y - a.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI,
      scale: options.scale,
    };
  }

  function down(event: PointerEvent) {
    if (!options.enabled || event.button !== 0) return;
    event.preventDefault();
    node.focus();
    node.setPointerCapture(event.pointerId);
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    origin = { x: event.clientX, y: event.clientY };
    offset = options.offset;
    if (points.size === 2) pinch = measure();
  }

  function move(event: PointerEvent) {
    if (!options.enabled || !points.has(event.pointerId)) return;
    points.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && points.size >= 2) {
      const current = measure();
      if (pinch.span > 0) options.onscale(clampCardScale(pinch.scale * current.span / pinch.span));
      const angle = ((current.angle - pinch.angle + 540) % 360) - 180;
      if (Math.abs(angle) >= 22.5) {
        options.onturn(angle > 0 ? 1 : -1);
        pinch.angle = current.angle;
      }
      return;
    }
    const area = options.area;
    if (!area || area.clientWidth === 0 || area.clientHeight === 0) return;
    const radians = options.rotation * Math.PI / 180;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    options.onmove(clampCardOffsetPoint({
      x: offset.x + (dx * Math.cos(radians) + dy * Math.sin(radians)) / area.clientWidth,
      y: offset.y + (-dx * Math.sin(radians) + dy * Math.cos(radians)) / area.clientHeight,
    }));
  }

  function up(event: PointerEvent) {
    if (!points.delete(event.pointerId)) return;
    pinch = null;
    const remaining = [...points.values()][0];
    if (remaining) { origin = remaining; offset = options.offset; }
    options.onsettle();
  }

  function wheel(event: WheelEvent) {
    if (!options.enabled) return;
    event.preventDefault();
    options.onscale(clampCardScale(options.scale * (event.deltaY < 0 ? 1.08 : 1 / 1.08)));
    options.onsettle();
  }

  function key(event: KeyboardEvent) {
    if (!options.enabled || event.target !== node) return;
    const steps: Record<string, CardOffset> = {
      ArrowLeft: { x: -0.02, y: 0 }, ArrowRight: { x: 0.02, y: 0 },
      ArrowUp: { x: 0, y: -0.02 }, ArrowDown: { x: 0, y: 0.02 },
    };
    const step = steps[event.key];
    if (step) options.onmove(clampCardOffsetPoint({ x: options.offset.x + step.x, y: options.offset.y + step.y }));
    else if (event.key === "+" || event.key === "-") {
      options.onscale(clampCardScale(options.scale + (event.key === "+" ? 0.1 : -0.1)));
    } else return;
    event.preventDefault();
    event.stopPropagation();
    options.onsettle();
  }

  node.addEventListener("pointerdown", down);
  node.addEventListener("pointermove", move);
  node.addEventListener("pointerup", up);
  node.addEventListener("pointercancel", up);
  node.addEventListener("lostpointercapture", up);
  node.addEventListener("wheel", wheel, { passive: false });
  node.addEventListener("keydown", key);
  return {
    update(value: Options) {
      options = value;
      updateTabStop();
      if (!options.enabled) { points.clear(); pinch = null; }
    },
    destroy() {
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
      node.removeEventListener("lostpointercapture", up);
      node.removeEventListener("wheel", wheel);
      node.removeEventListener("keydown", key);
    },
  };
}
