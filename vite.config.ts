import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Dev and preview proxy /api at the DEPLOYED Vercel URL.
//
// There is no local environment where the service worker and /api both exist: `vite dev`
// has no service worker, and `vite preview` has no functions. Rather than write a
// Node-req/res-to-Web-Request adapter to simulate the edge, point at the edge. Every
// conditional request made while building is then a real production round trip — which is
// the only place a 304 actually breaks.
const API_TARGET = process.env.API_TARGET ?? 'https://offline-resume-pwa.vercel.app'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { proxy: { '/api': { target: API_TARGET, changeOrigin: true } } },
  preview: { proxy: { '/api': { target: API_TARGET, changeOrigin: true } } },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Offline-First Résumé — Jonathan Rocha',
        short_name: 'Résumé PWA',
        description:
          'A Vue 3 PWA that keeps rendering with the network off and is honest about how old its data is.',
        start_url: '/',
        // standalone rather than fullscreen: fullscreen hides the OS status bar, and that
        // is where the system shows its own network state. If this app is going to make a
        // claim about connectivity, the user should be able to check it against the OS.
        display: 'standalone',
        orientation: 'any',
        background_color: '#12141a',
        theme_color: '#12141a', // must match <meta name="theme-color"> exactly
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // In generateSW mode (the default) ALL of these belong inside `workbox`. Passing
      // them flat does not error — the service worker just quietly does something else,
      // which is the worst possible failure mode the night before a demo.
      workbox: {
        // The default is **/*.{js,css,html} — narrower than it looks. Fonts, icons, and
        // the webmanifest are NOT precached unless named here.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Declared explicitly, not merely omitted. IndexedDB is the ONLY cache for
            // /api. Two caches holding the same bytes with independent eviction will
            // disagree eventually, and a Workbox cache in front of this route would serve
            // its own 200 — making the conditional GET silently decorative.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
