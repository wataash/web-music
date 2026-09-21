// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { Suspense } from "react";
import SettingsApp from "./settings-app";

export default function Home() {
  return <Suspense fallback={<main className="p-5">genscale</main>}><SettingsApp locale="en" /></Suspense>;
}
