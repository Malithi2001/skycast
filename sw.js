// SkyCast service worker (cache-first for app shell, network-first for APIs)
const VERSION = 'v1.0.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('skycast-shell-' + VERSION).then(cache => cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => {
      if(!k.includes(VERSION)) return caches.delete(k);
    }))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAPI = url.hostname.includes('open-meteo.com');
  if(event.request.method !== 'GET') return;

  if(isAPI){
    // Network-first for API
    event.respondWith(
      fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open('skycast-api-' + VERSION).then(c => c.put(event.request, clone));
        return res;
      }).catch(async () => {
        const cache = await caches.open('skycast-api-' + VERSION);
        const cached = await cache.match(event.request);
        if(cached) return cached;
        throw new Error('Offline and no cache');
      })
    );
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open('skycast-shell-' + VERSION).then(c => c.put(event.request, clone));
        return res;
      });
    })
  );
});
