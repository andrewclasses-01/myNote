// sw.js — chạy KHÔNG CẦN MẠNG sau lần mở đầu (app cài từ Màn hình chính).
// Mỗi lần đổi code: tăng VER để iPad bỏ bộ đệm cũ.
const VER = "mynote-v0.3.0";
const SHELL = [
  "./", "index.html", "css/app.css", "manifest.webmanifest",
  "js/main.js", "js/library.js", "js/editor.js", "js/ink.js", "js/db.js", "js/pages.js", "js/ui.js", "js/icons.js", "js/live.js", "js/settings.js", "js/note-link.js", "js/firebase.js",
  "icons/icon-192.png", "icons/apple-touch-icon.png", "icons/favicon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Mạng trước (luôn lấy bản mới khi có mạng), rớt mạng mới dùng bộ đệm
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
