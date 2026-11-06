// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mount } from "svelte";

import "@web-music/practice-ui/theme.css";
import "./typography.css";

async function start(): Promise<void> {
  const target = document.getElementById("app")!;
  if (location.pathname.replace(/\/$/, "") === "/preview") {
    const { default: Preview } = await import("./components/DeckPreview.svelte");
    mount(Preview, { target });
    return;
  }
  // Restore before importing App: preference modules read storage on import.
  const props = new URLSearchParams(location.hash.slice(1)).has("import")
    ? await (await import("./lib/handoff")).receiveHandoff()
    : {};
  const { default: App } = await import("./App.svelte");
  mount(App, { target, props });
}
void start();
