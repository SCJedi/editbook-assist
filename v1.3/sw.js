const CACHE_VERSION = 'editbook-v1.3.0';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './nav.js',
  './editbook.js', './models.js', './streets.js', './annotations.js',
  './addressDetail.js', './datafile.js', './settings.js', './cellPopup.js', './manifest.json',
  './icons/icon-192.svg', './icons/icon-512.svg', './offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(name => {
        if (name !== CACHE_VERSION) return caches.delete(name);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
      });
    })
  );
});
