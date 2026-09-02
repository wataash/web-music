// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mount } from "svelte";

import App from "./App.svelte";
import "./app.css";

mount(App, { target: document.getElementById("app")! });
