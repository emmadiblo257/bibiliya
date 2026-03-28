const CACHE_NAME = 'bible-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './bible_cover_premium.png',
  './Kinyarwanda/bibiliya.json',
  './Kirundi/bibiliya.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
