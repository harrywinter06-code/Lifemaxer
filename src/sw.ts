// Custom service worker (injectManifest strategy). Adds:
//  - Precaching for the app shell (manifest injected by vite-plugin-pwa)
//  - Runtime cache for Google Fonts
//  - Web Push handlers (push + notificationclick)

/// <reference lib="WebWorker" />
/// <reference types="vite-plugin-pwa/client" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// Injected at build time.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Google Fonts — long cache.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)

// SPA navigation fallback — serve index.html for in-app routes.
self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// -------------- Web Push --------------

type PushPayload = {
  title?: string
  body?: string
  tag?: string
  url?: string
}

self.addEventListener('push', (event) => {
  let payload: PushPayload
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {}
  } catch {
    payload = { title: 'DRILL', body: event.data?.text() ?? '' }
  }
  const title = payload.title ?? 'DRILL'
  const body = payload.body ?? ''
  const tag = payload.tag ?? 'drill'
  const url = payload.url ?? '/'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
      // @ts-expect-error vibrate is supported on Android but not in lib types
      vibrate: [80, 30, 80],
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url =
    (event.notification.data as { url?: string } | null)?.url ?? '/'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await (client as WindowClient).navigate(url)
            } catch {
              // ignore
            }
          }
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
