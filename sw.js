/* Nebenkosten – Offline-Speicher der App-Dateien (keine Hausdaten) */
const VERSION = 'nk-2026-10-10d';
const CORE = ['./', './index.html', './manifest.webmanifest', './lib/jspdf.umd.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'nk-cdn' && k !== 'nk-ocr').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes('/ocr/')) {
    // Texterkennung (groß, ändert sich selten): einmal laden, dann aus dem Speicher
    e.respondWith(caches.open('nk-ocr').then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  if (url.origin === location.origin) {
    // App-Dateien: zuerst Netz (für Updates), ohne Netz aus dem Speicher
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
      return r;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  if (CDN.includes(url.hostname)) {
    e.respondWith(caches.open('nk-cdn').then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }))));
  }
  // alles andere (Haus-Server) direkt ins Netz
});
