'use strict';
// Service worker: кэширует всю игру целиком, после первого открытия она работает без интернета.
// ВАЖНО: при каждом обновлении игры (любого файла) увеличивай номер версии ниже.
// Тогда новый набор файлов скачается целиком и подменит старый одним махом (без смеси старого и нового).
const VERSION = 'v50';
const CACHE = 'doodle-jump-' + VERSION;
const FILES = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './ranked.js',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  // cache: 'reload' — берём свежие файлы с сервера, а не из HTTP-кэша браузера
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('doodle-jump-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // чужие сайты (Telegram) не трогаем

  // Только кэш: мгновенный запуск и работа без сети. Сеть — лишь если файла нет в кэше.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
