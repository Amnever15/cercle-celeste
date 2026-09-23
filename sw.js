const CACHE = 'cercle-v31';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (/^\/(health|access|login|admin(\/(grant|natal-reset))?|systeme-webhook|webhook-debug|generate|ia|profile|natal-file)(\?|$)/.test(url.pathname)) return;

  /* Shell app : réseau d’abord pour ne pas garder un vieux app.js (alert profil sans formulaire). */
  var isShell = url.pathname === '/' || url.pathname === '/index.html' ||
    url.pathname === '/app.js' || url.pathname === '/styles.css' || url.pathname === '/sw.js';

  if (isShell) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => cached))
  );
});
