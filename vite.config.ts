import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves this project from https://<user>.github.io/FOWL-PLAY/
// so every asset URL must be prefixed with the repository path in production.
const base = process.env.VITE_BASE ?? (process.env.NODE_ENV === 'production' ? '/FOWL-PLAY/' : '/');

export default defineConfig({
  base,
  build: {
    target: 'es2019',
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Fowl Play',
        short_name: 'Fowl Play',
        description: 'Every problem has a chicken. Breed it. Become it. Solve the farm.',
        theme_color: '#f4ead6',
        background_color: '#f4ead6',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
