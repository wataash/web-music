// SPDX-FileCopyrightText: Copyright (c) 2026 Wataru Ashihara <wataash0607@gmail.com>
// SPDX-License-Identifier: Apache-2.0
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => ({
  ...(mode === 'test' ? { resolve: { conditions: ['browser'] } } : {}),
  server: { host: true, allowedHosts: (loadEnv(mode, process.cwd(), "DEV_").DEV_ALLOWED_HOSTS ?? "").split(",").map(host => host.trim()).filter(Boolean), port: 17382, strictPort: true },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        lang: 'en', name: 'Chord Positions', short_name: 'Chords',
        description: 'Practice chords with iReal Pro charts',
        theme_color: '#2196f3', background_color: '#ffffff', display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg}'] },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
}));
