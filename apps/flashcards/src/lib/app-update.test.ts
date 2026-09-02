// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

import { watchForServiceWorkerUpdate } from "./app-update";

function fakeContainer(controller: object | null) {
  const listeners: (() => void)[] = [];
  return {
    controller,
    addEventListener: (_: string, listener: () => void) =>
      listeners.push(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.splice(listeners.indexOf(listener), 1),
    takeOver: () => listeners.forEach((listener) => listener()),
    listenerCount: () => listeners.length,
  };
}

describe("watching for a deployed update", () => {
  it("reports a worker taking over from another one", () => {
    const container = fakeContainer({});
    const onUpdate = vi.fn();

    const stop = watchForServiceWorkerUpdate(
      onUpdate,
      container as unknown as ServiceWorkerContainer,
    );
    container.takeOver();
    expect(onUpdate).toHaveBeenCalledTimes(1);

    stop();
    expect(container.listenerCount()).toBe(0);
  });

  it("says nothing when the first worker takes over", () => {
    const container = fakeContainer(null);
    const onUpdate = vi.fn();

    watchForServiceWorkerUpdate(
      onUpdate,
      container as unknown as ServiceWorkerContainer,
    );
    container.takeOver();

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("does nothing where there are no service workers", () => {
    expect(() => watchForServiceWorkerUpdate(vi.fn(), undefined)()).not.toThrow();
  });
});
