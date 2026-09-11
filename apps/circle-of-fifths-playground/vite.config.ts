// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    allowedHosts: (loadEnv(mode, process.cwd(), "DEV_").DEV_ALLOWED_HOSTS ?? "").split(",").map(host => host.trim()).filter(Boolean),
    port: 17382,
    strictPort: true,
  },
  plugins: [svelte()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
