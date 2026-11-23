'use strict';

const version = '1.0.1';
const prefix = 'ruska:' + self.registration.scope + ':';
const cacheName = prefix + version;
const home = new URL('index.html', self.registration.scope).href;
const assets = [
  'index.html', 'manifest.webmanifest', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/icon-maskable.png'
].map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(assets.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin) return;
  const entry = request.mode === 'navigate' &&
    (url.pathname === scope.pathname || url.pathname === new URL(home).pathname);
  if (!entry && !assets.includes(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(request, { cache: 'no-cache' });
      if (response.ok && !response.redirected) {
        await cache.put(entry ? home : request, response.clone());
      }
      if (response.status < 500) return response;
      return (await cache.match(entry ? home : request)) || response;
    } catch {
      return (await cache.match(entry ? home : request)) || Response.error();
    }
  })());
});
