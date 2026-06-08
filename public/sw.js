const CACHE_NAME = 'sipas-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Pre-cache warning (non-blocking):', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old service worker cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass Service Worker entirely for:
  // - Non-GET requests (e.g. POST/PUT/DELETE for logins, transaction saves, etc.)
  // - API requests (/api/*)
  // - Server-Sent Events or WebSockets (if any)
  // - Midtrans sandbox payment assets or scripts
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/sse/') ||
    event.request.url.includes('midtrans') ||
    !event.request.url.startsWith('http')
  ) {
    return; // Bypass completely and fetch via network
  }

  // 2. Network-First Strategy for all static assets and pages.
  // This guarantees that we ALWAYS load fresh bundles and page contents when online,
  // completely eliminating the "stale bundle hash / blank white screen" issue on new deploys.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If response is good, clone it and cache it for offline support
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // FAILSAFE / OFFLINE FALLBACK:
        // Cache is checked only when network request fails (strictly offline mode)
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If navigation request fails, serve the cached SPA index shell
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
