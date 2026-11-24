const CACHE_NAME = 'smp-maarif-pwa-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            // Ignore individual asset cache failure during install
          })
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always bypass cache for API requests and SSE streams
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first for navigation (HTML pages) with cache fallback for offline PWA support
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // Stale-while-revalidate for static assets (icons, manifest, scripts, styles)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Track recently displayed notification tags inside Service Worker to avoid duplicate OS popups
const shownNotificationTags = new Set();

function rememberTag(tag) {
  if (!tag) return false;
  if (shownNotificationTags.has(tag)) return true;
  shownNotificationTags.add(tag);
  if (shownNotificationTags.size > 300) {
    const first = shownNotificationTags.values().next().value;
    if (first) shownNotificationTags.delete(first);
  }
  return false;
}

// Native Web Push API listener (for background Push events)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Notifikasi SMP Ma\'arif NU Pandaan',
    body: 'Ada pemberitahuan baru pada portal sekolah.',
    tag: 'notif-' + Date.now(),
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    url: '/'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        title: parsed.title || payload.title,
        body: parsed.message || parsed.body || payload.body,
        tag: parsed.id || parsed.tag || payload.tag,
        icon: parsed.icon || payload.icon,
        badge: parsed.badge || payload.badge,
        url: parsed.url || '/',
        studentId: parsed.studentId,
        category: parsed.category
      };
    } catch (_) {
      payload.body = event.data.text() || payload.body;
    }
  }

  if (rememberTag(payload.tag)) {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      vibrate: [200, 100, 200],
      renotify: false,
      data: {
        url: payload.url || '/',
        id: payload.tag,
        studentId: payload.studentId,
        category: payload.category
      }
    })
  );
});

// Handle messages from client pages & installed PWA window
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'SHOW_PWA_NOTIFICATION' && event.data.payload) {
    const p = event.data.payload;
    const tag = p.tag || p.id || ('pwa-notif-' + Date.now());
    if (rememberTag(tag)) {
      return;
    }

    const title = p.title || 'Notifikasi Sekolah';
    const options = {
      body: p.body || p.message || '',
      icon: p.icon || '/pwa-192x192.png',
      badge: p.badge || '/pwa-192x192.png',
      tag,
      vibrate: [200, 100, 200],
      renotify: false,
      data: {
        url: p.url || '/',
        id: p.id || tag,
        studentId: p.studentId,
        category: p.category
      }
    };

    if (self.registration && typeof self.registration.showNotification === 'function') {
      event.waitUntil(self.registration.showNotification(title, options).catch(() => {}));
    }
  }
});

// Focus or open the PWA/browser window when the user taps a system push notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'PWA_NOTIFICATION_CLICKED',
            payload: notifData
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
