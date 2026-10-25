/*!
 * phone-sw.js — веб-приложение «Намаз» работает без интернета.
 * Все файлы кладутся в кэш при первом открытии; дальше страница берётся
 * из кэша, а в фоне проверяется новая версия (stale-while-revalidate).
 * Меняете файлы сайта — поднимите VERSION, чтобы телефоны обновились.
 */
var VERSION = 'namaz-phone-20261026a';
var FILES = [
  'phone.html', 'phone.webmanifest',
  'assets/phone.css', 'assets/phone.js', 'assets/phone-settings.js', 'assets/cities.js',
  'assets/store.js', 'assets/prayer-times.js', 'assets/tyumen.js', 'assets/schedule.js',
  'assets/clock-tick.js', 'assets/cloud.js',
  'assets/logo.png', 'assets/emblem.svg', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // облако, погода — напрямую
  // только файлы приложения «Намаз»; табло (tablo/), APK и прочее — как обычно, из сети
  var scope = self.registration.scope;
  var rel = req.url.split('?')[0].indexOf(scope) === 0 ? req.url.split('?')[0].slice(scope.length) : '';
  if (FILES.indexOf(rel) === -1) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    // ?v=… в ссылках не мешает: ищем без параметров
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req.url.split('?')[0], res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
