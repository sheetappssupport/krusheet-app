/* ครูชีต — service worker (ให้ติดตั้งเป็นแอปได้ + เปิดได้แม้เน็ตหลุด)
 * /krusheet-app / 98200f2a613695e350892ff7834c214f ถูกแทนค่าโดย scripts/fix-web-dist.js ตอน build */
const BASE = '/krusheet-app';
const CACHE = 'krusheet-98200f2a613695e350892ff7834c214f';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([BASE + '/', BASE + '/manifest.webmanifest'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('krusheet-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return; // Google API ฯลฯ ไม่แตะ

  // หน้าเว็บ: เอาจากเน็ตก่อน (ได้เวอร์ชันใหม่เสมอ) — เน็ตหลุดค่อยใช้ที่เก็บไว้
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(BASE + '/', copy));
          return res;
        })
        .catch(() => caches.match(BASE + '/')),
    );
    return;
  }

  // ไฟล์ JS/รูป/ฟอนต์ (ชื่อไฟล์มี hash ไม่เปลี่ยนเนื้อหา) → ใช้ที่เก็บไว้ก่อน
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
