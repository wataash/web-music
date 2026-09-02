// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// A deployed update is one visit behind without help: the new service worker
// activates and claims the page, but the page it claims is the old one, whose
// scripts are already running. Reloading is what swaps them.

export function watchForServiceWorkerUpdate(
  onUpdate: () => void,
  container: ServiceWorkerContainer | undefined = globalThis.navigator
    ?.serviceWorker,
): () => void {
  if (!container) return () => {};
  // No controller yet means this is the first registration rather than an
  // update, and the page already holds what the worker is about to cache.
  const hadController = container.controller !== null;
  const handle = (): void => {
    if (hadController) onUpdate();
  };
  container.addEventListener("controllerchange", handle);
  return () => container.removeEventListener("controllerchange", handle);
}
