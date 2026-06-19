// FamilyPlay service worker — app-shell caching + offline fallback.
// Bump CACHE_VERSION to invalidate old caches on deploy.
const CACHE_VERSION = 'familyplay-v1'
const OFFLINE_URL = '/offline'
const PRECACHE = [OFFLINE_URL, '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // 逐項快取而非 cache.addAll：addAll 具原子性，任一資源在部署當下抓取失敗（404／網路）
      // 就會整個 install reject，導致「什麼都沒快取」、離線功能全失效。改為各自嘗試、
      // 失敗只記 log 不中斷，確保能成功的資源仍被快取。
      .then((cache) =>
        Promise.allSettled(
          PRECACHE.map((u) =>
            cache.add(u).catch((err) => {
              console.warn('SW precache skipped:', u, err)
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

// ── Web Push：睡前陪伴提醒 ──
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const title = data.title || 'FamilyPlay'
  const options = {
    body: data.body || '今天還沒陪孩子玩嗎？30 秒拿到今晚的陪伴方案 🌙',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'familyplay-reminder',
    data: { url: data.url || '/select' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/select'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET; never cache API or auth requests (dynamic + sensitive).
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth')) return

  // Navigations: network-first, fall back to cache, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
    )
    return
  }

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (
            res.ok &&
            (request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'image' ||
              request.destination === 'font')
          ) {
            const copy = res.clone()
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          }
          return res
        }),
    ),
  )
})
