// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

// The app that used to live on this origin is a PWA, so every browser that
// visited it holds a service worker that answers from its own cache — the page
// that replaced the app would never be asked for. A browser does check this
// file for a new version, though, and this one takes over and then removes
// itself, cache and all, so the next visit is served what is here now.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" })) {
        client.navigate(client.url);
      }
    })(),
  );
});
