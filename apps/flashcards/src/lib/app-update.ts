// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// A deployed update is one visit behind without help: the new service worker
// activates and claims the page, but the page it claims is the old one, whose
// scripts are already running. Reloading is what swaps them.

// How often the app is willing to ask. Coming back to it is a common thing to
// do — every switch away and back — and the question costs a request each time.
const UPDATE_CHECK_INTERVAL_MS = 60_000;

type PageVisibility = Pick<
  Document,
  "visibilityState" | "addEventListener" | "removeEventListener"
>;

// A phone brings a PWA back from the background without reloading it, so
// nothing asks whether a new version has been deployed: the check runs when
// the worker is registered, which is when the page loads. Asking on the way
// back in is what makes reopening the app enough to update it.
export function checkForUpdateOnResume(
  container: ServiceWorkerContainer | undefined = globalThis.navigator
    ?.serviceWorker,
  page: PageVisibility | undefined = globalThis.document,
  now: () => number = Date.now,
): () => void {
  if (!container || !page) return () => {};
  let asked = now();
  const check = (): void => {
    if (page.visibilityState !== "visible") return;
    if (now() - asked < UPDATE_CHECK_INTERVAL_MS) return;
    asked = now();
    void container
      .getRegistration()
      .then((registration) => registration?.update())
      // Offline, or there is no worker yet: the next way back in asks again.
      .catch(() => {});
  };
  page.addEventListener("visibilitychange", check);
  return () => page.removeEventListener("visibilitychange", check);
}

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
