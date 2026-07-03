// Minimal service worker — required for PWA installability.
// Does not cache anything yet; purely satisfies Chrome's install criteria.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through — no caching logic yet.
  event.respondWith(fetch(event.request));
});
