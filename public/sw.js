// Offline app shell. Notes themselves live in IndexedDB, not here.
const CACHE = 'necro-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const base = self.registration.scope
      const html = await (await fetch(base, { cache: 'reload' })).text()
      const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => new URL(m[1], base).href)
      await cache.addAll([base, ...assets, base + 'manifest.webmanifest', base + 'icon-192.png', base + 'icon.svg'])
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return // Supabase calls go straight to the network
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      if (req.mode === 'navigate') {
        // Share-target launches carry a query string; serve the one cached shell.
        try {
          const fresh = await fetch(req)
          if (!url.search) cache.put(self.registration.scope, fresh.clone())
          return fresh
        } catch {
          return (await cache.match(self.registration.scope)) || Response.error()
        }
      }
      const hit = await cache.match(req)
      if (hit) return hit
      try {
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      } catch {
        return Response.error()
      }
    })(),
  )
})
