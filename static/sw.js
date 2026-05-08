const CACHE = 'osint-shell-v1';

const SHELL = [
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/manifest.json',
];

// Cache shell assets on install
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

// Clear old cache versions on activate
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return; // let POST (login form) pass through

  var url = new URL(e.request.url);

  // Static assets — cache first, then network
  if (url.pathname.startsWith('/static/')) {
    e.respondWith(
      caches.match(e.request).then(function (hit) { return hit || fetch(e.request); })
    );
    return;
  }

  // Dynamic pages — network first, offline fallback
  e.respondWith(
    fetch(e.request).catch(function () {
      return caches.match('/static/offline.html').then(function (hit) {
        return hit || new Response(
          '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
          'body{margin:0;background:#060e1f;color:#e2e8f0;font-family:system-ui;' +
          'display:flex;align-items:center;justify-content:center;height:100vh;text-align:center}' +
          'h1{font-size:20px}p{color:#94a3b8;font-size:14px}</style></head><body>' +
          '<div><h1>You are offline</h1><p>Reconnect to view intelligence briefs.</p></div>' +
          '</body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      });
    })
  );
});
