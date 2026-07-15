const CACHE_NAME = 'duty-roster-dev';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon/web-app-manifest-192x192.png',
  '/favicon/web-app-manifest-512x512.png',
  '/favicon/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Navigations must always fetch fresh HTML so it references the current
  // deploy's hashed asset URLs; a cached shell can point at chunks that no
  // longer exist after a new deploy, breaking CSS/JS. Cache is only an
  // offline fallback here.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          if (response.ok) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone))
              .catch(() => undefined);
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          if (response.ok) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone))
              .catch(() => undefined);
          }
          return response;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
