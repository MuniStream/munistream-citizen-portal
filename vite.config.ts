import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const baseAllowedHosts = ['localhost', '127.0.0.1', '.munistream.com', '.paw.mx']

const allowedHosts = Array.from(
  new Set(
    [
      ...baseAllowedHosts,
      ...((process.env.VITE_ALLOWED_HOSTS ?? '')
        .split(',')
        .map((host) => host.trim())
        .filter(Boolean)),
    ],
  ),
)

export default defineConfig({
  plugins: [
    react(),
    // Offline-first: the service worker precaches the app shell and keeps the
    // API reads the citizen already made (request, catalogs, entities), so a
    // form opened with signal can be filled and submitted without it. The
    // submission itself goes through the outbox (src/offline/outbox.ts).
    // The manifest is generated per tenant at container start
    // (docker-entrypoint.sh), so it is not emitted here.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,otf}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/themes\//, /^\/health/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Tenant theme (generated at container start).
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/themes/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'tema' },
          },
          {
            // API reads: network first, cached copy when there is no signal.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/api/v1/') &&
              !url.pathname.startsWith('/api/v1/auth/') &&
              !url.pathname.includes('/files/download'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 3600 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT ?? 5173),
    allowedHosts,
  },
})
