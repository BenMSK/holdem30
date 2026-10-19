// 오프라인용 서비스 워커. 파일을 바꾸면 CACHE 이름의 숫자를 올려야 폰에 새 버전이 들어감.
const CACHE = 'holdem30-v3';
const FILES = ['./', './index.html', './poker.js', './content.js', './widgets.js', './manifest.json', './icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// 네트워크 우선, 실패하면 캐시 (업데이트는 바로 반영, 오프라인은 캐시로)
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
