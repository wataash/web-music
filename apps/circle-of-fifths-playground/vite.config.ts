// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    host: true,
    allowedHosts: ["wsh24b"],
    port: 17382,
    strictPort: true,
  },
  plugins: [svelte()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
