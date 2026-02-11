/**
 * Service Worker для PWA ino2ubi — кэширование для офлайн-работы
 */
const CACHE_NAME = 'ino2ubi-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './constants.js',
  './parser.js',
  './generator.js',
  './manifest.json',
  './icons/icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  if (event.request.url.indexOf(self.location.origin) !== 0) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        var clone = response.clone();
        if (response.status === 200 && response.type === 'basic') {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function () {
        return caches.match('./index.html').then(function (fallback) {
          return fallback || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      });
    })
  );
});
