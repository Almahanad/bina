// دفتر بناء — يعمل بدون إنترنت، ويجلب التحديثات حين يتوفر الاتصال
var CACHE = 'bina-v2';
var FILES = ['./', './index.html', './manifest.webmanifest', './icon-house-180.png', './icon-house-512.png'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).catch(function () {}));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function store(req, res) {
  if (res && res.ok) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
  }
  return res;
}
function late(ms) {
  return new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, ms); });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var path = new URL(req.url).pathname;
  var isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(path);

  // الصفحة: من الشبكة أولًا لتصل التحديثات، ومن الذاكرة عند انقطاع الاتصال
  if (isPage) {
    e.respondWith(
      Promise.race([fetch(req), late(4000)]).then(function (res) { return store(req, res); })
        .catch(function () {
          return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
        })
    );
    return;
  }
  // بقية الملفات: من الذاكرة أولًا
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { return store(req, res); });
    })
  );
});
