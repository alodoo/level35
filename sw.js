// Level 35 offline cache. Bump VERSION when files change.
const VERSION = 'level35-v29';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'supabase.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Only cache the app itself and its fonts. Never GitHub sync calls or anything else.
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!own && !font) return;
  // The beta lives in its own folder and is never cached.
  if (own && url.pathname.includes('/beta/')) return;
  // The page itself: network first so updates arrive, cache when offline.
  if (req.mode === 'navigate') {
    // Always ask the server for the latest page (skip the browser's 10-minute cache).
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return res;
    }).catch(() => caches.match('./')));
    return;
  }
  // Everything else (icons, fonts): cache first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
