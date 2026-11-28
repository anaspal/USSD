const CACHE = 'ussd-v1.38';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './jawwal.png', './palpay.png', './fonts/Amiri-Regular.ttf', './fonts/Amiri-Bold.ttf', './fonts/Amiri-Italic.ttf', './fonts/Amiri-BoldItalic.ttf', './fonts/OFL.txt'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(new Request(a, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first (instant + works offline), refresh in the background so updates arrive on next open
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.url.endsWith('.apk')) return; // let the browser download it directly, don't cache

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(r, { ignoreSearch: true });

    const refresh = fetch(r)
      .then(async res => {
        if (res && res.ok && res.status === 200 && res.type === 'basic') { try { await cache.put(r, res.clone()); } catch (err) {} }
        return res;
      })
      .catch(() => null);

    if (cached) { e.waitUntil(refresh); return cached; }

    const res = await refresh;
    if (res) return res;

    if (r.mode === 'navigate') {
      return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
    }
    return Response.error();
  })());
});
