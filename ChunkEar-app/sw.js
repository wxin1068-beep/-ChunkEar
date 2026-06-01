// ChunkEar - Service Worker v3
const CACHE_NAME = "chunkear-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/audio.js",
  "./js/corpus.js",
  "./js/chunkear.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 缓存优先策略：静态资源
  if (
    ASSETS.includes("./" + url.pathname) ||
    url.pathname.match(/\.(html|css|js|json|png)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      }),
    );
    return;
  }

  // 网络优先策略：TTS 语音（如果在线就缓存）
  if (url.pathname === "/tts") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME + "-tts").then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        }),
    );
    return;
  }

  // 默认：网络优先
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
