// sw.js — offline shell cache. Bump CACHE on every release.
const CACHE = 'macrolens-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/components.css',
  './css/screens.css',
  './js/app.js',
  './js/store.js',
  './js/nutrition.js',
  './js/foods.js',
  './js/gemini.js',
  './js/ui/components.js',
  './js/ui/home.js',
  './js/ui/scan.js',
  './js/ui/sheets.js',
  './js/ui/history.js',
  './js/ui/analytics.js',
  './js/ui/profile.js',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache the Gemini API — always go to network.
  if (url.hostname.includes('generativelanguage.googleapis.com')) return;
  if (e.request.method !== 'GET') return;

  // Cache-first for same-origin shell assets, with background refresh.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const network = fetch(e.request).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
