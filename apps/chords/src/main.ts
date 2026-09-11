// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { mount } from "svelte";
import ChordPractice from "./components/ChordPractice.svelte";
import { checkForUpdateOnResume } from "@web-music/practice-ui/app-update";
import "@web-music/practice-ui/theme.css";

mount(ChordPractice, { target: document.getElementById("app")! });
if (import.meta.env.PROD) checkForUpdateOnResume();
