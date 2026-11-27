import { defineConfig } from 'astro/config';
import { AstroPWAIntegration as AstroPWA } from '@vite-pwa/astro';
import { remarkEmbeds } from './src/core/embed/remark-embeds.mjs';

export default defineConfig({
  output: 'static',
  // Relative-friendly: set BASE_PATH at build time if hosting under a sub-path.
  base: process.env.BASE_PATH ?? '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    remarkPlugins: [remarkEmbeds],
    shikiConfig: { theme: 'github-light' },
  },
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [
    AstroPWA({
      registerType: 'prompt',
      injectRegister: false, // we register manually (skipped under Tauri / file:)
      manifest: {
        name: 'Earth Science Encyclopedia',
        short_name: 'EarthSci',
        description: 'An offline encyclopedia of earth science: articles, simulations and tools.',
        theme_color: '#1f4e5f',
        background_color: '#f6f3ec',
        display: 'standalone',
        start_url: process.env.BASE_PATH ?? '/',
        scope: process.env.BASE_PATH ?? '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      generateSW: {
        globPatterns: ['**/*.{html,js,css,svg,json,woff2,woff}'],
        navigateFallback: undefined, // every page is prerendered and precached
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
});
