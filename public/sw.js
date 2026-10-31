// NumberOFF service worker: the app works offline after the first visit.
// Photos never pass through here; it only caches the app's own files.
const VERSION = '__BUILD_VERSION__';
const CACHE = 'numberoff-' + VERSION;
// the built JS/CSS file names are filled in by vite.config.js at build time
const ASSETS = [/* __ASSETS__ */];
// index.html is not listed: Cloudflare Pages redirects it to './', and a redirected response cannot answer a page load
const CORE = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', ...ASSETS];
// the page registers this worker only after the model has loaded, so these come from the browser cache (no second download)
const HEAVY = ['model.onnx', 'ort/ort.min.js', 'ort/ort-wasm-simd.wasm'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    // 'no-cache' revalidates with the server: an unchanged file is not downloaded again, a changed one is never taken stale from the HTTP cache
    await Promise.all(HEAVY.map(u => c.add(new Request(u, { cache: 'no-cache' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Pages: network first so updates show up, cache when offline.
  if (req.mode === 'navigate') {
    // only a good, non-redirected copy of the top page may replace the offline copy (never a 404 page)
    e.respondWith(fetch(req).then(r => {
      if (r.ok && !r.redirected && new URL(req.url).pathname === new URL('./', location).pathname) {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put('./', cp));
      }
      return r;
    }).catch(() => caches.match('./')));
    return;
  }
  // Everything else: cache first (model and engine are large).
  // ignoreVary: module scripts are requested with headers (e.g. Origin) that the precache request did not have
  e.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  })));
});
