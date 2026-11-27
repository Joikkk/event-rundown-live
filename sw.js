const CACHE_NAME = 'rundown-live-shell-v18';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './umn-twin-towers.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never intercept non-GET requests (e.g. Gemini AI POST, Auth, etc.)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept external/cross-origin requests (Firebase RTDB, Auth, Gemini API, CDNs)
  // so real-time live rundown sync is 100% untouched.
  if (url.origin !== self.location.origin) return;

  // Network-first for same-origin app shell: always gets newest deploy when online,
  // falls back to cache only if offline.
  event.respondWith(
    fetch(req)
      .then((networkResp) => {
        if (networkResp && networkResp.status === 200 && networkResp.type === 'basic') {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return networkResp;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
