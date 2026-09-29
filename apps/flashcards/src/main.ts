// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mount } from "svelte";

import "@web-music/practice-ui/theme.css";

const page = location.pathname.replace(/\/$/, "") === "/preview"
  ? import("./components/DeckPreview.svelte")
  : import("./App.svelte");
void page.then(({ default: App }) => {
  mount(App, { target: document.getElementById("app")! });
});
