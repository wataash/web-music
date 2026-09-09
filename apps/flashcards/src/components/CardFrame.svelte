<!--
SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import { onDestroy, untrack } from "svelte";

  import type { CardTap } from "../lib/card-audio";
  import {
    clampCardOffsetPoint,
    clampCardScale,
    type CardOffset,
    type CardOffsets,
    type CardPart,
    type CardPartScales,
  } from "../lib/card-scale";

  let {
    doc,
    offsets,
    scales,
    variables,
    positioning = false,
    oncardtap,
    onpartmove,
    onpartscale,
    oncardturn,
    onpartsettled,
    oncardkeydown,
    onbackground,
  }: {
    doc: string;
    // Where the reader has put each part of the card and how large each is
    // drawn, and the custom properties that say so. Set on the card document
    // rather than built into it: a part under a finger moves and grows with
    // it, and rebuilding the document would reload the card on every frame.
    offsets: CardOffsets;
    scales: CardPartScales;
    variables: Readonly<Record<string, string>>;
    // Setting the card out rather than studying it: the parts take the drag
    // and nothing answers.
    positioning?: boolean;
    // Every place a finger landed, and whether any of them was on a drawing —
    // which is what stands in for SHOW ANSWER.
    oncardtap?: (taps: readonly CardTap[], onDiagram: boolean) => void;
    onpartmove?: (part: CardPart, offset: CardOffset) => void;
    onpartscale?: (part: CardPart, scale: number) => void;
    // A quarter turn of the whole card, which is what two fingers twisted far
    // enough over it mean.
    oncardturn?: (steps: 1 | -1) => void;
    // The finger is off: what was dragged is where it is staying.
    onpartsettled?: () => void;
    oncardkeydown?: (event: KeyboardEvent) => void;
    // The colour the deck paints its card, for whatever the app leaves empty
    // around it: only the card document knows it.
    onbackground?: (color: string) => void;
  } = $props();

  let cardDocument: Document | null = null;
  // Bumped as each document loads, so what is written onto the card — where
  // its parts sit, whether it is being set out — is written again onto the new
  // one rather than lost with the old.
  let loaded = $state(0);
  // A touch is followed by a click made from it, and the two are one tap.
  let touchedUntil = 0;
  // A finger held on the keys is a finger being drawn along them, so what each
  // one is over is remembered: a key sounds as it is reached and then not
  // again until the finger has been somewhere else. One entry per finger,
  // since a hand can be drawn along the board with more than one.
  const sliding = new Map<number, string>();
  // The mouse has one pointer and no identifier of its own, and it presses
  // before it clicks: a drag across the keys plays them, and the click that
  // ends it turns the card over without playing the last key twice.
  let pressing = false;
  let slid = false;
  let drag: Readonly<{
    part: CardPart;
    pointerId: number;
    fromX: number;
    fromY: number;
    offset: CardOffset;
  }> | null = null;
  // Two fingers on a part while the card is being set out: how far apart they
  // were and which way round, against the part's size and the card's turn when
  // they landed. Both are measured from where the gesture started rather than
  // from the last frame, so a hand that wanders and comes back leaves the card
  // as it found it.
  let pinch: Readonly<{
    part: CardPart;
    span: number;
    angle: number;
    scale: number;
  }> | null = null;
  // How far the fingers must be twisted before the card turns with them. A
  // quarter of a right angle is more than a hand does by accident and less
  // than one does on purpose.
  const TURN_ANGLE = 22.5;

  // What was written onto the card last time, so a property the reader has
  // stopped asking for — the width of the screen, say — is taken off again
  // rather than left standing.
  let written: readonly string[] = [];

  // A new document must start at its saved position, before its first paint.
  // Snapshot only when the document changes; dragging still updates it live.
  const frameDoc = $derived.by(() => {
    const source = doc;
    return untrack(() => {
      const style = Object.entries(variables)
        .map(([name, value]) => `${name}: ${value};`)
        .join(" ")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;");
      return source.replace(
        "<html",
        `<html style="${style}"${positioning ? " data-positioning" : ""}`,
      );
    });
  });

  $effect(() => {
    void loaded;
    const root = cardDocument?.documentElement;
    if (root === undefined) return;
    for (const name of written) {
      if (!(name in variables)) root.style.removeProperty(name);
    }
    for (const [name, value] of Object.entries(variables)) {
      root.style.setProperty(name, value);
    }
    written = Object.keys(variables);
    root.toggleAttribute("data-positioning", positioning);
  });

  type TouchedPoint = Readonly<{ element: Element; x: number; y: number }>;

  function handleClick(event: Event): void {
    if (positioning || Date.now() < touchedUntil) return;
    const element = elementOf(event.target);
    const point = event as MouseEvent;
    if (element === null) return;
    // A click that ends a drag has already played every key it crossed, the
    // last of them included; it is only still the tap that shows the answer.
    const drawn = slid;
    slid = false;
    report([{ element, x: point.clientX, y: point.clientY }], !drawn);
  }

  // Every finger, not the first: a reader who lands two of them on a keyboard
  // is asking for both notes.
  function handleTouchStart(event: TouchEvent): void {
    touchedUntil = Date.now() + 700;
    if (positioning) {
      startPinch(event);
      return;
    }
    for (const touch of event.changedTouches) {
      sliding.set(touch.identifier, cellAt(touch.clientX, touch.clientY));
    }
    const touched = [...event.touches].flatMap((touch) => {
      const element = cardDocument?.elementFromPoint(
        touch.clientX,
        touch.clientY,
      );
      return element == null
        ? []
        : [{ element, x: touch.clientX, y: touch.clientY }];
    });
    if (touched.length > 0) report(touched);
  }

  // Drawn along the keys: what each finger has reached, and nothing about the
  // card itself — the answer was shown by the tap that started the drag.
  function handleTouchMove(event: TouchEvent): void {
    if (positioning) {
      pinchTo(event);
      return;
    }
    touchedUntil = Date.now() + 700;
    const reached = [...event.changedTouches].flatMap((touch) =>
      crossed(touch.identifier, touch.clientX, touch.clientY),
    );
    if (reached.length > 0) oncardtap?.(reached, false);
  }

  function handleTouchEnd(event: TouchEvent): void {
    for (const touch of event.changedTouches) sliding.delete(touch.identifier);
    if (pinch === null) return;
    pinch = null;
    onpartsettled?.();
  }

  // A pinch takes the drag's place: the finger that started it is still down,
  // and a part must not both follow one finger and be sized by two.
  function startPinch(event: TouchEvent): void {
    const [first, second] = [...event.touches];
    if (second === undefined) return;
    const part = partAt(first.clientX, first.clientY);
    if (part === null) return;
    drag = null;
    pinch = {
      part,
      span: span(first, second),
      angle: angle(first, second),
      scale: scales[part],
    };
  }

  function pinchTo(event: TouchEvent): void {
    const [first, second] = [...event.touches];
    if (pinch === null || second === undefined) return;
    const stretched = span(first, second);
    if (pinch.span > 0 && stretched > 0) {
      onpartscale?.(
        pinch.part,
        clampCardScale((pinch.scale * stretched) / pinch.span),
      );
    }
    // Twisted far enough, the card turns a quarter and the fingers are taken
    // as they now are: another quarter takes the same twist again.
    const turned = angle(first, second) - pinch.angle;
    const wrapped = ((turned + 540) % 360) - 180;
    if (Math.abs(wrapped) >= TURN_ANGLE) {
      oncardturn?.(wrapped > 0 ? 1 : -1);
      pinch = { ...pinch, angle: angle(first, second), scale: scales[pinch.part] };
    }
  }

  function span(first: Touch, second: Touch): number {
    return Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY,
    );
  }

  function angle(first: Touch, second: Touch): number {
    return (
      (Math.atan2(
        second.clientY - first.clientY,
        second.clientX - first.clientX,
      ) *
        180) /
      Math.PI
    );
  }

  function partAt(x: number, y: number): CardPart | null {
    const element = cardDocument?.elementFromPoint(x, y);
    const held = element?.closest("[data-card-part]") ?? null;
    return (held?.getAttribute("data-card-part") as CardPart | null) ?? null;
  }

  // A mouse has one pointer and cannot pinch. The wheel over a part is what it
  // has instead, and it steps the same sizes.
  function handleWheel(event: Event): void {
    if (!positioning) return;
    const wheel = event as WheelEvent;
    const part = partAt(wheel.clientX, wheel.clientY);
    if (part === null) return;
    event.preventDefault();
    onpartscale?.(
      part,
      clampCardScale(scales[part] * (wheel.deltaY < 0 ? 1.08 : 1 / 1.08)),
    );
    onpartsettled?.();
  }

  // What a finger has come to that it was not on a moment ago. A place with
  // nothing to play is remembered as such, so a finger drawn back onto the key
  // it came from sounds it again.
  function crossed(id: number, x: number, y: number): readonly CardTap[] {
    const tap = tapAtPoint(x, y);
    const cell = tapCell(tap);
    if (sliding.get(id) === cell) return [];
    sliding.set(id, cell);
    return tap === null ? [] : [tap];
  }

  function cellAt(x: number, y: number): string {
    return tapCell(tapAtPoint(x, y));
  }

  function tapAtPoint(x: number, y: number): CardTap | null {
    const element = cardDocument?.elementFromPoint(x, y);
    return element == null ? null : tapAt(element, x, y);
  }

  // Which key or cell a tap is on, as one string to compare against the last.
  function tapCell(tap: CardTap | null): string {
    if (tap === null) return "";
    if (tap.kind === "key") return `k${tap.semitone}`;
    if (tap.kind === "fret") return `f${tap.string}:${tap.fret}`;
    return `o${tap.string}:${tap.offset}`;
  }

  function report(points: readonly TouchedPoint[], play = true): void {
    const taps = !play
      ? []
      : points.flatMap(({ element, x, y }) => {
          const tap = tapAt(element, x, y);
          return tap === null ? [] : [tap];
        });
    const onDiagram = points.some(
      ({ element }) => element.closest(".diagram") !== null,
    );
    oncardtap?.(taps, onDiagram);
  }

  // What the finger landed on, as the drawing names it. A keyboard names the
  // pitch of every key; a fretboard names the string and fret of every cell;
  // the interval board is one image with no cells at all, and says instead how
  // many of them it is divided into.
  function tapAt(target: Element, x: number, y: number): CardTap | null {
    const key = target.closest("[data-semitone]");
    if (key !== null) {
      const semitone = Number(key.getAttribute("data-semitone"));
      return Number.isInteger(semitone) ? { kind: "key", semitone } : null;
    }
    const cell = target.closest("[data-fret-cell]");
    if (cell !== null) {
      const guitarString = Number(cell.getAttribute("data-string"));
      const fret = Number(cell.getAttribute("data-fret"));
      return Number.isInteger(guitarString) && Number.isInteger(fret)
        ? { kind: "fret", string: guitarString, fret }
        : null;
    }
    return boardTapAt(target, x, y);
  }

  function boardTapAt(target: Element, x: number, y: number): CardTap | null {
    const board = target.closest("[data-strings][data-frets]");
    if (board === null) return null;
    const strings = Number(board.getAttribute("data-strings"));
    const frets = Number(board.getAttribute("data-frets"));
    const origin = Number(board.getAttribute("data-fret-origin"));
    if (!Number.isInteger(strings) || !Number.isInteger(frets)) return null;
    const box = board.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    const column = Math.floor(((x - box.left) / box.width) * frets);
    const row = Math.floor(((y - box.top) / box.height) * strings);
    if (column < 0 || column >= frets || row < 0 || row >= strings) return null;
    return {
      kind: "fret-offset",
      // String 1 is drawn at the top, as the fretboard deck draws it.
      string: row + 1,
      offset: column - (Number.isInteger(origin) ? origin : 0),
    };
  }

  // The card's own frame is what a part is moved within, and inside it that is
  // what vw and vh measure: a card turned on its side is set out along its own
  // edges rather than the screen's, because its pointer coordinates are turned
  // with it.
  function handlePointerDown(event: Event): void {
    const point = event as PointerEvent;
    if (!positioning) {
      // A mouse held down and drawn across the keys plays them, as a finger
      // does. Touch is followed through its own events, which keep coming
      // while the card scrolls under the finger; a pointer's do not.
      if (point.pointerType !== "touch") {
        pressing = true;
        slid = false;
        sliding.set(point.pointerId, cellAt(point.clientX, point.clientY));
      }
      return;
    }
    const target = elementOf(event.target);
    const held = target?.closest("[data-card-part]") ?? null;
    const part = held?.getAttribute("data-card-part") as CardPart | undefined;
    if (part === undefined || part === null) return;
    drag = {
      part,
      pointerId: point.pointerId,
      fromX: point.clientX,
      fromY: point.clientY,
      offset: offsets[part],
    };
    // Held by the element the drag started on, so a finger that outruns the
    // part keeps moving it.
    held?.setPointerCapture(point.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event: Event): void {
    const point = event as PointerEvent;
    if (drag === null) {
      if (!pressing || point.pointerType === "touch") return;
      const reached = crossed(point.pointerId, point.clientX, point.clientY);
      if (reached.length === 0) return;
      slid = true;
      oncardtap?.(reached, false);
      return;
    }
    if (point.pointerId !== drag.pointerId) return;
    const root = cardDocument?.documentElement;
    if (root === undefined) return;
    onpartmove?.(
      drag.part,
      clampCardOffsetPoint({
        x: drag.offset.x + (point.clientX - drag.fromX) / root.clientWidth,
        y: drag.offset.y + (point.clientY - drag.fromY) / root.clientHeight,
      }),
    );
  }

  function handlePointerUp(event: Event): void {
    const point = event as PointerEvent;
    pressing = false;
    sliding.delete(point.pointerId);
    if (drag === null || point.pointerId !== drag.pointerId) return;
    drag = null;
    onpartsettled?.();
  }

  // The card is a document of its own, so its elements are built from that
  // window's classes rather than this one's: `instanceof` is false across the
  // frame however ordinary the object is. What it can do is asked instead of
  // what it was made from.
  function elementOf(value: unknown): Element | null {
    const element = value as Element | null;
    return element !== null && typeof element?.closest === "function"
      ? element
      : null;
  }

  function handleCardKeyDown(event: KeyboardEvent): void {
    oncardkeydown?.(event);
  }

  const LISTENERS = [
    ["click", handleClick],
    ["touchstart", handleTouchStart as (event: Event) => void],
    ["touchmove", handleTouchMove as (event: Event) => void],
    ["touchend", handleTouchEnd as (event: Event) => void],
    ["touchcancel", handleTouchEnd as (event: Event) => void],
    ["wheel", handleWheel],
    ["pointerdown", handlePointerDown],
    ["pointermove", handlePointerMove],
    ["pointerup", handlePointerUp],
    ["pointercancel", handlePointerUp],
    ["keydown", handleCardKeyDown as (event: Event) => void],
  ] as const;

  function stopListening(): void {
    for (const [name, listener] of LISTENERS) {
      cardDocument?.removeEventListener(name, listener);
    }
  }

  function handleLoad(event: Event): void {
    stopListening();
    const frame = event.currentTarget as HTMLIFrameElement;
    cardDocument = frame.contentDocument;
    written = cardDocument === null
      ? []
      : Array.from(cardDocument.documentElement.style);
    for (const [name, listener] of LISTENERS) {
      // On the card rather than on its drawings: a tap means the same thing
      // wherever it lands, and only what is under it decides what it plays.
      cardDocument?.addEventListener(name, listener, {
        passive: name !== "pointerdown" && name !== "wheel",
      });
    }
    loaded += 1;
    const body = cardDocument?.body;
    if (body) onbackground?.(getComputedStyle(body).backgroundColor);
  }

  onDestroy(stopListening);
</script>

<!-- Mimics the AnkiDroid WebView: the card is a full document so the deck's
     own CSS applies untouched, isolated from the app chrome. -->
<iframe title="card" srcdoc={frameDoc} onload={handleLoad}></iframe>

<style>
  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
  }
</style>
