/* Service worker: membuat aplikasi cepat dibuka & tetap tampil saat offline.
   Kalau kamu mengubah file aplikasi, naikkan angka VERSION agar HP mengambil versi baru. */
const VERSION = 'mt-v2.0.1';
const SHELL = [
  './',
  'index.html',
  'app.css',
  'config.js',
  'i18n.js',
  'themes.js',
  'google.js',
  'charts.js',
  'app.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'favicon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;                       // API (POST) tidak disentuh
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;

  // Halaman & config: ambil versi terbaru dulu, pakai cache saat offline
  if (req.mode === 'navigate' || url.pathname.endsWith('/config.js')) {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req.mode === 'navigate' ? 'index.html' : req, copy); });
        return res;
      }).catch(function () { return caches.match(req.mode === 'navigate' ? 'index.html' : req); })
    );
    return;
  }

  // File lain: tampilkan dari cache, perbarui di belakang layar
  e.respondWith(
    caches.match(req).then(function (hit) {
      const net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
